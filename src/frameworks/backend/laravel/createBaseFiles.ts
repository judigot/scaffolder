import { IFile } from '@/components/FileViewer.tsx';
import baseMethods from '@/frameworks/backend/laravel/base-methods/index.ts';
import { createFile } from '@/helpers/stringHelper.ts';

const createBaseFiles = (
  type: 'interface' | 'repository' | 'service' | 'controller',
): IFile => {
  const methods = baseMethods
    .map(({ group, methods }) => {
      const groupHeader = `\n    // ${group}`;
      const groupMethods = methods
        .map(
          ({
            repositoryMethod,
            repositoryContent,
            serviceMethod,
            serviceContent,
            controllerMethod,
            controllerContent,
          }) => {
            switch (type) {
              case 'interface': {
                return `    public function ${repositoryMethod};`;
              }
              case 'repository': {
                const content = repositoryContent
                  ? repositoryContent
                      .trim()
                      .split('\n')
                      .map((line) => `        ${line.trim()}`)
                      .join('\n')
                  : `        return $this->model;`;
                return `
    public function ${repositoryMethod}
    {
${content}
    }`;
              }
              case 'service': {
                const content = serviceContent
                  ? serviceContent
                      .trim()
                      .split('\n')
                      .map((line) => `        ${line.trim()}`)
                      .join('\n')
                  : `        return $this->repository->${repositoryMethod.split('(')[0]}();`;
                return `
    public function ${serviceMethod}
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
                  : `        return $this->service->${serviceMethod.split('(')[0]}();`;
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
        .join('\n');
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
        : type === 'service'
          ? `
<?php

namespace App\\Services;

use App\\Repositories\\BaseRepository;
use Illuminate\\Support\\Collection;
use Illuminate\\Database\\Eloquent\\Model;

abstract class BaseService
{
    protected BaseRepository $repository;

    public function __construct(BaseRepository $repository)
    {
        $this->repository = $repository;
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
    protected $service;

    public function __construct($service)
    {
        $this->service = $service;
    }
${methods}
}
`;

  const content = createFile({ template, replacements: {} });

  let fileName: string;

  if (type === 'interface') {
    fileName = 'BaseInterface.php';
  }
  if (type === 'repository') {
    fileName = 'BaseRepository.php';
  }
  if (type === 'controller') {
    fileName = 'BaseController.php';
  }
  if (type === 'service') {
    fileName = 'BaseService.php';
  }

  return {
    type: 'file',
    name: fileName,
    content,
  };
};

export default createBaseFiles;
