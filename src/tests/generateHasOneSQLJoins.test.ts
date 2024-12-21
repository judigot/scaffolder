import generateHasOneSQLJoins from '@/utils/generateSQLHasOneJoins.ts';
import identifySchema from '@/utils/identifySchema.ts';
import { describe, it, expect } from 'vitest';
import { normalizeWhitespace } from '@/helpers/stringHelper.ts';
import { usersPostOneToOneSchema } from '@/json-schemas/index.ts';

describe('generateHasOneSQLJoins', () => {
  const userPostOneToOneSchemaInfo = identifySchema(usersPostOneToOneSchema);

  it('should generate correct one to one SQL JOIN queries for usersPostOneToOneSchema', () => {
    const joinQueries = generateHasOneSQLJoins(userPostOneToOneSchemaInfo).join(
      '',
    );
    expect(normalizeWhitespace(joinQueries)).toContain(
      `SELECT * FROM "user" LEFT JOIN "post" ON "user".user_id = "post".post_id;`,
    );
  });
});
