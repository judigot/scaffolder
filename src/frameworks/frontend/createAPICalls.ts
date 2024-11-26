import { ISchemaInfo } from '@/interfaces/interfaces';
import { APP_SETTINGS } from '@/constants';
import { IStructure } from '@/components/FileViewer';
import { getPrimaryKey } from '@/utils/common';
import { createFile } from '@/helpers/stringHelper';
import { changeCase } from '@/utils/identifySchema';

const CREATE_TEMPLATE = `
import axiosInstance from '../axiosInstance';
import { I{{className}} } from '../../interfaces/I{{className}}';

type IBody = Omit<I{{className}}, '$PRIMARY_KEY' | 'created_at' | 'updated_at'>;

export const create{{className}} = async (
  formData: IBody,
): Promise<IBody | undefined> => {
  const result: IBody | undefined = await axiosInstance.post<IBody>('/{{tableNamePlural}}', formData);
  return result;
};
`;

const READ_TEMPLATE = `
import axiosInstance from '../axiosInstance';
import { I{{className}} } from '../../interfaces/I{{className}}';

export const read{{className}} = async (): Promise<I{{className}}[]> => {
  const response = await axiosInstance.get<I{{className}}[]>('/{{tableNamePlural}}');
  return response.data;
};
`;

const UPDATE_TEMPLATE = `
import axiosInstance from '../axiosInstance';
import { I{{className}} } from '../../interfaces/I{{className}}';

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
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot), // Exclude pivot tables if specified in APP_SETTINGS
    )
    .map((tableInfo) => {
      const { table } = tableInfo;
      const { plural, pascalCase } = changeCase(table);
      const className = pascalCase;

      const replacements = {
        tableName: table,
        tableNamePlural: plural,
        className,
        primaryKey: getPrimaryKey({ tableName: table, schemaInfo }),
      };

      return {
        type: 'folder',
        name: table,
        files: [
          {
            type: 'file',
            name: `create-${table}.ts`,
            content: createFile({ template: CREATE_TEMPLATE, replacements }),
          },
          {
            type: 'file',
            name: `read-${table}.ts`,
            content: createFile({ template: READ_TEMPLATE, replacements }),
          },
          {
            type: 'file',
            name: `update-${table}.ts`,
            content: createFile({ template: UPDATE_TEMPLATE, replacements }),
          },
          {
            type: 'file',
            name: `delete-${table}.ts`,
            content: createFile({ template: DELETE_TEMPLATE, replacements }),
          },
        ],
      };
    });
};

export default createCRUDTemplates;
