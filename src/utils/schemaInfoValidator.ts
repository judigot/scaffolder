import { z } from 'zod';

/**
 * Zod schema for validating foreign key references (object format)
 */
const foreignKeyObjectSchema = z.object({
  foreign_table_name: z.string().min(1, 'Foreign table name is required'),
  foreign_column_name: z.string().min(1, 'Foreign column name is required'),
});

/**
 * Zod schema for validating foreign key references (string format: "table.column")
 * Transforms string format to object format for consistency
 */
const foreignKeyStringSchema = z.string().transform((val) => {
  const parts = val.split('.');
  if (parts.length === 2) {
    const [tableName, columnName] = parts;
    return {
      foreign_table_name: tableName,
      foreign_column_name: columnName,
    };
  }
  // If it doesn't match "table.column" format, assume it's just the table name with "id" column
  return {
    foreign_table_name: val,
    foreign_column_name: 'id',
  };
});

/**
 * Combined foreign key schema that accepts both formats
 */
const foreignKeySchema = z.union([
  foreignKeyObjectSchema,
  foreignKeyStringSchema,
]);

/**
 * Zod schema for validating column information
 */
const columnInfoSchema = z.object({
  column_name: z
    .string()
    .min(1, 'Column name is required')
    .regex(/^[a-z][a-z0-9_]*$/, 'Column name must be snake_case'),
  data_type: z.enum(['string', 'number', 'boolean', 'Date', 'object'], {
    message: 'Data type must be: string, number, boolean, Date, or object',
  }),
  is_nullable: z.enum(['YES', 'NO'], {
    message: "is_nullable must be 'YES' or 'NO'",
  }),
  column_default: z.string().nullable().optional(),
  primary_key: z.literal(true).optional(),
  unique: z.literal(true).optional(),
  foreign_key: foreignKeySchema.optional(),
});

/**
 * Zod schema for validating pivot relationships
 */
const pivotRelationshipSchema = z.object({
  relatedTable: z.string().min(1, 'Related table name is required'),
  pivotTable: z.string().min(1, 'Pivot table name is required'),
});

/**
 * Zod schema for validating a single table in the schema
 */
const schemaInfoSchema = z
  .object({
    tableName: z
      .string()
      .min(1, 'Table name is required')
      .regex(/^[a-z][a-z0-9_]*$/, 'Table name must be snake_case'),
    columnsInfo: z
      .array(columnInfoSchema)
      .min(1, 'At least one column is required'),
    data: z.array(z.record(z.string(), z.unknown())).optional(),
    requiredColumns: z.array(z.string()).optional(),
    foreignKeys: z.array(z.string()).optional(),
    viewQuery: z.string().optional(),
    viewStructure: z.array(z.string()).optional(),
    foreignTables: z.array(z.string()).optional(),
    childTables: z.array(z.string()).optional(),
    isPivot: z.literal(true).optional(),
    hasOne: z.array(z.string()).optional(),
    hasMany: z.array(z.string()).optional(),
    belongsTo: z.array(z.string()).optional(),
    belongsToMany: z.array(z.string()).optional(),
    pivotRelationships: z.array(pivotRelationshipSchema).optional(),
  })
  .refine(
    (table) => {
      // Ensure at least one column is marked as primary key
      const hasPrimaryKey = table.columnsInfo.some((col) => col.primary_key);
      return hasPrimaryKey;
    },
    { message: 'Each table must have at least one primary key column' },
  )
  .refine(
    (table) => {
      // Ensure id column exists (follows relational schema best practices)
      const hasIdColumn = table.columnsInfo.some(
        (col) => col.column_name === 'id',
      );
      return hasIdColumn;
    },
    { message: "Each table must have an 'id' column" },
  );

/**
 * Zod schema for validating the complete schemaInfo array
 */
export const schemaInfoArraySchema = z
  .array(schemaInfoSchema)
  .min(1, 'Schema must contain at least one table')
  .refine(
    (tables) => {
      // Check for duplicate table names
      const tableNames = tables.map((t) => t.tableName);
      const uniqueNames = new Set(tableNames);
      return tableNames.length === uniqueNames.size;
    },
    { message: 'Duplicate table names found in schema' },
  )
  .refine(
    (tables) => {
      // Validate foreign key references point to existing tables
      const tableNames = new Set(tables.map((t) => t.tableName));
      for (const table of tables) {
        for (const col of table.columnsInfo) {
          if (col.foreign_key) {
            if (!tableNames.has(col.foreign_key.foreign_table_name)) {
              return false;
            }
          }
        }
      }
      return true;
    },
    { message: 'Foreign key references a non-existent table' },
  )
  .refine(
    (tables) => {
      // Validate relationship references point to existing tables
      const tableNames = new Set(tables.map((t) => t.tableName));
      for (const table of tables) {
        const relationships = [
          ...(table.hasOne ?? []),
          ...(table.hasMany ?? []),
          ...(table.belongsTo ?? []),
          ...(table.belongsToMany ?? []),
          ...(table.foreignTables ?? []),
          ...(table.childTables ?? []),
        ];
        for (const ref of relationships) {
          if (!tableNames.has(ref)) {
            return false;
          }
        }
      }
      return true;
    },
    { message: 'Relationship references a non-existent table' },
  );

