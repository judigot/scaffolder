import type { ParsedJSONSchema } from '@/interfaces/interfaces.ts';
import generateSQLInserts from '@/utils/generateSQLInserts.ts';

export interface IRowsParams {
  tableName?: string;
  format?: 'sql' | 'csv' | 'json';
  rows?: number;
  offset?: number;
  delimiter?: string;
  includeHeaders?: boolean;
  pretty?: boolean;
}

/**
 * Generate CSV format from row data
 */
const generateCSV = (data: ParsedJSONSchema, params: IRowsParams): string => {
  const delimiter = params.delimiter ?? ',';
  const includeHeaders = params.includeHeaders ?? true;
  let output = '';

  Object.entries(data).forEach(([tableName, records]) => {
    if (records.length === 0) {
      return;
    }

    // Add table name as header
    output += `${tableName}\n`;

    // Get column names from first record
    const firstRecord = records[0];
    const columnNames = Object.keys(firstRecord);

    // Add headers if requested
    if (includeHeaders) {
      output += `${columnNames.join(delimiter)}\n`;
    }

    // Add data rows
    records.forEach((record) => {
      const values = columnNames.map((col) => {
        const value = record[col];
        if (value === null || value === undefined) {
          return '';
        }
        // Escape quotes and wrap in quotes if contains delimiter or newline
        // Handle different value types properly
        let stringValue: string;
        if (typeof value === 'string') {
          stringValue = value;
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          stringValue = String(value);
        } else if (value instanceof Date) {
          stringValue = value.toISOString();
        } else {
          stringValue = JSON.stringify(value);
        }
        if (
          stringValue.includes(delimiter) ||
          stringValue.includes('\n') ||
          stringValue.includes('"')
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      output += `${values.join(delimiter)}\n`;
    });

    // Add separator between tables
    output += '\n';
  });

  return output.trim();
};

/**
 * Generate JSON format from row data
 */
const generateJSON = (data: ParsedJSONSchema, params: IRowsParams): string => {
  const pretty = params.pretty ?? false;

  if (pretty) {
    return JSON.stringify(data, null, 2);
  }
  return JSON.stringify(data);
};

/**
 * Apply pagination to row data
 */
const applyPagination = (
  data: ParsedJSONSchema,
  rows?: number,
  offset?: number,
): ParsedJSONSchema => {
  if (rows === undefined && offset === undefined) {
    return data;
  }

  const paginated: ParsedJSONSchema = {};

  Object.entries(data).forEach(([tableName, records]) => {
    const start = offset ?? 0;
    const end = rows !== undefined ? start + rows : records.length;
    paginated[tableName] = records.slice(start, end);
  });

  return paginated;
};

/**
 * Format row data according to specified parameters
 */
export const formatRowsData = (
  rowData: ParsedJSONSchema,
  params: IRowsParams = {},
): string => {
  // Apply pagination if specified
  const paginatedData = applyPagination(rowData, params.rows, params.offset);

  // If no data, return empty string
  if (Object.keys(paginatedData).length === 0) {
    return '';
  }

  const format = params.format ?? 'sql';

  switch (format) {
    case 'sql':
      return generateSQLInserts(paginatedData);
    case 'csv':
      return generateCSV(paginatedData, params);
    case 'json':
      return generateJSON(paginatedData, params);
    default:
      return generateSQLInserts(paginatedData);
  }
};

/**
 * Parse USE_ROWS parameters from string
 */
export const parseRowsParams = (params: string): IRowsParams => {
  if (!params || params.trim() === '') {
    return {};
  }

  const result: IRowsParams = {};
  const pairs = params.split(',').map((p) => p.trim());

  for (const pair of pairs) {
    const [key, value] = pair.split('=').map((s) => s.trim());

    switch (key) {
      case 'tableName':
        result.tableName = value;
        break;
      case 'format':
        if (value === 'sql' || value === 'csv' || value === 'json') {
          result.format = value;
        }
        break;
      case 'rows':
        result.rows = Number.parseInt(value, 10);
        if (Number.isNaN(result.rows)) {
          result.rows = undefined;
        }
        break;
      case 'offset':
        result.offset = Number.parseInt(value, 10);
        if (Number.isNaN(result.offset)) {
          result.offset = undefined;
        }
        break;
      case 'delimiter':
        // Handle escape sequences
        result.delimiter = value
          .replace(/\\t/g, '\t')
          .replace(/\\n/g, '\n')
          .replace(/\\,/g, ',');
        break;
      case 'includeHeaders':
        result.includeHeaders =
          value === 'true' || value === '1' || value === 'yes';
        break;
      case 'pretty':
        result.pretty = value === 'true' || value === '1' || value === 'yes';
        break;
      default:
        break;
    }
  }

  return result;
};
