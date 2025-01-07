import { describe, it, expect } from 'vitest';
import identifySchema from '@/utils/identifySchema.ts';
import usersPostOneToOneSchema from '@/json-schemas/usersPostOneToOneSchema.ts';
import { useLaravel } from '@/frameworks/backend/laravel/useLaravel.ts';
import { oneToOneExpectation } from '@/tests/folder-structure/laravel/one-to-one-expectation.ts';
import { oneToManyExpectation } from '@/tests/folder-structure/laravel/one-to-many-expectation.ts';
import usersPostsOneToManySchema from '@/json-schemas/usersPostsOneToManySchema.ts';
import POSSchema from '@/json-schemas/POSSchema.ts';
import { manyToManyExpectation } from '@/tests/folder-structure/laravel/many-to-many-expectation.ts';

describe('Laravel Folder Structure', () => {
  it('Should generate proper folder structure for one-to-one schema', () => {
    const usersPostOneToOneSchemaInfo = identifySchema(usersPostOneToOneSchema);
    const usersPostOneToOneFolderStructure = useLaravel({
      schemaInfo: usersPostOneToOneSchemaInfo,
    });
    expect(usersPostOneToOneFolderStructure).toStrictEqual(oneToOneExpectation);
  });

  it('Should generate proper folder structure for one-to-one schema', () => {
    const usersPostsOneToManySchemaInfo = identifySchema(
      usersPostsOneToManySchema,
    );
    const usersPostOneToManyFolderStructure = useLaravel({
      schemaInfo: usersPostsOneToManySchemaInfo,
    });
    expect(usersPostOneToManyFolderStructure).toStrictEqual(
      oneToManyExpectation,
    );
  });

  it('Should generate proper folder structure for one-to-one schema', () => {
    const POSSchemaInfo = identifySchema(POSSchema);
    const usersPostOneToOneFolderStructure = useLaravel({
      schemaInfo: POSSchemaInfo,
    });
    expect(usersPostOneToOneFolderStructure).toStrictEqual(
      manyToManyExpectation,
    );
  });
});
