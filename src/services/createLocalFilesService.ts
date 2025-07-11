/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import path from 'node:path';
import fs from 'node:fs';
import { IStructure } from '@/components/FileViewer.tsx';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { createFolderStructure } from '@/utils/createFolderStructure.ts';
import { createOrResetDatabase } from '@/utils/databaseOperations.ts';
import generateSQLSchema from '@/utils/generateSQLSchema.ts';
import generateSQLDeleteTables from '@/utils/generateSQLDeleteTables.ts';
import { format as formatSQL } from 'sql-formatter';
import generateSQLInserts from '@/utils/generateSQLInserts.ts';
import generateMockData from '@/utils/generateMockData.ts';
import { IFormStore } from '@/useFormStore.ts';
import { isUsingLocalFiles } from '@/hooks/useUserFiles.ts';

interface ICreateLocalFilesRequest {
  schemaInfo: ISchemaInfo[];
  SQLSchema: string | null;
  formData: IFormStore;
}

interface ICreateLocalFilesResponse {
  success: boolean;
  message: string;
}

const isIStructure = (value: unknown): value is IStructure => {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'object' && item !== null)
  );
};

export const createLocalFilesService = async (
  data: ICreateLocalFilesRequest,
): Promise<ICreateLocalFilesResponse> => {
  const { schemaInfo, SQLSchema, formData } = data;
  const { publicRepoURL, backendDir, selectedProject } = formData;

  // Extract projectName from formData or use default
  let projectName = 'my-app';

  if (
    typeof formData.projectName === 'string' &&
    formData.projectName.trim() !== ''
  ) {
    projectName = formData.projectName;
  } else if (selectedProject !== null && selectedProject !== undefined) {
    // Check if it's an object with a name property
    if (
      typeof selectedProject === 'object' &&
      'name' in selectedProject &&
      typeof selectedProject.name === 'string' &&
      selectedProject.name.trim() !== ''
    ) {
      projectName = selectedProject.name;
    }
  }

  try {
    // Get user files from the public repo
    const response = await fetch(
      isUsingLocalFiles
        ? `${String(import.meta.env.VITE_BACKEND_URL)}/getUserFiles`
        : `${String(import.meta.env.VITE_BACKEND_URL)}/getUserFilesFromPublicRepo`,
      {
        method: isUsingLocalFiles ? 'GET' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: isUsingLocalFiles
          ? undefined
          : JSON.stringify({
              publicRepoURL,
              // Include selected project info if available
              selectedProject:
                selectedProject !== null &&
                selectedProject !== undefined &&
                typeof selectedProject === 'object' &&
                'name' in selectedProject &&
                typeof selectedProject.name === 'string'
                  ? { name: selectedProject.name }
                  : undefined,
            }),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch repository files');
    }

    const userFiles: unknown = await response.json();

    if (!isIStructure(userFiles)) {
      throw new Error('Invalid user files');
    }

    // Build project files
    const projectFiles = buildProjectFiles(
      `/Projects/${String(projectName)}/structure.yaml`,
      userFiles,
      schemaInfo,
    );

    // Create target directory if it doesn't exist
    const targetDir = path.resolve(backendDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Use the utility function to create folder structure
    createFolderStructure({
      structure: projectFiles,
      targetDirectory: targetDir,
    });

    // Configure database using the utility function
    try {
      // If SQLSchema is provided, use it; otherwise generate it
      let fullSQLSchema: string;

      if (SQLSchema !== null) {
        fullSQLSchema = SQLSchema;
      } else {
        // Generate SQL Schema - following the pattern from useTransformationsStore.ts
        const deleteTablesQueries = generateSQLDeleteTables(schemaInfo);
        let sqlSchema = generateSQLSchema(schemaInfo);

        // Include insert data (mock data)
        try {
          const mockData = generateMockData({
            mockDataRows: 5,
            schemaInfo,
          });

          const sqlInsertQueries = generateSQLInserts(mockData);
          sqlSchema += `\n\n${sqlInsertQueries}`;
        } catch (mockError) {
          console.error('Error generating mock data:', mockError);
        }

        // Format the full SQL schema with delete statements
        fullSQLSchema = `${deleteTablesQueries.join('\n')}\n\n${formatSQL(sqlSchema)}`;
      }

      // Extract database info from formData.dbConnection for database creation
      const { dbConnection } = formData;

      // Use database connection directly if available
      if (dbConnection) {
        try {
          // Use the utility function to reset the database with the schema
          const dbResult = await createOrResetDatabase(
            dbConnection,
            fullSQLSchema,
          );

          if (!dbResult.success) {
            console.error('Database creation failed:', dbResult.message);
            return {
              success: false,
              message: `Created files in ${String(targetDir)}, but failed to set up database: ${dbResult.message}`,
            };
          }
        } catch (connectionError) {
          console.error('Error with database connection:', connectionError);
          return {
            success: false,
            message: `Created files in ${String(targetDir)}, but database connection error: ${connectionError instanceof Error ? connectionError.message : 'Invalid connection string'}`,
          };
        }
      } else {
        console.error('No database connection provided in formData');
        // Continue without database setup if no connection is provided
      }
    } catch (dbError) {
      console.error('Error creating database:', dbError);
      // Continue with file creation even if database creation fails
    }

    return {
      success: true,
      message: `Successfully created files in ${String(targetDir)}`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
};
