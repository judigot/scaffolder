import { APP_SETTINGS } from '../../../constants';
import { changeCase, getPrimaryKey } from '../../../utils/common';
import { createFile } from '../../../helpers/stringHelper';
import generateDomainCode from '../../../utils/generateDomainCode';
import modelStructure from '../../../frameworks/backend/laravel/_modelStructure';
// Columns excluded from API GET responses to protect sensitive data or internal fields
export const hiddenFields = [
  'password',
  'hashed_password',
  'api_token',
  'auth_token',
  'access_token',
  'refresh_token',
  'remember_token',
  'session_token',
  'secret_key',
  'encryption_key',
  'salt',
  'otp',
  'pin',
  'security_questions',
  'email_verification_token',
  'phone_verification_token',
  'reset_token',
  'confirmation_token',
  'ssn',
  'social_security_number',
  'tax_identification_number',
  'government_id',
  'national_id',
  'biometric_data',
  'credit_card_number',
  'cvv',
  'bank_account_number',
  'routing_number',
  'iban',
  'swift_code',
  'last_login_ip',
  'login_attempts',
  'failed_login_attempts',
  'last_login_at',
  'created_by',
  'updated_by',
  'internal_notes',
  'uuid',
  'idempotency_key',
  'recovery_codes',
  'user_password',
  'customer_secret_key',
  'account_token',
  'user_reset_token',
  'customer_last_login_ip',
  'legacy_password',
];
const fillableExemptions = ['created_at', 'updated_at'];
export const createFillable = (tableInfo) => {
  const primaryKeyColumns = tableInfo.columnsInfo
    .filter((column) => column.primary_key ?? false)
    .map((column) => column.column_name);
  return tableInfo.columnsInfo
    .filter(
      (column) =>
        !primaryKeyColumns.includes(column.column_name) &&
        !fillableExemptions.includes(column.column_name),
    )
    .map((column) => column.column_name)
    .concat(tableInfo.foreignKeys ?? [])
    .filter((value, index, self) => self.indexOf(value) === index)
    .map((column) => `'${column}'`)
    .join(',\n        ');
};
const createModels = (schemaInfo) => {
  return schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot),
    )
    .map((tableInfo) => {
      const { tableName, columnsInfo } = tableInfo;
      const { pascalCase: className } = changeCase(tableName);
      const primaryKeyColumn = getPrimaryKey({ tableName, schemaInfo });
      const primaryKey = `protected $primaryKey = '${primaryKeyColumn}';`;
      const hiddenColumns = columnsInfo
        .filter((column) => hiddenFields.includes(column.column_name))
        .map((column) => `'${column.column_name}'`)
        .join(',\n        ');
      // Generate domain methods with proper indentation
      const domainMethods = generateDomainCode({
        schemaInfo,
        tableInfo,
        tableName,
        codeToGenerate: 'modelContent',
      })
        .map((method) => method.trim())
        .filter((method) => method.length > 0)
        .join('\n\n    ');
      // Generate model imports
      const modelImports = [
        ...new Set([
          ...(tableInfo.hasOne ?? []),
          ...(tableInfo.hasMany ?? []),
          ...(tableInfo.belongsToMany ?? []),
          ...(tableInfo.foreignKeys ?? []).map((fk) => fk.replace('_id', '')),
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
          hiddenColumns: hiddenColumns ? hiddenColumns : '',
          fillable: createFillable(tableInfo),
          domainMethods: domainMethods ? `\n    ${domainMethods}\n` : '',
        },
      });
      return {
        type: 'file',
        name: `${className}.php`,
        content: content.trim(),
      };
    });
};
export default createModels;
