import { toPascalCase } from '@/helpers/toPascalCase';
import { ISchemaInfo } from '@/interfaces/interfaces';

export const generateModelSpecificMethods = ({
  schemaInfo,
  fileToGenerate,
}: {
  schemaInfo: ISchemaInfo;
  fileToGenerate: string;
}): string => {
  const { table, hasOne, hasMany } = schemaInfo;
  const className = toPascalCase(table);
  let methods = '';

  // Generate methods for hasOne relationships
  hasOne.forEach((relatedTable) => {
    const relatedClass = toPascalCase(relatedTable);

    if (fileToGenerate === 'repository') {
      methods += `
      /**
       * Get the related ${relatedClass}.
       *
       * @param int $id
       * @return ${relatedClass}|null
       */
      public function get${relatedClass}(int $id): ?${relatedClass}
      {
          return $this->model->find($id)?->${relatedTable};
      }
      `;
    }

    if (fileToGenerate === 'interface') {
      methods += `
      /**
       * Get the related ${relatedClass}.
       *
       * @param int $id
       * @return ${relatedClass}|null
       */
      public function get${relatedClass}(int $id): ?${relatedClass};
      `;
    }
  });

  // Generate methods for hasMany relationships
  hasMany.forEach((relatedTable) => {
    const relatedClass = toPascalCase(relatedTable);

    if (fileToGenerate === 'repository') {
      methods += `
      /**
       * Get ${relatedTable} for a given ${className}.
       *
       * @param int $id
       * @return Collection
       */
      public function get${relatedClass}s(int $id): Collection
      {
          return $this->model->find($id)?->${relatedTable}s ?? collect();
      }
      `;
    }

    if (fileToGenerate === 'interface') {
      methods += `
      /**
       * Get ${relatedTable} for a given ${className}.
       *
       * @param int $id
       * @return Collection
       */
      public function get${relatedClass}s(int $id): Collection;
      `;
    }
  });

  // Generate methods for foreign key relationships
  schemaInfo.columnsInfo.forEach((column) => {
    if (column.foreign_key) {
      const foreignKeyName = toPascalCase(column.column_name);

      if (fileToGenerate === 'repository') {
        methods += `
        /**
         * Find ${className} by ${column.column_name}.
         *
         * @param int $${column.column_name}
         * @return ${className}|null
         */
        public function findBy${foreignKeyName}(int $${column.column_name}): ?${className}
        {
            return $this->model->where('${column.column_name}', $${column.column_name})->first();
        }
        `;
      }

      if (fileToGenerate === 'interface') {
        methods += `
        /**
         * Find ${className} by ${column.column_name}.
         *
         * @param int $${column.column_name}
         * @return ${className}|null
         */
        public function findBy${foreignKeyName}(int $${column.column_name}): ?${className};
        `;
      }
    }
  });

  return methods;
};
