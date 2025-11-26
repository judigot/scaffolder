import { isITableArray } from '../interfaces/interfaces';
import introspect from '../utils/introspect';
export const introspectService = async (data) => {
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
