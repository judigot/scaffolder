import { APP_SETTINGS } from '@/constants.ts';
import { IColumnInfo, ISchemaInfo } from '@/interfaces/interfaces.ts';
import { changeCase } from '@/utils/common.ts';
import { getPrimaryKey } from '@/utils/common.ts';
import { IFile } from '@/components/FileViewer.tsx';
import { createFile, replacePlaceholder } from '@/helpers/stringHelper.ts';
import modelStructure from '@/frameworks/backend/laravel/_modelStructure.ts';

const fillableExemptions = ['created_at', 'updated_at'];

// Columns excluded from API GET responses to protect sensitive data or internal fields
const hiddenFields = [
  // Authentication Fields (users, user_accounts, customers)
  'password', // User password (hashed or plain)
  'hashed_password', // Alternate password column name
  'api_token', // API authentication token
  'auth_token', // General authentication token
  'access_token', // OAuth or session access token
  'refresh_token', // OAuth or session refresh token
  'remember_token', // Persistent login token
  'session_token', // Session-based authentication token

  // Security Fields (users, user_accounts)
  'secret_key', // User-specific secret key
  'encryption_key', // Encryption key for secure data
  'salt', // Password hashing salt
  'otp', // One-time password
  'pin', // Personal Identification Number (e.g., PIN for transactions)
  'security_questions', // Security question/answer pairs

  // Verification Tokens (users, customers)
  'email_verification_token', // Token for email verification
  'phone_verification_token', // Token for phone verification
  'reset_token', // Token for password reset
  'confirmation_token', // Token for account confirmation

  // Personal Identifiers (Sensitive PII) (users, customers)
  'ssn', // Social Security Number (e.g., US-based systems)
  'social_security_number', // Alternate SSN field name
  'tax_identification_number', // Tax ID (e.g., TIN)
  'government_id', // Government-issued ID (e.g., passport number)
  'national_id', // National identity number
  'biometric_data', // Biometric data (e.g., fingerprints, retina scans)

  // Financial Information (customers)
  'credit_card_number', // Credit card number
  'cvv', // Credit card CVV code
  'bank_account_number', // Bank account number
  'routing_number', // Bank routing number
  'iban', // International Bank Account Number
  'swift_code', // Bank SWIFT code

  // Metadata and Logs (users, user_accounts)
  'last_login_ip', // IP address of the last login
  'login_attempts', // Number of login attempts
  'failed_login_attempts', // Number of failed login attempts
  'last_login_at', // Timestamp of the last login
  'created_by', // User ID of who created the record
  'updated_by', // User ID of who updated the record
  'internal_notes', // Internal application notes (not user-facing)

  // Tokens and Identifiers (users, user_accounts)
  'uuid', // Universally Unique Identifier (if private)
  'idempotency_key', // For preventing duplicate requests
  'recovery_codes', // Backup codes for account recovery

  // Custom Field Names for User Tables (user_accounts, customers)
  'user_password', // Alternate field for passwords
  'customer_secret_key', // Alternate field for secret keys
  'account_token', // General account-related token
  'user_reset_token', // Reset token for user account
  'customer_last_login_ip', // Alternate field for last login IP

  // Deprecated or Legacy Fields (users)
  'legacy_password', // Old password field for migrations
];

const createFillable = (
  columnsInfo: IColumnInfo[],
  foreignKeys: string[],
): string => {
  const primaryKeyColumns = columnsInfo
    .filter((column) => column.primary_key)
    .map((column) => column.column_name);
  const fillableColumns = columnsInfo
    .filter(
      (column) =>
        !primaryKeyColumns.includes(column.column_name) &&
        !fillableExemptions.includes(column.column_name),
    )
    .map((column) => column.column_name)
    .concat(foreignKeys)
    .filter((value, index, self) => self.indexOf(value) === index);

  return fillableColumns.map((column) => `'${column}'`).join(',\n        ');
};

