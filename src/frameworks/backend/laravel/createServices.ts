import { ISchemaInfo } from '@/interfaces/interfaces';
import { APP_SETTINGS } from '@/constants';
import { IFile } from '@/components/FileViewer';
import { createFile } from '@/helpers/stringHelper';
import { changeCase } from '@/utils/identifySchema';

const template = `
<?php

namespace App\\Services;

use App\\Models\\{{className}};
use Illuminate\\Support\\Collection;

class {{className}}Service
{
    /**
     * Get all {{tableName}} records.
     *
     * @return Collection
     */
    public function getAll(): Collection
    {
        return {{className}}::all();
    }

    /**
     * Get a {{tableName}} record by ID.
     *
     * @param int $id
     * @return {{className}}|null
     */
    public function getById(int $id): ?{{className}}
    {
        return {{className}}::find($id);
    }

    /**
     * Create a new {{tableName}} record.
     *
     * @param array $data
     * @return {{className}}
     */
    public function create(array $data): {{className}}
    {
        return {{className}}::create($data);
    }

    /**
     * Update a {{tableName}} record by ID.
     *
     * @param int $id
     * @param array $data
     * @return bool
     */
    public function update(int $id, array $data): bool
    {
        \${{tableName}} = {{className}}::find($id);
        if (\${{tableName}}) {
            return \${{tableName}}->update($data);
        }
        return false;
    }

    /**
     * Delete a {{tableName}} record by ID.
     *
     * @param int $id
     * @return bool
     */
    public function delete(int $id): bool
    {
        \${{tableName}} = {{className}}::find($id);
        if (\${{tableName}}) {
            return \${{tableName}}->delete();
        }
        return false;
    }
}
`;

const createServices = (schemaInfo: ISchemaInfo[]): IFile[] => {
  return schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot), // Exclude pivot tables if specified in APP_SETTINGS
    )
    .map((tableInfo) => {
      const { table } = tableInfo;
      const { pascalCase } = changeCase(table);
      const className = pascalCase;

      const replacements = {
        className,
        tableName: table,
      };

      const content = createFile({ template, replacements });

      return {
        type: 'file',
        name: `${className}Service.php`,
        content,
      };
    });
};

export default createServices;
