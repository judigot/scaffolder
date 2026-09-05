import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { APP_SETTINGS } from '@/constants.ts';
import type { IFile } from '@/components/FileViewer.tsx';
import { createFile } from '@/helpers/stringHelper.ts';
import { changeCase } from '@/utils/common.ts';

const template = `
<?php

namespace App\\Services;

use App\\Models\\{{className}};
use App\\Repositories\\{{className}}Repository;

class {{className}}Service extends BaseService
{
    public function __construct({{className}}Repository $repository)
    {
        parent::__construct($repository);
    }
}
`;

const createServices = (schemaInfo: ISchemaInfo[]): IFile[] => {
  return schemaInfo
    .filter(
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot), // Exclude pivot tables if specified in APP_SETTINGS
    )
    .map((tableInfo) => {
      const { tableName } = tableInfo;
      const { pascalCase } = changeCase(tableName);
      const className = pascalCase;

      const replacements = {
        className,
        tableName,
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
