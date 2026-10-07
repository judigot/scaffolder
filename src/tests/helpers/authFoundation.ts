import type { IStructure } from '@/components/FileViewer.tsx';
import type { IFormStore } from '@/useFormStore.ts';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import convertLocalFilesToIStructure from '@/utils/convertLocalFilesToIStructure.ts';
import {
  parseCompactSchema,
  validateSchemaInfo,
} from '@/utils/schemaInfoValidator.ts';

const form: IFormStore = {
  backendUrl: 'http://localhost:3000',
  dbType: 'postgresql',
  framework: 'hono',
  schemaInput: {},
  backendDir: '',
  frontendDir: '',
  dbConnection: '',
  includeInsertData: false,
  insertOption: 'SQLInsertQueriesFromMockData',
  includeTypeGuards: false,
  outputOnSingleFile: false,
  quote: '"',
  publicRepoURL: '',
  clientID: '',
  clientSecret: '',
  creationMode: 'Schema Builder',
  dbUsername: '',
  dbPassword: '',
  dbHost: '',
  dbPort: 0,
  dbName: '',
  setCreationMode: () => undefined,
  setMasterSchema: () => undefined,
  setOneToOne: () => undefined,
  setOneToMany: () => undefined,
  setManyToMany: () => undefined,
  setDBType: () => undefined,
  setPublicRepoURL: () => undefined,
  setDbConnection: () => undefined,
};

export function generateAuthFoundation(base: IStructure) {
  const schema = validateSchemaInfo(
    parseCompactSchema(`<@@SCHEMA@@>
@user:id:u#pk,email:s!u,hashed_password:s,name:s,createdAt:D,updatedAt:D|>session
@session:id:s#pk,userId:u>user,expiresAt:D|<user
<@@/SCHEMA@@>`),
  );
  if (!schema.success || schema.data === undefined) {
    throw new Error('Invalid authentication fixture');
  }
  return buildProjectFiles(
    '/Projects/hono-react-monorepo/structure.yaml',
    convertLocalFilesToIStructure('files'),
    schema.data,
    form,
    null,
    { remoteBaseLayer: base },
  );
}
