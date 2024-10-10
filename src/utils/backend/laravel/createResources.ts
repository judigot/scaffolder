import fs from 'fs';
import path from 'path';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { APP_SETTINGS, ownerComment } from '@/constants';
import { changeCase } from '@/utils/identifySchema';
import { createFile } from '@/utils/backend/laravel/createBaseFile';

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

// Resolve platform-specific paths
const platform: string = process.platform;
let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));
if (platform === 'win32') {
  __dirname = __dirname.substring(1);
}

// Function to get the owner comment for the resource file

// Function to create a file with dynamic replacements

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

const createResources = (
  schemaInfo: ISchemaInfo[],
  framework: string,
  outputDir: string,
): void => {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const templatePath = path.resolve(
    __dirname,
    `../../../templates/backend/${framework}/resource.txt`,
  );
  const template = fs.existsSync(templatePath)
    ? fs.readFileSync(templatePath, 'utf-8')
    : null;

  if (template == null) {
    console.error(`Template not found: ${templatePath}`);
    return;
  }

  schemaInfo.forEach((tableInfo) => {
    const {
      tableCases: { pascalCase },
      isPivot,
    } = tableInfo;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (APP_SETTINGS.excludePivotTableFiles && isPivot) return;

    const attributes = generateAttributes(tableInfo);

    const content = createFile(template, {
      ownerComment,
      className: pascalCase,
      attributes,
    });

    const outputFilePath = path.join(outputDir, `${pascalCase}Resource.php`);
    fs.writeFileSync(outputFilePath, content);
  });
};

export default createResources;
