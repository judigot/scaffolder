import {
  type DBTypes,
  type IIntrospectedSchemaInfo,
  isITableArray,
} from '@/interfaces/interfaces.ts';
import introspect from '@/utils/introspect.ts';

interface IIntrospectRequest {
  dbType: DBTypes;
  dbConnection: string;
}

export const introspectService = async (
  data: IIntrospectRequest,
): Promise<IIntrospectedSchemaInfo[]> => {
  const { dbConnection, dbType } = data;

  if (!dbConnection) {
    throw new Error('Database connection string is required');
  }

  const introspectionResult = await introspect(dbConnection, dbType);

  if (isITableArray(introspectionResult)) {
    return introspectionResult;
  }

  throw new Error('Invalid introspection result');
};
