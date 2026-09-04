/**
 * Generate every current agent-scaffold project from bundled files/.
 * Nested ProjectsExtra folders are not reachable via project_url (no nested path).
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import type { IFile, IFolder, IStructure } from '@/components/FileViewer.tsx';
import type { IFormStore } from '@/useFormStore.ts';
import { SCAFFOLDER_MESSAGE_CODES } from '@/interfaces/scaffolderMessages.ts';
import { parseCompactSchema } from '@/utils/schemaInfoValidator.ts';
import {
  getAllProjects,
  schemaMatchesFilter,
} from '@/utils/project-builder/utils/filterCompatibleProjects.ts';
import { detectLeftoverTemplateMarkers } from '@/utils/project-builder/utils/detectLeftoverTemplateMarkers.ts';
import { honoReactCompactSchema } from '@/tests/helpers/honoReactAgentSchema.ts';

const GENERIC_COMPACT_SCHEMA = `<@@SCHEMA@@>
@users:id:n#pk,email:s!u,name:s,created_at:D,updated_at:D
<@@/SCHEMA@@>`;

const HONO_REACT_WITH_PASSWORD_SCHEMA = `<@@SCHEMA@@>
@user:id:u#pk,email:s!u,hashed_password:s,createdAt:D,updatedAt:D|>session
@session:id:s#pk,userId:u>user,expiresAt:D|<user
<@@/SCHEMA@@>`;

const mockFormData: IFormStore = {
  backendUrl: 'http://localhost:3000',
  dbType: 'postgresql',
  framework: 'hono',
  schemaInput: {},
  backendDir: '',
  frontendDir: '',
  dbConnection: '',
  includeInsertData: false,
  insertOption: 'SQLInsertQueriesFromMockData',
  includeTypeGuards: false,
  outputOnSingleFile: false,
  quote: '"',
  publicRepoURL: '',
  clientID: '',
  clientSecret: '',
  creationMode: 'Schema Builder',
  dbUsername: '',
  dbPassword: '',
  dbHost: '',
  dbPort: 0,
  dbName: '',
  setCreationMode: () => {
    return;
  },
  setMasterSchema: () => {
    return;
  },
  setOneToOne: () => {
    return;
  },
  setOneToMany: () => {
    return;
  },
  setManyToMany: () => {
    return;
  },
  setDBType: () => {
    return;
  },
  setPublicRepoURL: () => {
    return;
  },
  setDbConnection: () => {
    return;
  },
};

function createFile(name: string, content: string): IFile {
  return { type: 'file', name, content };
}

function createFolder(name: string, children: IStructure): IFolder {
  return { type: 'folder', name, children };
}

function loadDirectoryAsStructure(dirPath: string): IStructure {
  const items: IStructure = [];
  if (!fs.existsSync(dirPath)) {
    return items;
  }
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      items.push(createFolder(entry.name, loadDirectoryAsStructure(fullPath)));
    } else if (entry.isFile()) {
      items.push(createFile(entry.name, fs.readFileSync(fullPath, 'utf-8')));
    }
  }
  return items;
}

function countFiles(structure: IStructure): number {
  let count = 0;
  for (const item of structure) {
    if (item.type === 'file') {
      count += 1;
    } else {
      count += countFiles(item.children);
    }
  }
  return count;
}

function schemaForProject(
  projectName: string,
): ReturnType<typeof parseCompactSchema> {
  const compact =
    projectName === 'hono-react' || projectName === 'App Generator - Next.js'
      ? HONO_REACT_WITH_PASSWORD_SCHEMA
      : GENERIC_COMPACT_SCHEMA;
  return parseCompactSchema(compact);
}

const filesDir = path.resolve(__dirname, '../../../../files');
const userFiles = loadDirectoryAsStructure(filesDir);
const projects = getAllProjects(userFiles);

describe('agent-scaffold generate for every current project', () => {
  it('discovers the bundled Projects catalog', () => {
    expect(projects.map((project) => project.name).sort()).toEqual(
      [
        'App',
        'App Generator - Database Schema',
        'App Generator - Express React',
        'App Generator - Laravel',
        'App Generator - Next.js',
        'App Generator - ORM Tester',
        'App Generator - Spring Boot',
        'App Generator - Template - Frontend',
        'hono-react',
        'template-monorepo',
        'ORM Schema - Knex',
        'ORM Schema - Kysely',
        'ORM Schema - MikroORM',
        'ORM Schema - Prisma',
        'ORM Schema - TypeORM',
      ].sort(),
    );
  });

  describe.each(projects.map((project) => project.name))(
    'project %s',
    (projectName) => {
      it('generates without leftover markers', { timeout: 60000 }, async () => {
        const project = projects.find((item) => item.name === projectName);
        expect(project).toBeDefined();
        if (project === undefined) {
          return;
        }

        const parsedSchema = schemaForProject(projectName);
        expect(parsedSchema).not.toBeNull();
        if (parsedSchema === null) {
          return;
        }

        const filterOk = schemaMatchesFilter(
          parsedSchema,
          project.schemaFilter,
        );
        if (!filterOk) {
          throw new Error(
            `${projectName} representative schema failed SCHEMA_FILTER: ${project.schemaFilter.join(', ')}`,
          );
        }

        const result = await buildProjectFiles(
          `/Projects/${projectName}/structure.yaml`,
          userFiles,
          parsedSchema,
          mockFormData,
          null,
        );

        const leftovers = detectLeftoverTemplateMarkers(result.structure);
        expect(leftovers).toEqual([]);

        if (projectName === 'App') {
          expect(result.hasErrors).toBe(true);
          expect(
            result.messages?.some(
              (message) =>
                message.code === SCAFFOLDER_MESSAGE_CODES.FormatError,
            ),
          ).toBe(true);
          return;
        }

        expect(result.hasErrors).toBeFalsy();
        expect(result.filesFailedToFormat).toEqual([]);
        expect(countFiles(result.structure)).toBeGreaterThan(0);
      });
    },
  );

  it('generates ORM Schema - Knex from the compact agent schema', async () => {
    const parsedSchema = parseCompactSchema(GENERIC_COMPACT_SCHEMA);
    expect(parsedSchema).not.toBeNull();
    if (parsedSchema === null) {
      return;
    }
    const result = await buildProjectFiles(
      '/Projects/ORM Schema - Knex/structure.yaml',
      userFiles,
      parsedSchema,
      mockFormData,
      null,
    );
    expect(result.hasErrors).toBeFalsy();
    expect(result.filesFailedToFormat).toEqual([]);
    expect(detectLeftoverTemplateMarkers(result.structure)).toEqual([]);
    expect(countFiles(result.structure)).toBeGreaterThanOrEqual(3);
  });

  it('generates hono-react from the password-less uuid schema', async () => {
    const parsedSchema = parseCompactSchema(honoReactCompactSchema);
    expect(parsedSchema).not.toBeNull();
    if (parsedSchema === null) {
      return;
    }
    const result = await buildProjectFiles(
      '/Projects/hono-react/structure.yaml',
      userFiles,
      parsedSchema,
      mockFormData,
      null,
    );
    expect(result.hasErrors).toBeFalsy();
    expect(result.filesFailedToFormat).toEqual([]);
    expect(detectLeftoverTemplateMarkers(result.structure)).toEqual([]);
  }, 60000);
});
