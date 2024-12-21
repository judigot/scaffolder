import { IJSONSchema, DBTypes } from "@/interfaces/interfaces.ts";

export interface IExecuteCustomSchemaRequest {
  schema: IJSONSchema;
  dbType: DBTypes;
  dbConnection: string;
  SQLSchemaEditable: string;
}
