import fs from 'fs';
import path from 'path';
import { frameworkDirectories } from '@/constants';
import { IRelationshipInfo } from '@/utils/identifyRelationships';

const platform: string = process.platform;

let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));

if (platform === 'win32') {
  __dirname = __dirname.substring(1);
}

const toPascalCase = (str: string): string => {
  return str
    .replace(/_./g, (match) => match[1].toUpperCase())
    .replace(/^(.)/, (match) => match.toUpperCase());
};

const getOwnerComment = (extension: string): string => {
  const comments: Record<string, string> = {
    '.php': '/* Owner: App Scaffolder */\n',
  };
  return comments[extension] || '/* Owner: App Scaffolder */\n';
};

const createModels = (
  tables: IRelationshipInfo[],
  framework: keyof typeof frameworkDirectories,
  outputDir: string,
): void => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  tables.forEach(({ table, columnsInfo, foreignKeys, childTables }) => {
    const templatePath = path.resolve(
      __dirname,
      `../templates/backend/${framework}/${table === 'user' ? 'User.txt' : 'model.txt'}`,
    );
    const template = fs.readFileSync(templatePath, 'utf-8');
    const className = toPascalCase(table);
    const fillable = columnsInfo
      .map(({ column_name }) => `'${column_name}'`)
      .join(',\n        ');

    let relationships = '';
    foreignKeys.forEach((foreignKey) => {
      relationships += `    public function ${foreignKey}()\n    {\n        return $this->belongsTo(${toPascalCase(foreignKey)}::class, '${foreignKey}');\n    }\n\n`;
    });

    childTables.forEach((childTable) => {
      relationships += `    public function ${childTable}s()\n    {\n        return $this->hasMany(${toPascalCase(childTable)}::class);\n    }\n\n`;
    });

    let model = template;
    model = model.replace(/{{className}}/g, className);
    model = model.replace(/{{tableName}}/g, table);
    model = model.replace(/{{fillable}}/g, fillable);
    model = model.replace(/{{relationships}}/g, relationships.trim());

    const outputFilePath = path.join(outputDir, `${className}.php`);
    const ownerComment = getOwnerComment('.php');
    
    // Insert the comment after <?php
    const modelWithComment = model.replace('<?php', `<?php\n${ownerComment}`);
    
    fs.writeFileSync(outputFilePath, modelWithComment);
  });
};

export default createModels;
