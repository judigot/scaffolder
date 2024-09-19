import fs from 'fs';
import path from 'path';
import { toPascalCase } from '@/helpers/toPascalCase';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { APP_SETTINGS } from '@/constants';

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
const getOwnerComment = (): string => '/* Owner: App Scaffolder */\n';

// Function to create a file with dynamic replacements
const createFile = (
  template: string,
  replacements: Record<string, string>,
): string =>
  Object.entries(replacements).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template,
  );

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
      const relatedClass = toPascalCase(relatedTable);
      const relationName = relatedTable + 's';
      return `            '${relationName}' => ${relatedClass}Resource::collection($this->whenLoaded('${relatedTable}')),`;
    });
  } else if (hasMany.length > 0 && childTables.length > 0) {
    // Generate attributes for hasMany and childTables if no pivotRelationships exist
    relationshipAttributes = hasMany.map((relatedTable) => {
      const relatedClass = toPascalCase(relatedTable);
      const relationName = relatedTable + 's';
      return `            '${relationName}' => ${relatedClass}Resource::collection($this->whenLoaded('${relatedTable}')),`;
    });
  }

  // Combine column and relationship attributes
  return [...columns, ...relationshipAttributes].join('\n');
};

// Function to create resource files based on schema information
const createResources = (
  schemaInfoList: ISchemaInfo[],
  framework: string,
  outputDir: string,
): void => {
  // Ensure the output directory exists
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  schemaInfoList.forEach((schemaInfo) => {
    const { table, isPivot } = schemaInfo;

    // Skip generating resource files for pivot tables if configured
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (APP_SETTINGS.excludePivotTableFiles && isPivot) return;

    const className = toPascalCase(table);
    const attributes = generateAttributes(schemaInfo);

    // Prepare replacements for the template
    const replacements = {
      ownerComment: getOwnerComment(),
      className,
      attributes,
    };

    const templatePath = path.resolve(
      __dirname,
      `../../../templates/backend/${framework}/resource.txt`,
    );

    // Check if the template exists and create the file
    if (fs.existsSync(templatePath)) {
      const template = fs.readFileSync(templatePath, 'utf-8');
      const content = createFile(template, replacements);
      const outputFilePath = path.join(outputDir, `${className}Resource.php`);
      fs.writeFileSync(outputFilePath, content);
    } else {
      console.error(`Template not found: ${templatePath}`);
    }
  });
};

export default createResources;
