import type { IFile } from '@/components/FileViewer.tsx';
import baseMethods from '@/frameworks/base-methods/index.ts';
import { createFile, replacePlaceholder } from '@/helpers/stringHelper.ts';

const createBaseFiles = (
  type: 'interface' | 'repository' | 'service' | 'controller',
): IFile => {
  const methods = baseMethods
    .map(({ group, methods }) => {
      const groupHeader = `\n    // ${group}`;
      const groupMethods = methods
        .map(
          ({
            methodName,
            repositoryMethod,
            repositoryContent,
            serviceMethod,
            serviceContent,
            controllerMethod,
            controllerContent,
          }) => {
            const replacements = { methodName };

            switch (type) {
              case 'interface': {
                return `    public function ${replacePlaceholder({ template: repositoryMethod, replacements })};`;
              }
              case 'repository': {
                const content = repositoryContent
                  ? replacePlaceholder({
                      template: repositoryContent,
                      replacements,
                    })
                      .trim()
                      .split('\n')
                      .map((line) => `        ${line.trim()}`)
                      .join('\n')
                  : `        return $this->model;`;
                return `
    public function ${replacePlaceholder({ template: repositoryMethod, replacements })}
    {
${content}
    }`;
              }
              case 'service': {
                const content = serviceContent
                  ? replacePlaceholder({
                      template: serviceContent,
                      replacements,
                    })
                      .trim()
                      .split('\n')
                      .map((line) => `        ${line.trim()}`)
                      .join('\n')
                  : `        return $this->repository->${methodName}();`;
                return `
    public function ${replacePlaceholder({ template: serviceMethod, replacements })}
    {
${content}
    }`;
              }
              case 'controller': {
                const content = controllerContent
                  ? replacePlaceholder({
                      template: controllerContent,
                      replacements,
                    })
                      .trim()
                      .split('\n')
                      .map((line) => `        ${line.trim()}`)
                      .join('\n')
                  : `        return $this->service->${methodName}();`;
                return `
    public function ${replacePlaceholder({ template: controllerMethod, replacements })}
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
      return `${groupHeader}\n${groupMethods}`;
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

  const fileName =
    type === 'interface'
      ? 'BaseInterface.php'
      : type === 'repository'
        ? 'BaseRepository.php'
        : type === 'controller'
          ? 'BaseController.php'
          : 'BaseService.php';

  return {
    type: 'file',
    name: fileName,
    content,
  };
};

export default createBaseFiles;
