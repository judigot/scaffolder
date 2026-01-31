import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { APP_SETTINGS } from '@/constants.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import { getPrimaryKey, changeCase } from '@/utils/common.ts';
import { createFile } from '@/helpers/stringHelper.ts';

const CREATE_TEMPLATE = `
import axiosInstance from '../axiosInstance';
import { I{{className}} } from '@/interfaces/interfaces.ts';

type IBody = Omit<I{{className}}, '{{primaryKey}}' | 'created_at' | 'updated_at'>;

export const create{{className}} = async (
  formData: IBody,
): Promise<IBody | undefined> => {
  const result: IBody | undefined = await axiosInstance.post<IBody>('/{{tableNamePlural}}', formData);
  return result;
};
`;

const READ_TEMPLATE = `
import axiosInstance from '../axiosInstance';
import { I{{className}} } from '@/interfaces/interfaces.ts';

export const read{{className}} = async (): Promise<I{{className}}[]> => {
  const response = await axiosInstance.get<I{{className}}[]>('/{{tableNamePlural}}');
  return response.data;
};
`;

const UPDATE_TEMPLATE = `
import axiosInstance from '../axiosInstance';
import { I{{className}} } from '@/interfaces/interfaces.ts';

type IBody = I{{className}};

export const update{{className}} = async (formData: IBody): Promise<IBody> => {
  const result: IBody = await axiosInstance.patch<IBody>('/{{tableNamePlural}}', formData);
  return result;
};
`;

const DELETE_TEMPLATE = `
import axiosInstance from '../axiosInstance';

export const delete{{className}} = async (id: number): Promise<void> => {
  await axiosInstance.delete(\`/{{tableNamePlural}}/\${String(id)}\`);
};
`;

const createCRUDTemplates = (schemaInfo: ISchemaInfo[]): IStructure => {
  return schemaInfo
    .filter(
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot), // Exclude pivot tables if specified in APP_SETTINGS
    )
    .map((tableInfo) => {
      const { tableName } = tableInfo;
      const { plural, pascalCase } = changeCase(tableName);
      const className = pascalCase;

      const replacements = {
        tableName,
        tableNamePlural: plural,
        className,
        primaryKey: getPrimaryKey({ tableName, schemaInfo }),
      };

      return {
        type: 'folder',
        name: tableName,
        children: [
          {
            type: 'file',
            name: `create-${tableName}.ts`,
            content: createFile({ template: CREATE_TEMPLATE, replacements }),
          },
          {
            type: 'file',
            name: `read-${tableName}.ts`,
            content: createFile({ template: READ_TEMPLATE, replacements }),
          },
          {
            type: 'file',
            name: `update-${tableName}.ts`,
            content: createFile({ template: UPDATE_TEMPLATE, replacements }),
          },
          {
            type: 'file',
            name: `delete-${tableName}.ts`,
            content: createFile({ template: DELETE_TEMPLATE, replacements }),
          },
        ],
      };
    });
};

export default createCRUDTemplates;
