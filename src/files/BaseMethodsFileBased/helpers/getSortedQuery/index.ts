import * as fs from 'fs';
import * as path from 'path';

export default {
  name: 'getSortedQuery',
  category: 'retrieval-and-sorting',
  description: fs.readFileSync(path.join(__dirname, 'description.txt'), 'utf8'),
  repositoryMethod: fs.readFileSync(path.join(__dirname, 'repositoryMethod.txt'), 'utf8'),
  repositoryContent: fs.readFileSync(path.join(__dirname, 'repositoryContent.txt'), 'utf8'),
  serviceMethod: fs.readFileSync(path.join(__dirname, 'serviceMethod.txt'), 'utf8'),
  serviceContent: fs.readFileSync(path.join(__dirname, 'serviceContent.txt'), 'utf8'),
  controllerMethod: fs.readFileSync(path.join(__dirname, 'controllerMethod.txt'), 'utf8'),
  controllerContent: fs.readFileSync(path.join(__dirname, 'controllerContent.txt'), 'utf8'),
  route: fs.readFileSync(path.join(__dirname, 'route.txt'), 'utf8'),
  dependencies: [],
  methodName: fs.readFileSync(path.join(__dirname, 'methodName.txt'), 'utf8').trim(),
}; 