export const createRelationships = (
  tableName: string,
  foreignKeys: string[],
  hasOne: string[],
  belongsToMany: string[],
  schemaInfo: ISchemaInfo[],
): string => {
  const parentPrimaryKey = schemaInfo
    .find((table) => table.tableName === tableName)
    ?.columnsInfo.find((column) => column.primary_key)?.column_name;

  const belongsToRelations = foreignKeys
    .map((foreignKey) => {
      const relationshipName = foreignKey.replace('_id', '');
      const relatedModel = changeCase(relationshipName).pascalCase;
      return replacePlaceholder({
        template: modelStructure.belongsTo,
        replacements: {
          relationshipName: changeCase(relationshipName).camelCase,
          relatedModel,
          foreignKey,
        },
      });
    })
    .join('\n\n');

  const hasManyRelations = schemaInfo
    .find((table) => table.tableName === tableName)
    ?.hasMany.filter((relatedTable) => {
      const relatedTableInfo = schemaInfo.find(
        (table) => table.tableName === relatedTable,
      );
      return (
        (relatedTableInfo?.pivotRelationships.some(
          (pivot) => pivot.relatedTable === tableName,
        ) ??
          false) ||
        !(relatedTableInfo?.isPivot ?? false)
      );
    })
    .map((relatedTable) => {
      const childPrimaryKey = schemaInfo
        .find((table) => table.tableName === relatedTable)
        ?.columnsInfo.find((column) => column.primary_key)?.column_name;

      if (childPrimaryKey != null && parentPrimaryKey != null) {
        return replacePlaceholder({
          template: modelStructure.hasMany,
          replacements: {
            relationshipName: changeCase(relatedTable).camelCase,
            relatedModel: changeCase(relatedTable).pascalCase,
            foreignKey: parentPrimaryKey,
          },
        });
      }
      return '';
    })
    .join('\n\n');

  const hasOneRelations = hasOne
    .map((relatedTable) => {
      return replacePlaceholder({
        template: modelStructure.hasOne,
        replacements: {
          relationshipName: changeCase(relatedTable).camelCase,
          relatedModel: changeCase(relatedTable).pascalCase,
          foreignKey: String(parentPrimaryKey),
        },
      });
    })
    .join('\n\n');

  const belongsToManyRelations = belongsToMany
    .map((relatedTable) => {
      const pivotTable = schemaInfo.find(
        (table) =>
          table.foreignTables.includes(relatedTable) &&
          table.foreignTables.includes(tableName),
      )?.tableName;

      if (pivotTable == null) {
        throw new Error(
          `Pivot table not found for ${tableName} and ${relatedTable}`,
        );
      }

      const primaryKey = getPrimaryKey({ tableName, schemaInfo });
      const relatedTableForeignKey = getPrimaryKey({
        tableName: relatedTable,
        schemaInfo,
      });

      return replacePlaceholder({
        template: modelStructure.belongsToMany,
        replacements: {
          relationshipName: changeCase(relatedTable).camelCase,
          relatedModel: changeCase(relatedTable).pascalCase,
          pivotTable,
          primaryKey,
          relatedTableForeignKey,
        },
      });
    })
    .join('\n\n');

  return [
    belongsToRelations,
    hasManyRelations,
    hasOneRelations,
    belongsToManyRelations,
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim();
};

const createModels = (schemaInfo: ISchemaInfo[]): IFile[] => {
  return schemaInfo
    .filter(({ isPivot }) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!APP_SETTINGS.excludePivotTableFiles) {
        return true;
      }
      return !isPivot;
    })
    .map((tableInfo) => {
      const {
        tableName,
        columnsInfo,
        foreignKeys,
        hasOne,
        hasMany,
        belongsToMany,
      } = tableInfo;
      const { pascalCase } = changeCase(tableName);
      const className = pascalCase;

      const fillable = createFillable(columnsInfo, foreignKeys);
      const relationships = createRelationships(
        tableName,
        foreignKeys,
        hasOne,
        belongsToMany,
        schemaInfo,
      );

      const primaryKeyColumn = columnsInfo.find(
        (column) => column.primary_key,
      )?.column_name;
      const primaryKey = `protected $primaryKey = '${String(primaryKeyColumn)}';`;

      const hiddenColumns = (() => {
        const columns = columnsInfo
          .filter((column) => hiddenFields.includes(column.column_name))
          .map((column) => `'${column.column_name}'`)
          .join(',\n');

        return `protected $hidden = [${columns}];`;
      })();

      const modelImports = [
        ...new Set([
          ...hasOne,
          ...hasMany,
          ...belongsToMany,
          ...foreignKeys.map((fk) => fk.replace('_id', '')),
        ]),
      ]
        .sort()
        .map(
          (relatedTable) =>
            `use App\\Models\\${changeCase(relatedTable).pascalCase};`,
        )
        .join('\n');

      const content = createFile({
        template: modelStructure.modelTemplate,
        replacements: {
          modelImports,
          className,
          tableName,
          primaryKey,
          hiddenColumns,
          fillable,
          relationships,
        },
      });

      return {
        type: 'file',
        name: `${className}.php`,
        content,
      };
    });
};

export default createModels;
