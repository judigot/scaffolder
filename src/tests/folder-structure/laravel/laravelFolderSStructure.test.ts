import { describe, it, expect } from 'vitest';
import identifySchema from '@/utils/identifySchema';
import { usersPostOneToOneSchema } from '@/json-schemas/usersPostOneToOneSchema';
import { folderStructure } from '@/utils/backend/laravel/folderStructure';
import { oneToOneExpectation } from '@/tests/folder-structure/laravel/one-to-one-expectation';
import { oneToManyExpectation } from '@/tests/folder-structure/laravel/one-to-many-expectation';
import { usersPostsOneToManySchema } from '@/json-schemas/usersPostsOneToManySchema';
import { POSSchema } from '@/json-schemas/POSSchema';
import { manyToManyExpectation } from '@/tests/folder-structure/laravel/many-to-many-expectation';

describe('Laravel Folder Structure', () => {
  it('Should generate proper folder structure for one-to-one schema', () => {
    const usersPostOneToOneSchemaInfo = identifySchema(usersPostOneToOneSchema);
    const usersPostOneToOneFolderStructure = folderStructure({
      schemaInfo: usersPostOneToOneSchemaInfo,
      isPreview: true,
    });
    expect(usersPostOneToOneFolderStructure).toStrictEqual(oneToOneExpectation);
  });

  it('Should generate proper folder structure for one-to-one schema', () => {
    const usersPostsOneToManySchemaInfo = identifySchema(
      usersPostsOneToManySchema,
    );
    const usersPostOneToManyFolderStructure = folderStructure({
      schemaInfo: usersPostsOneToManySchemaInfo,
      isPreview: true,
    });
    expect(usersPostOneToManyFolderStructure).toStrictEqual(
      oneToManyExpectation,
    );
  });

  it('Should generate proper folder structure for one-to-one schema', () => {
    const POSSchemaInfo = identifySchema(POSSchema);
    const usersPostOneToOneFolderStructure = folderStructure({
      schemaInfo: POSSchemaInfo,
      isPreview: true,
    });
    expect(usersPostOneToOneFolderStructure).toStrictEqual(
      manyToManyExpectation,
    );
  });
});
