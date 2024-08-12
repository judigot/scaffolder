import fs from 'fs';
import path from 'path';
import { toPascalCase } from '@/helpers/toPascalCase';
import { ISchemaInfo } from '@/interfaces/interfaces';

// Global variables
let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));
if (process.platform === 'win32') {
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

const generateModelSpecificMethods = (schemaInfo: ISchemaInfo): string => {
  const { table, hasOne, hasMany } = schemaInfo;
  const className = toPascalCase(table);
  let methods = '';

  // Generate methods for hasOne relationships
  hasOne.forEach((relatedTable) => {
    const relatedClass = toPascalCase(relatedTable);
    methods += `
    /**
     * Get the related ${relatedClass}.
     *
     * @param int $id
     * @return ${relatedClass}|null
     */
    public function get${relatedClass}(int $id): ?${relatedClass}
    {
        return $this->model->find($id)?->${relatedTable};
    }
    `;
  });

  // Generate methods for hasMany relationships
  hasMany.forEach((relatedTable) => {
    const relatedClass = toPascalCase(relatedTable);
    methods += `
    /**
     * Get ${relatedTable} for a given ${className}.
     *
     * @param int $id
     * @return Collection
     */
    public function get${relatedClass}s(int $id): Collection
    {
        return $this->model->find($id)?->${relatedTable}s ?? collect();
    }
    `;
  });

  // Generate methods for foreign key relationships
  schemaInfo.columnsInfo.forEach((column) => {
    if (column.foreign_key) {
      const foreignKeyName = toPascalCase(column.column_name);
      methods += `
      /**
       * Find ${className} by ${column.column_name}.
       *
       * @param int $${column.column_name}
       * @return ${className}|null
       */
      public function findBy${foreignKeyName}(int $${column.column_name}): ?${className}
      {
          return $this->model->where('${column.column_name}', $${column.column_name})->first();
      }
      `;
    }
  });

  return methods;
};

const generateImports = (schemaInfo: ISchemaInfo): string => {
  const imports = new Set<string>();
  const { hasOne, hasMany, columnsInfo } = schemaInfo;

  // Collect unique import statements for related models
  [...hasOne, ...hasMany].forEach((relatedTable) => {
    const relatedClass = toPascalCase(relatedTable);
    imports.add(`use App\\Models\\${relatedClass};`);
  });

  columnsInfo.forEach((column) => {
    if (column.foreign_key) {
      const relatedClass = toPascalCase(column.foreign_key.foreign_table_name);
      imports.add(`use App\\Models\\${relatedClass};`);
    }
  });

  return Array.from(imports).join('\n');
};

const createRepositories = (
  schemaInfo: ISchemaInfo[],
  framework: string,
  outputDir: string,
): void => {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  schemaInfo.forEach((tableInfo) => {
    const className = toPascalCase(tableInfo.table);
    const modelSpecificMethods = generateModelSpecificMethods(tableInfo);
    const modelImports = generateImports(tableInfo);

    // Create Repository
    const repoTemplatePath = path.resolve(
      __dirname,
      `../templates/backend/${framework}/repository.txt`,
    );
    if (fs.existsSync(repoTemplatePath)) {
      const repoTemplate = fs.readFileSync(repoTemplatePath, 'utf-8');
      const repoContent = createFile(repoTemplate, {
        ownerComment: getOwnerComment(),
        className,
        modelName: className,
        tableName: tableInfo.table,
        modelSpecificMethods,
        modelImports,
      });
      const repoOutputFilePath = path.join(
        outputDir,
        `${className}Repository.php`,
      );
      fs.writeFileSync(repoOutputFilePath, repoContent);
    } else {
      console.error(`Template not found: ${repoTemplatePath}`);
    }
  });
};

export default createRepositories;
