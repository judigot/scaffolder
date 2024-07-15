import fs from 'fs';
import path from 'path';
import { IRelationshipInfo } from '@/utils/identifyRelationships';
import { toPascalCase } from '@/helpers/toPascalCase';

// Global variables
const platform: string = process.platform;
let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));
if (platform === 'win32') {
  __dirname = __dirname.substring(1);
}

const getOwnerComment = (): string => '/* Owner: App Scaffolder */\n';

const createFile = (
  template: string,
  replacements: Record<string, string>,
): string =>
  Object.entries(replacements).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template,
  );

const generateAttributes = (
  columns: string[],
  relationships: string[],
): string => {
  const attributes = columns
    .map((column) => `            '${column}' => $this->${column},`)
    .join('\n');
  const relationshipAttributes = relationships
    .map((relation) => {
      const relationName = relation.replace('_id', '');
      return `            '${relationName}' => ${toPascalCase(relationName)}Resource::collection($this->whenLoaded('${relationName}'))`;
    })
    .join(',\n');

  return [attributes, relationshipAttributes].filter(Boolean).join(',\n');
};

const createResources = (
  relationships: IRelationshipInfo[],
  framework: string,
  outputDir: string,
): void => {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  relationships.forEach(({ table, columnsInfo, childTables, foreignKeys }) => {
    const className = toPascalCase(table);
    const columns = columnsInfo.map((col) => col.column_name);
    const relationships = childTables.concat(foreignKeys);

    const replacements = {
      ownerComment: getOwnerComment(),
      className,
      attributes: generateAttributes(columns, relationships),
    };

    const templatePath = path.resolve(
      __dirname,
      `../templates/backend/${framework}/resource.txt`,
    );
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