export type SchemaInfoArray = z.infer<typeof schemaInfoArraySchema>;
export type SchemaInfo = z.infer<typeof schemaInfoSchema>;
export type ColumnInfo = z.infer<typeof columnInfoSchema>;

/**
 * Validation result with detailed error information
 */
export interface IValidationResult {
  success: boolean;
  data?: SchemaInfoArray;
  errors?: {
    path: string;
    message: string;
  }[];
}

/**
 * Validates a schemaInfo array and returns detailed results
 */
export function validateSchemaInfo(data: unknown): IValidationResult {
  const result = schemaInfoArraySchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  // Zod 4 uses result.error.issues
  const issues = result.error.issues;
  return {
    success: false,
    errors: Array.isArray(issues)
      ? issues.map((err) => ({
          path: Array.isArray(err.path) ? err.path.join('.') : '',
          message: err.message,
        }))
      : [{ path: '', message: 'Validation failed' }],
  };
}

/**
 * Parses and validates schemaInfo from a JSON string
 */
export function parseAndValidateSchemaInfo(
  jsonString: string,
): IValidationResult {
  try {
    const parsed: unknown = JSON.parse(jsonString);
    return validateSchemaInfo(parsed);
  } catch {
    return {
      success: false,
      errors: [{ path: '', message: 'Invalid JSON format' }],
    };
  }
}

/**
 * Extracts schemaInfo JSON from AI response text
 * Tries compact format first, then JSON formats
 */
export function extractSchemaInfoFromResponse(
  responseText: string,
): string | null {
  // Primary: Match hidden HTML comment format <!--schemaInfo:[...]-->
  const hiddenSchemaRegex = /<!--schemaInfo:([\s\S]*?)-->/;
  const hiddenMatch = hiddenSchemaRegex.exec(responseText);

  if (hiddenMatch?.[1] !== undefined) {
    return hiddenMatch[1].trim();
  }

  // Fallback 1: Match ```json:schemaInfo ... ``` blocks
  const schemaInfoRegex = /```json:schemaInfo\s*([\s\S]*?)```/;
  const match = schemaInfoRegex.exec(responseText);

  if (match?.[1] !== undefined) {
    return match[1].trim();
  }

  // Fallback 2: try to match regular ```json blocks that contain schemaInfo-like content
  const jsonRegex = /```json\s*([\s\S]*?)```/;
  const jsonMatch = jsonRegex.exec(responseText);

  if (jsonMatch?.[1] !== undefined) {
    const content = jsonMatch[1].trim();
    // Check if it looks like a schemaInfo array
    if (content.startsWith('[') && content.includes('tableName')) {
      return content;
    }
  }

  return null;
}

/**
 * Check if text contains compact schema format
 * Compact format uses <@@SCHEMA@@>...<@@/SCHEMA@@> tags
 */
export function hasCompactSchema(text: string): boolean {
  return text.includes('<@@SCHEMA@@>');
}

/**
 * Removes hidden schemaInfo from text for display
 * Handles both compact format (<@@SCHEMA@@>) and JSON format (<!--schemaInfo:-->)
 */
export function removeHiddenSchemaFromText(text: string): string {
  return text
    .replace(/<!--schemaInfo:[\s\S]*?-->/g, '')
    .replace(/<@@SCHEMA@@>[\s\S]*?<@@\/SCHEMA@@>/g, '')
    .trim();
}

/**
 * Type mapping for compact format
 */
const COMPACT_TYPE_MAP: Partial<
  Record<string, 'string' | 'number' | 'boolean' | 'Date' | 'object'>
> = {
  s: 'string',
  n: 'number',
  b: 'boolean',
  D: 'Date',
  o: 'object',
};

/**
 * Parse a single column definition from compact format
 * Format: name:type?!u#pk>fk_table
 * - :s = string, :n = number, :b = boolean, :D = Date, :o = object
 * - ? = nullable
 * - !u = unique
 * - #pk = primary key
 * - >table = foreign key to table.id
 */
