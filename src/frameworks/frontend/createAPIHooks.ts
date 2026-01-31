import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { APP_SETTINGS } from '@/constants.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import { getPrimaryKey, changeCase } from '@/utils/common.ts';
import { createFile } from '@/helpers/stringHelper.ts';

const READ_TEMPLATE = `
import {
  UseQueryOptions,
  UseQueryResult,
  useQuery,
} from '@tanstack/react-query';
import { read{{className}} } from '@/services/{{tableName}}/read-{{tableName}}';
import { I{{className}} } from '@/interfaces/interfaces.ts';

export const use{{className}}Data = (
  behavior?: Omit<UseQueryOptions<I{{className}}[], unknown>, 'queryKey' | 'queryFn'>,
): UseQueryResult<I{{className}}[], unknown> =>
  useQuery<I{{className}}[], unknown>({
    queryKey: ['{{tableName}}Data'],
    queryFn: read{{className}},
    ...behavior,
  });
`;

const createAPIHooks = (schemaInfo: ISchemaInfo[]): IStructure => {
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
          // {
          //   type: 'file',
          //   name: `create-${table}.ts`,
          //   content: createFile({ template: CREATE_TEMPLATE, replacements }),
          // },
          {
            type: 'file',
            name: `use${pascalCase}.ts`,
            content: createFile({ template: READ_TEMPLATE, replacements }),
          },
          // {
          //   type: 'file',
          //   name: `update-${table}.ts`,
          //   content: createFile({ template: UPDATE_TEMPLATE, replacements }),
          // },
          // {
          //   type: 'file',
          //   name: `delete-${table}.ts`,
          //   content: createFile({ template: DELETE_TEMPLATE, replacements }),
          // },
        ],
      };
    });
};

export default createAPIHooks;
