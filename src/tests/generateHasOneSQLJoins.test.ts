import generateHasOneSQLJoins from '@/utils/generateSQLHasOneJoins.ts';
import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeWhitespace } from '@/helpers/stringHelper.ts';
import oneToOne from '@/schema-infos/oneToOne.ts';
import {
  setupFormStore,
  getTestConnectionString,
} from '@/tests/helpers/introspectTestHelpers.ts';

describe('generateHasOneSQLJoins', () => {
  beforeEach(() => {
    setupFormStore(getTestConnectionString('postgresql'));
  });

  const userPostOneToOneSchemaInfo = oneToOne;

  it('should generate correct one to one SQL JOIN queries for usersPostOneToOneSchema', () => {
    const joinQueries = generateHasOneSQLJoins(userPostOneToOneSchemaInfo).join(
      '',
    );
    expect(normalizeWhitespace(joinQueries)).toContain(
      `SELECT * FROM "user" LEFT JOIN "post" ON "user".user_id = "post".post_id;`,
    );
  });
});