function parseCompactColumn(colDef: string): ColumnInfo | null {
  // Match: column_name:type[?][!u][#pk][>fk_table]
  const colRegex =
    /^([a-z][a-z0-9_]*):([snbDo])(\?)?(!u)?(#pk)?(>[a-z][a-z0-9_]*)?$/;
  const match = colRegex.exec(colDef);

  if (match === null) {
    return null;
  }

  // Destructure match results - groups 1 and 2 are required by the regex pattern
  const [, columnName, typeChar, nullableFlag, uniqueFlag, pkFlag, fkMatch] =
    match;
  const isNullable = nullableFlag === '?';
  const isUnique = uniqueFlag === '!u';
  const isPrimaryKey = pkFlag === '#pk';

  const mappedType = COMPACT_TYPE_MAP[typeChar];
  if (mappedType === undefined) {
    return null;
  }

  const column: ColumnInfo = {
    column_name: columnName,
    data_type: mappedType,
    is_nullable: isNullable ? 'YES' : 'NO',
  };

  if (isPrimaryKey) {
    column.primary_key = true;
  }

  if (isUnique) {
    column.unique = true;
  }

  if (fkMatch) {
    const fkTable = fkMatch.slice(1); // Remove leading '>'
    column.foreign_key = {
      foreign_table_name: fkTable,
      foreign_column_name: 'id',
    };
  }

  return column;
}

/**
 * Parse a single table definition from compact format
 * Format: @table_name:col1,col2,...|<belongsTo|>hasMany
 */
function parseCompactTable(tableDef: string): SchemaInfo | null {
  // Split by | to separate columns from relationships
  const parts = tableDef.split('|');
  // parts[0] always exists after split (could be empty string)
  const [mainPart] = parts;

  if (!mainPart.startsWith('@')) {
    return null;
  }

  // Parse table name and columns
  const colonIndex = mainPart.indexOf(':');
  if (colonIndex === -1) {
    return null;
  }

  const tableName = mainPart.slice(1, colonIndex); // Remove leading '@'
  const columnsStr = mainPart.slice(colonIndex + 1);

  if (tableName.length === 0 || columnsStr.length === 0) {
    return null;
  }

  // Parse columns
  const columnDefs = columnsStr.split(',');
  const columns: ColumnInfo[] = [];

  for (const colDef of columnDefs) {
    const trimmed = colDef.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const column = parseCompactColumn(trimmed);
    if (column === null) {
      return null; // Invalid column format
    }
    columns.push(column);
  }

  if (columns.length === 0) {
    return null;
  }

  const table: SchemaInfo = {
    tableName,
    columnsInfo: columns,
  };

  // Parse relationships from remaining parts
  for (let i = 1; i < parts.length; i++) {
    const relPart = parts[i];
    if (relPart.length < 2) {
      continue;
    }

    const relType = relPart[0];
    const relTables = relPart
      .slice(1)
      .split(',')
      .filter((t) => t.length > 0);

    if (relTables.length === 0) {
      continue;
    }

    if (relType === '<') {
      table.belongsTo = relTables;
    } else if (relType === '>') {
      table.hasMany = relTables;
    } else if (relType === '^') {
      table.hasOne = relTables;
    } else if (relType === '*') {
      table.belongsToMany = relTables;
    }
  }

  return table;
}

/**
 * Parse compact schema format
 * Format:
 * <@@SCHEMA@@>
 * @table1:col1:type,col2:type|>hasMany|<belongsTo
 * @table2:col1:type,col2:type
 * <@@/SCHEMA@@>
 */
export function parseCompactSchema(text: string): SchemaInfoArray | null {
  // Extract compact schema block
  const compactRegex = /<@@SCHEMA@@>([\s\S]*?)<@@\/SCHEMA@@>/;
  const match = compactRegex.exec(text);

  if (match?.[1] === undefined) {
    return null;
  }

  const schemaContent = match[1].trim();
  if (schemaContent.length === 0) {
    return null;
  }

  // Split by newlines or by @
  const tableLines = schemaContent
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('@'));

  if (tableLines.length === 0) {
    return null;
  }

  const tables: SchemaInfo[] = [];

  for (const line of tableLines) {
    const table = parseCompactTable(line);
    if (table === null) {
      return null; // Invalid table format
    }
    tables.push(table);
  }

  // Validate the result
  const validationResult = schemaInfoArraySchema.safeParse(tables);
  if (!validationResult.success) {
    return null;
  }

  return validationResult.data;
}

/**
 * Validates schemaInfo extracted from AI response
 * Tries compact format first, then falls back to JSON format
 */
export function validateSchemaInfoFromResponse(
  responseText: string,
): IValidationResult & { extracted: boolean } {
  // Try compact format first (saves tokens)
  if (hasCompactSchema(responseText)) {
    const compactResult = parseCompactSchema(responseText);
    if (compactResult !== null) {
      return {
        success: true,
        extracted: true,
        data: compactResult,
      };
    }
  }

  // Fall back to JSON format
  const extracted = extractSchemaInfoFromResponse(responseText);

  if (extracted === null) {
    return {
      success: false,
      extracted: false,
      errors: [{ path: '', message: 'No schema found in response' }],
    };
  }

  const result = parseAndValidateSchemaInfo(extracted);
  return {
    ...result,
    extracted: true,
  };
}
