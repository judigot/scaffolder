import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { changeCase } from '@/utils/common.ts';
import type { Replacements } from '@/utils/project-builder/interfaces/interfaces.ts';

// Auth table detection patterns
const USER_TABLE_PATTERNS = ['user', 'users', 'account', 'accounts'];
const SESSION_TABLE_PATTERNS = ['session', 'sessions'];
const OAUTH_TABLE_PATTERNS = [
  'oauth_account',
  'oauth_accounts',
  'oauthaccount',
  'oauthaccounts',
  'oauth',
];

// Common auth column patterns
const EMAIL_COLUMN_PATTERNS = ['email', 'email_address', 'user_email'];
const USERNAME_COLUMN_PATTERNS = ['username', 'user_name', 'login'];
const PASSWORD_COLUMN_PATTERNS = [
  'password_hash',
  'passwordhash',
  'password',
  'hashed_password',
];
const FIRST_NAME_PATTERNS = ['first_name', 'firstname', 'given_name'];
const LAST_NAME_PATTERNS = ['last_name', 'lastname', 'family_name', 'surname'];
const AVATAR_PATTERNS = ['avatar_url', 'avatar', 'profile_image', 'photo_url'];
const EMAIL_VERIFIED_PATTERNS = [
  'email_verified',
  'emailverified',
  'verified',
  'is_verified',
];

/**
 * Find a table matching any of the given patterns
 */
const findTableByPatterns = (
  schemaInfo: ISchemaInfo[],
  patterns: string[],
): ISchemaInfo | undefined => {
  return schemaInfo.find((t) =>
    patterns.includes(t.tableName.toLowerCase().replace(/_/g, '')),
  );
};

/**
 * Find a column matching any of the given patterns in a table
 */
const findColumnByPatterns = (
  table: ISchemaInfo,
  patterns: string[],
): string | undefined => {
  const col = table.columnsInfo.find((c) =>
    patterns.includes(c.column_name.toLowerCase()),
  );
  return col?.column_name;
};

/**
 * Generate case format replacements for a value
 */
const generateCaseReplacements = (
  prefix: string,
  value: string,
): Replacements => {
  const cases = changeCase(value);
  return {
    [prefix]: value,
    [`${prefix}CamelCase`]: cases.camelCase,
    [`${prefix}PascalCase`]: cases.pascalCase,
    [`${prefix}SnakeCase`]: cases.snakeCase,
    [`${prefix}KebabCase`]: cases.kebabCase,
    [`${prefix}CamelCaseSingular`]: cases.camelCaseSingular,
    [`${prefix}PascalCaseSingular`]: cases.pascalCaseSingular,
  };
};

/**
 * Get replacements for auth-related schema elements.
 * This provides template variables for user, session, and oauth tables.
 */
