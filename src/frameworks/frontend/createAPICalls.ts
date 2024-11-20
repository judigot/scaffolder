import { ISchemaInfo } from '@/interfaces/interfaces';
import { APP_SETTINGS } from '@/constants';
import { IStructure } from '@/components/FileViewer';
import { getPrimaryKey } from '@/utils/common';
import { createFile } from '@/helpers/stringHelper';

const CREATE_TEMPLATE = `
import { customFetch } from '../customFetch';
import { I{{className}} } from '../../../interfaces/I{{className}}';

type IBody = Omit<I{{className}}, '$PRIMARY_KEY' | 'created_at' | 'updated_at'>;

export const create{{className}} = async (
  formData: IBody,
): Promise<IBody | undefined> => {
  const result: IBody | undefined = await customFetch.post({
    url: '/{{tableNamePlural}}',
    body: JSON.stringify(formData),
  });
  return result;
};
`;

const READ_TEMPLATE = `
import { customFetch } from '../customFetch';
import { I{{className}} } from '../../../interfaces/I{{className}}';

type IBody = I{{className}};

export const read{{className}} = async (): Promise<IBody[] | null> => {
  const result: IBody[] | null = await customFetch.get({
    url: '/{{tableNamePlural}}',
  });
  return result;
};
`;

const UPDATE_TEMPLATE = `
import { customFetch } from '../customFetch';
import { I{{className}} } from '../../../interfaces/I{{className}}';

type IBody = I{{className}};

export const update{{className}} = async (formData: IBody): Promise<IBody> => {
  const result: IBody = await customFetch.patch({
    url: '/{{tableNamePlural}}',
    body: JSON.stringify(formData),
  });
  return result;
};
`;

const DELETE_TEMPLATE = `
import { customFetch } from '../customFetch';

export const delete{{className}} = async (id: number): Promise<void> => {
  await customFetch.delete({
    url: '/{{tableNamePlural}}/\${String(id)}',
  });
};
`;

const createCRUDTemplates = (schemaInfo: ISchemaInfo[]): IStructure => {
  return schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot), // Exclude pivot tables if specified in APP_SETTINGS
    )
    .map((tableInfo) => {
      const {
        table,
        tableCases: { plural, pascalCase },
      } = tableInfo;

      const replacements = {
        tableName: table,
        tableNamePlural: plural,
        className: pascalCase,
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
