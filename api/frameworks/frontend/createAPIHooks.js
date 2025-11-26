import { APP_SETTINGS } from '../../constants';
import { getPrimaryKey, changeCase } from '../../utils/common';
import { createFile } from '../../helpers/stringHelper';
const READ_TEMPLATE = `
import {
  UseQueryOptions,
  UseQueryResult,
  useQuery,
} from '@tanstack/react-query';
import { read{{className}} } from '@/services/{{tableName}}/read-{{tableName}}';
import { I{{className}} } from '../../interfaces/interfaces';

export const use{{className}}Data = (
  behavior?: Omit<UseQueryOptions<I{{className}}[], unknown>, 'queryKey' | 'queryFn'>,
): UseQueryResult<I{{className}}[], unknown> =>
  useQuery<I{{className}}[], unknown>({
    queryKey: ['{{tableName}}Data'],
    queryFn: read{{className}},
    ...behavior,
  });
`;
const createAPIHooks = (schemaInfo) => {
  return schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot),
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
