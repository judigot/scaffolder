import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';
import fs from 'fs';
import path from 'path';

const currentDir = path.dirname(new URL(import.meta.url).pathname);

export default {
  methodName: fs.readFileSync(path.join(currentDir, 'methodName.txt'), 'utf8'),
  route: fs.readFileSync(path.join(currentDir, 'route.txt'), 'utf8'),
  description: fs.readFileSync(
    path.join(currentDir, 'description.txt'),
    'utf8',
  ),
  repositoryMethod: fs.readFileSync(
    path.join(currentDir, 'repositoryMethod.txt'),
    'utf8',
  ),
  repositoryContent: fs.readFileSync(
    path.join(currentDir, 'repositoryContent.txt'),
    'utf8',
  ),
  serviceMethod: fs.readFileSync(
    path.join(currentDir, 'serviceMethod.txt'),
    'utf8',
  ),
  serviceContent: fs.readFileSync(
    path.join(currentDir, 'serviceContent.txt'),
    'utf8',
  ),
  controllerMethod: fs.readFileSync(
    path.join(currentDir, 'controllerMethod.txt'),
    'utf8',
  ),
  controllerContent: fs.readFileSync(
    path.join(currentDir, 'controllerContent.txt'),
    'utf8',
  ),
} satisfies IMethod;