export const getReplacementsForAuth = (
  schemaInfo: ISchemaInfo[],
): Replacements => {
  const replacements: Replacements = {};

  // Find auth-related tables
  const userTable = findTableByPatterns(schemaInfo, USER_TABLE_PATTERNS);
  const sessionTable = findTableByPatterns(schemaInfo, SESSION_TABLE_PATTERNS);
  const oauthTable = findTableByPatterns(schemaInfo, OAUTH_TABLE_PATTERNS);

  // User table replacements
  replacements.hasUserTable = String(userTable !== undefined);
  if (userTable) {
    Object.assign(
      replacements,
      generateCaseReplacements('userTable', userTable.tableName),
    );

    // Find common auth columns
    const emailCol = findColumnByPatterns(userTable, EMAIL_COLUMN_PATTERNS);
    const usernameCol = findColumnByPatterns(
      userTable,
      USERNAME_COLUMN_PATTERNS,
    );
    const passwordCol = findColumnByPatterns(
      userTable,
      PASSWORD_COLUMN_PATTERNS,
    );
    const firstNameCol = findColumnByPatterns(userTable, FIRST_NAME_PATTERNS);
    const lastNameCol = findColumnByPatterns(userTable, LAST_NAME_PATTERNS);
    const avatarCol = findColumnByPatterns(userTable, AVATAR_PATTERNS);
    const emailVerifiedCol = findColumnByPatterns(
      userTable,
      EMAIL_VERIFIED_PATTERNS,
    );

    // Add column replacements
    if (emailCol !== undefined) {
      Object.assign(
        replacements,
        generateCaseReplacements('userEmailColumn', emailCol),
      );
    }
    if (usernameCol !== undefined) {
      Object.assign(
        replacements,
        generateCaseReplacements('userUsernameColumn', usernameCol),
      );
    }
    if (passwordCol !== undefined) {
      Object.assign(
        replacements,
        generateCaseReplacements('userPasswordColumn', passwordCol),
      );
    }
    if (firstNameCol !== undefined) {
      Object.assign(
        replacements,
        generateCaseReplacements('userFirstNameColumn', firstNameCol),
      );
    }
    if (lastNameCol !== undefined) {
      Object.assign(
        replacements,
        generateCaseReplacements('userLastNameColumn', lastNameCol),
      );
    }
    if (avatarCol !== undefined) {
      Object.assign(
        replacements,
        generateCaseReplacements('userAvatarColumn', avatarCol),
      );
    }
    if (emailVerifiedCol !== undefined) {
      Object.assign(
        replacements,
        generateCaseReplacements('userEmailVerifiedColumn', emailVerifiedCol),
      );
    }

    // Get primary key for user table
    const userPrimaryKey = userTable.columnsInfo.find(
      (c) => c.primary_key === true,
    );
    if (userPrimaryKey) {
      Object.assign(
        replacements,
        generateCaseReplacements('userPrimaryKey', userPrimaryKey.column_name),
      );
      replacements.userPrimaryKeyDataType = userPrimaryKey.data_type;
    }

    // Boolean flags for optional columns
    replacements.hasEmailColumn = String(emailCol !== undefined);
    replacements.hasUsernameColumn = String(usernameCol !== undefined);
    replacements.hasPasswordColumn = String(passwordCol !== undefined);
    replacements.hasFirstNameColumn = String(firstNameCol !== undefined);
    replacements.hasLastNameColumn = String(lastNameCol !== undefined);
    replacements.hasAvatarColumn = String(avatarCol !== undefined);
    replacements.hasEmailVerifiedColumn = String(
      emailVerifiedCol !== undefined,
    );
  }

  // Session table replacements
  replacements.hasSessionTable = String(sessionTable !== undefined);
  if (sessionTable) {
    Object.assign(
      replacements,
      generateCaseReplacements('sessionTable', sessionTable.tableName),
    );

    // Find user FK in session table
    const userFk = sessionTable.columnsInfo.find(
      (c) =>
        c.foreign_key?.foreign_table_name === userTable?.tableName ||
        ['user_id', 'userid', 'account_id', 'accountid'].includes(
          c.column_name.toLowerCase(),
        ),
    );
    if (userFk) {
      Object.assign(
        replacements,
        generateCaseReplacements('sessionUserColumn', userFk.column_name),
      );
    }

    // Find expires_at column
    const expiresCol = sessionTable.columnsInfo.find((c) =>
      ['expires_at', 'expiresat', 'expiry', 'valid_until'].includes(
        c.column_name.toLowerCase(),
      ),
    );
    if (expiresCol) {
      Object.assign(
        replacements,
        generateCaseReplacements(
          'sessionExpiresColumn',
          expiresCol.column_name,
        ),
      );
    }
  }

  // OAuth table replacements
  replacements.hasOAuthTable = String(oauthTable !== undefined);
  if (oauthTable) {
    Object.assign(
      replacements,
      generateCaseReplacements('oauthTable', oauthTable.tableName),
    );

    // Find provider ID column
    const providerIdCol = oauthTable.columnsInfo.find((c) =>
      ['provider_id', 'providerid', 'provider'].includes(
        c.column_name.toLowerCase(),
      ),
    );
    if (providerIdCol) {
      Object.assign(
        replacements,
        generateCaseReplacements(
          'oauthProviderIdColumn',
          providerIdCol.column_name,
        ),
      );
    }

    // Find provider user ID column
    const providerUserIdCol = oauthTable.columnsInfo.find((c) =>
      [
        'provider_user_id',
        'provideruserid',
        'provider_account_id',
        'external_id',
      ].includes(c.column_name.toLowerCase()),
    );
    if (providerUserIdCol) {
      Object.assign(
        replacements,
        generateCaseReplacements(
          'oauthProviderUserIdColumn',
          providerUserIdCol.column_name,
        ),
      );
    }

    // Find user FK in oauth table
    const oauthUserFk = oauthTable.columnsInfo.find(
      (c) =>
        c.foreign_key?.foreign_table_name === userTable?.tableName ||
        ['user_id', 'userid', 'account_id', 'accountid'].includes(
          c.column_name.toLowerCase(),
        ),
    );
    if (oauthUserFk) {
      Object.assign(
        replacements,
        generateCaseReplacements('oauthUserColumn', oauthUserFk.column_name),
      );
    }
  }

  // Overall auth system flags
  const hasAuth = userTable !== undefined && sessionTable !== undefined;
  const hasOAuth = oauthTable !== undefined;

  replacements.hasAuthTables = String(hasAuth);
  replacements.hasFullAuthSystem = String(hasAuth && hasOAuth);
  // Auth tables exist but no OAuth - for templates that need exclusive conditions
  replacements.hasAuthWithoutOAuth = String(hasAuth && !hasOAuth);

  return replacements;
};
