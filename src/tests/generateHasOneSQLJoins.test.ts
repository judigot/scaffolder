import generateHasOneSQLJoins from '@/utils/generateSQLHasOneJoins';
import identifySchema from '@/utils/identifySchema';
import { describe, it, expect } from 'vitest';
import { normalizeWhitespace } from '@/helpers/stringHelper';
import { usersPostOneToOneSchema } from '@/json-schemas';

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
