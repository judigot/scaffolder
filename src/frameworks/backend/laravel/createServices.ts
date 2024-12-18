import { ISchemaInfo } from '@/interfaces/interfaces';
import { APP_SETTINGS } from '@/constants';
import { IFile } from '@/components/FileViewer';
import { createFile } from '@/helpers/stringHelper';
import { changeCase } from '@/utils/common';

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
