import { ISchemaInfo } from '@/interfaces/interfaces';
import { APP_SETTINGS, ownerComment } from '@/constants';
import { changeCase } from '@/utils/identifySchema';
import { IFile } from '@/components/FileViewer';

/* Resource Generation Rules:

1. Relationship Handling:

   - If the schema has both `hasMany` and `childTables` but **no** `pivotRelationships`, generate resource attributes based on `hasMany` and `childTables`.
   
   - If the schema contains `pivotRelationships`, only generate resource attributes referencing the related tables specified in `pivotRelationships`.

2. Attribute Generation:

   - Always include all columns in the resource output as individual attributes.
   
   - For relationships, prioritize generating attributes based on the existence of `pivotRelationships`. If `pivotRelationships` are present, ignore other relationships (like `hasMany` and `childTables`).

3. File Handling:

   - Skip generating resource files for pivot tables if `APP_SETTINGS.excludePivotTableFiles` is set to `true`.
   
   - Ensure that generated resource files use consistent naming conventions and follow the standard resource structure.
*/

// Function to generate attributes for the resource file
const generateAttributes = (schemaInfo: ISchemaInfo): string => {
  const { columnsInfo, hasMany, childTables, pivotRelationships } = schemaInfo;

  // Generate attributes for each column
  const columns = columnsInfo.map(
    (column) =>
      `            '${column.column_name}' => $this->${column.column_name},`,
  );

  let relationshipAttributes: string[] = [];

  if (pivotRelationships.length > 0) {
    // Generate attributes only for pivot relationships
    relationshipAttributes = pivotRelationships.map(({ relatedTable }) => {
      const relatedClass = changeCase(relatedTable).pascalCase;
      const relationName = relatedTable + 's';
      return `            '${relationName}' => ${relatedClass}Resource::collection($this->whenLoaded('${relatedTable}')),`;
    });
  } else if (hasMany.length > 0 && childTables.length > 0) {
    // Generate attributes for hasMany and childTables if no pivotRelationships exist
    relationshipAttributes = hasMany.map((relatedTable) => {
      const relatedClass = changeCase(relatedTable).pascalCase;
      const relationName = relatedTable + 's';
      return `            '${relationName}' => ${relatedClass}Resource::collection($this->whenLoaded('${relatedTable}')),`;
    });
  }

  // Combine column and relationship attributes
  return [...columns, ...relationshipAttributes].join('\n');
};

const createResources = (schemaInfo: ISchemaInfo[]): IFile[] => {
  const resources: IFile[] = [];

  schemaInfo.forEach((tableInfo) => {
    const {
      tableCases: { pascalCase },
      isPivot,
    } = tableInfo;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (APP_SETTINGS.excludePivotTableFiles && isPivot) return;

    const attributes = generateAttributes(tableInfo);

    const template = `<?php
${ownerComment}

namespace App\\Http\\Resources;

use Illuminate\\Http\\Resources\\Json\\JsonResource;

class ${pascalCase}Resource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param \\Illuminate\\Http\\Request $request
     * @return array
     */
    public function toArray($request)
    {
        return [
${attributes}
        ];
    }
}
`;

    resources.push({
      type: 'file',
      name: `${pascalCase}Resource.php`,
      content: template,
    });
  });

  return resources;
};

export default createResources;
