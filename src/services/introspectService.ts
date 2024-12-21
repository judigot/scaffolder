import { DBTypes, ISchemaInfo, isITableArray } from "@/interfaces/interfaces.ts";
import introspect from "@/utils/introspect.ts";
import convertIntrospectedStructure from "@/utils/convertIntrospectedStructure.ts";

interface IIntrospectRequest {
  dbType: DBTypes;
  dbConnection: string;
}

export const introspectService = async (data: IIntrospectRequest): Promise<ISchemaInfo[]> => {
  const { dbConnection } = data;

  if (!dbConnection) {
    throw new Error('Database connection string is required');
  }

  const introspectionResult = await introspect(dbConnection);

  if (isITableArray(introspectionResult)) {
    return convertIntrospectedStructure(introspectionResult);
  }

  throw new Error('Invalid introspection result');
};
