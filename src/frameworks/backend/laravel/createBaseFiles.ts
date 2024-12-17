import { IFile } from '@/components/FileViewer';
import AdvancedOperations from '@/frameworks/backend/laravel/methods/AdvancedOperations';
import BulkOperations from '@/frameworks/backend/laravel/methods/BulkOperations';
import CRUDOperations from '@/frameworks/backend/laravel/methods/CRUDOperations';
import QueryAndSearch from '@/frameworks/backend/laravel/methods/QueryAndSearch';
import RetrievalAndSorting from '@/frameworks/backend/laravel/methods/RetrievalAndSorting';
import SoftDeletesAndRestoration from '@/frameworks/backend/laravel/methods/SoftDeletesAndRestoration';
import { createFile } from '@/helpers/stringHelper';

interface IGroup {
  group: string;
  methods: {
    controllerMethod: string;
    repositoryMethod: string;
    repositoryContent: string;
    controllerContent: string;
  }[];
}

const methodsAndContent: IGroup[] = [
  { ...CRUDOperations },
  { ...QueryAndSearch },
  { ...SoftDeletesAndRestoration },
  { ...BulkOperations },
  { ...RetrievalAndSorting },
  { ...AdvancedOperations },
];

const createBaseFiles = (
  type: 'interface' | 'repository' | 'controller',
): IFile => {
  const methods = methodsAndContent
    .map(({ group, methods }) => {
      const groupHeader = `\n    // ${group}`;
      const groupMethods = methods
        .map(
          ({
            repositoryMethod,
            repositoryContent,
            controllerContent,
            controllerMethod,
          }) => {
            switch (type) {
              case 'interface': {
                return `    public function ${repositoryMethod};`;
              }
              case 'repository': {
                const methodName = repositoryMethod.split('(')[0];
                const content = repositoryContent
                  ? repositoryContent
                      .trim()
                      .split('\n')
                      .map((line) => `        ${line.trim()}`)
                      .join('\n')
                  : `// TODO: Implement ${methodName}`;
                return `
    public function ${repositoryMethod}
    {
${content}
    }`;
              }
              case 'controller': {
                const content = controllerContent
                  ? controllerContent
                      .trim()
                      .split('\n')
                      .map((line) => `        ${line.trim()}`)
                      .join('\n')
                  : `        // TODO: Implement ${controllerMethod}`;
                return `
    public function ${controllerMethod}
    {
${content}
    }`;
              }
              default:
                return '';
            }
          },
        )
        .join('\n'); // Add spacing between methods
      return groupHeader + '\n' + groupMethods;
    })
    .join('\n');

  const template =
    type === 'interface'
      ? `
<?php

namespace App\\Repositories;

use Illuminate\\Support\\Collection;
use Illuminate\\Database\\Eloquent\\Model;

interface BaseInterface
{
${methods}
}
`
      : type === 'repository'
        ? `
<?php

namespace App\\Repositories;

use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Support\\Collection;
use App\\Repositories\\BaseInterface;

abstract class BaseRepository implements BaseInterface
{
    protected Model $model;

    public function __construct(Model $model)
    {
        $this->model = $model;
    }
${methods}
}
`
        : `
<?php

namespace App\\Http\\Controllers;

use Illuminate\\Http\\Request;
use Illuminate\\Routing\\Controller;

abstract class BaseController extends Controller
{
    protected $repository;
${methods}
}
`;

  const content = createFile({ template, replacements: {} });

  return {
    type: 'file',
    name:
      type === 'interface'
        ? 'BaseInterface.php'
        : type === 'repository'
          ? 'BaseRepository.php'
          : 'BaseController.php',
    content,
  };
};

export default createBaseFiles;
