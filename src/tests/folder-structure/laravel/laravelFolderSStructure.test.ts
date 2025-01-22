/* eslint-disable @typescript-eslint/no-base-to-string */
import { describe, it, expect } from 'vitest';
import identifySchema from '@/utils/identifySchema.ts';
import usersPostOneToOneSchema from '@/json-schemas/usersPostOneToOneSchema.ts';
import { useLaravel } from '@/frameworks/backend/laravel/useLaravel.ts';
import { oneToOneExpectation } from '@/tests/folder-structure/laravel/one-to-one-expectation.ts';
import { oneToManyExpectation } from '@/tests/folder-structure/laravel/one-to-many-expectation.ts';
import usersPostsOneToManySchema from '@/json-schemas/usersPostsOneToManySchema.ts';
import POSSchema from '@/json-schemas/POSSchema.ts';
import { manyToManyExpectation } from '@/tests/folder-structure/laravel/many-to-many-expectation.ts';
import { normalizeWhitespace } from '@/helpers/stringHelper.ts';

describe('Laravel Folder Structure', () => {
  it('Should generate proper folder structure for one-to-one schema', () => {
    const usersPostOneToOneSchemaInfo = identifySchema(usersPostOneToOneSchema);
    const usersPostOneToOneFolderStructure = useLaravel({
      schemaInfo: usersPostOneToOneSchemaInfo,
    });
    expect(
      normalizeWhitespace(usersPostOneToOneFolderStructure.join('')),
    ).toStrictEqual(normalizeWhitespace(oneToOneExpectation.join('')));
  });

  it('Should generate proper folder structure for one-to-many schema', () => {
    const usersPostsOneToManySchemaInfo = identifySchema(
      usersPostsOneToManySchema,
    );
    const usersPostOneToManyFolderStructure = useLaravel({
      schemaInfo: usersPostsOneToManySchemaInfo,
    });
    expect(
      normalizeWhitespace(usersPostOneToManyFolderStructure.join('')),
    ).toStrictEqual(normalizeWhitespace(oneToManyExpectation.join('')));
  });

  it('Should generate proper folder structure for many-to-many schema', () => {
    const POSSchemaInfo = identifySchema(POSSchema);
    const usersPostOneToOneFolderStructure = useLaravel({
      schemaInfo: POSSchemaInfo,
    });
    expect(
      normalizeWhitespace(usersPostOneToOneFolderStructure.join('')),
    ).toStrictEqual(normalizeWhitespace(manyToManyExpectation.join('')));
  });
});
