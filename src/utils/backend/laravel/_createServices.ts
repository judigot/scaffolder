import { ISchemaInfo } from '@/interfaces/interfaces';
import { APP_SETTINGS, ownerComment } from '@/constants';
import { IFile } from '@/components/FileViewer';

// Helper function to create the service file content by replacing placeholders
const createServiceFile = (
  template: string,
  replacements: Record<string, string>,
): string =>
  Object.entries(replacements).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template,
  );

// Function to create services based on schema information and return an array of IFile
const createServices = (schemaInfo: ISchemaInfo[]): IFile[] => {
  const template = `<?php
{{ownerComment}}

namespace App\\Services;

use App\\Models\\{{modelName}};
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
        return {{modelName}}::all();
    }

    /**
     * Get a {{tableName}} record by ID.
     *
     * @param int $id
     * @return {{modelName}}|null
     */
    public function getById(int $id): ?{{modelName}}
    {
        return {{modelName}}::find($id);
    }

    /**
     * Create a new {{tableName}} record.
     *
     * @param array $data
     * @return {{modelName}}
     */
    public function create(array $data): {{modelName}}
    {
        return {{modelName}}::create($data);
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
        \${{tableName}} = {{modelName}}::find($id);
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
        \${{tableName}} = {{modelName}}::find($id);
        if (\${{tableName}}) {
            return \${{tableName}}->delete();
        }
        return false;
    }
}
`;

  // Generate services based on schema information and return them as an array of IFile
  return schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot),
    )
    .map(({ table, tableCases: { pascalCase } }) => {
      const replacements = {
        ownerComment,
        className: pascalCase,
        modelName: pascalCase,
        tableName: table,
      };

      const content = createServiceFile(template, replacements);

      return {
        type: 'file',
        name: `${pascalCase}Service.php`,
        content,
      };
    });
};

export default createServices;
