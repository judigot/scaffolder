import identifyTSPrimitiveType from '@/utils/identifyTSPrimitiveType.ts';
import { useMockDatabaseStore } from '@/useMockDatabaseStore.ts';
/**
 * Summarizes the value types of keys in an array of objects.
 *
 * @param data - The array of objects to summarize.
 * @returns An array of { key: string; value_types: string[]; } representing the value types of each key.
 */
export function summarizeArrayOfObjectValueTypes(
  data: Record<string, unknown>[],
): {
  key: string;
  value_types: string[];
}[] {
  const typeSummary = new Map<string, Set<string>>();

  data.forEach((item) => {
    Object.keys(item).forEach((key) => {
      const value = item[key];
      const valueType =
        value === null ? 'null' : identifyTSPrimitiveType(value);

      if (!typeSummary.has(key)) {
        typeSummary.set(key, new Set());
      }
      typeSummary.get(key)?.add(valueType);
    });
  });

  return Array.from(typeSummary.entries()).map(([key, valueSet]) => ({
    key,
    value_types: Array.from(valueSet),
  }));
}

/**
 * Strictly checks if an array consists of similar items. All items in the array
 * must have the same type. If they are objects, they must have identical keys
 * with values of matching types, including nested structures and arrays.
 *
 * @param arr - The array to check.
 * @returns A boolean indicating whether all items in the array are of the same type and structure.
 */
export function haveSimilarObjects(arr: unknown[]): boolean {
  if (arr.length <= 1) {
    return true;
  }

  const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

  const getType = (value: unknown): string => {
    if (Array.isArray(value)) {
      return 'array';
    }
    if (value instanceof Date) {
      return 'date';
    }
    return typeof value;
  };

  const compareStructure = (base: unknown, target: unknown): boolean => {
    const baseType = getType(base);
    const targetType = getType(target);

    if (baseType !== targetType) {
      return false;
    }

    if (baseType === 'object' && isObject(base) && isObject(target)) {
      const baseKeys = Object.keys(base);
      const targetKeys = Object.keys(target);

      if (baseKeys.length !== targetKeys.length) {
        return false;
      }

      return baseKeys.every(
        (key) => key in target && compareStructure(base[key], target[key]),
      );
    }

    if (baseType === 'array' && Array.isArray(base) && Array.isArray(target)) {
      if (base.length !== target.length) {
        return false;
      }

      return base.every((item, index) => compareStructure(item, target[index]));
    }

    return baseType === targetType;
  };

  const firstType = getType(arr[0]);
  const firstObj = arr[0];

  return arr.every((item) => {
    const itemType = getType(item);

    if (itemType !== firstType) {
      return false;
    }

    if (firstType === 'object' && isObject(firstObj) && isObject(item)) {
      return compareStructure(firstObj, item);
    }

    return firstType === itemType;
  });
}

/**
 * Generates a TypeScript interface from an object or array of objects with nested types.
 * Use isArrayOfObjectsSimilarType to use the shorthand { key: string | number }[] rather than { key: string } | { key: number }
 *
 * Examples:
 * roles: ['Admin', 'User'] = roles: string[]
 *
 * key2: [ { key1: 1, key2: 'Value', }, { key1: 1, key2: 'Value', }, ] = key2: { key1: number, key2: string, }[]
 *
 * @param data - The object or array of objects to generate the interface from.
 * @param interfaceName - The name of the root interface.
 * @param isChildObject - Indicates whether the current level is a nested object.
 * @param indentLevel - The level of indentation for nested objects.
 * @returns A string representing the TypeScript interface with nested types.
 */
export function generateInterface({
  data,
  interfaceName,
  isChildObject = false,
  indentLevel = 1,
  isDateStringFormat = false,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
  interfaceName: string;
  isChildObject?: boolean;
  indentLevel?: number;
  isDateStringFormat?: boolean;
}): string {
  const isArrayOfObjectsSimilarType =
    Array.isArray(data) && haveSimilarObjects(data);

  const isObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && !Array.isArray(value);
  };

  const indent = '    '.repeat(indentLevel);

  const isISODateString = (value: unknown): value is string => {
    if (typeof value !== 'string') {
      return false;
    }
    const isoDatePattern =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:?\d{2})?$/;
    return isoDatePattern.test(value);
  };

  const getObjectFromArray = (
    arr: Record<string, unknown>[],
    key: string,
  ): Record<string, unknown> | null => {
    const found = arr.find((item) => {
      const val = item[key];
      return isObject(val);
    });

    if (!found || !isObject(found[key])) {
      return null;
    }

    return found[key];
  };

  const findOptionalKeys = (
    objects: Record<string, unknown>[],
  ): Set<string> => {
    const allKeys = new Set<string>();
    const requiredKeys = new Set<string>();

    objects.forEach((obj) => {
      Object.keys(obj).forEach((key) => {
        allKeys.add(key);
        if (obj[key] !== undefined) {
          requiredKeys.add(key);
        }
      });
    });

    return new Set([...allKeys].filter((key) => !requiredKeys.has(key)));
  };

  const generateInterfaceContent = (
    obj: Record<string, unknown> | Record<string, unknown>[],
    optionalKeys?: Set<string>,
  ): string => {
    const getArrayElementType = (arr: unknown[]): string => {
      if (arr.length === 0) {
        return 'unknown';
      }

      // If all elements are primitives, return their union type
      const allPrimitives = arr.every(
        (item) =>
          item === null ||
          typeof item === 'string' ||
          typeof item === 'number' ||
          typeof item === 'boolean' ||
          item instanceof Date,
      );

      if (allPrimitives) {
        const types = new Set(
          arr.map((item) => {
            if (item === null) {
              return 'null';
            }
            if (item instanceof Date) {
              return 'Date';
            }
            return typeof item;
          }),
        );
        if (types.size === 1) {
          return Array.from(types)[0];
        }
        return Array.from(types).join(' | ');
      }

      // If all elements are arrays, handle nested arrays
      if (arr.every((item) => Array.isArray(item))) {
        const nestedArrays = arr.filter((item): item is unknown[] =>
          Array.isArray(item),
        );
        const flattenedType = getArrayElementType(nestedArrays.flat());
        return `${flattenedType}[]`;
      }

      // If some elements are objects, generate interface for them
      const objects = arr.filter(isObject);
      if (objects.length > 0) {
        const objectType = generateInterface({
          data: objects,
          interfaceName: 'item',
          isChildObject: true,
          indentLevel: indentLevel + 1,
          isDateStringFormat,
        });

        // If there are only objects, return just the object type
        if (objects.length === arr.length) {
          return objectType;
        }

        // Otherwise, include other types in the union
        const otherTypes = arr
          .filter((item) => !isObject(item))
          .map((item): string => {
            if (item === null) {
              return 'null';
            }
            if (item instanceof Date) {
              return 'Date';
            }
            if (Array.isArray(item)) {
              const elementType = getArrayElementType(item);
              return `${elementType}[]`;
            }
            return typeof item;
          });

        const uniqueTypes = new Set([objectType, ...otherTypes]);
        return Array.from(uniqueTypes).join(' | ');
      }

      // Handle mixed types including arrays
      const types = new Set(
        arr.map((item): string => {
          if (item === null) {
            return 'null';
          }
          if (item instanceof Date) {
            return 'Date';
          }
          if (Array.isArray(item)) {
            const elementType = getArrayElementType(item);
            return `${elementType}[]`;
          }
          return typeof item;
        }),
      );
      return Array.from(types).join(' | ');
    };

    return Object.entries(obj)
      .map(([key, value]) => {
        const isOptional = optionalKeys?.has(key) === true ? '?' : '';

        if (value === null) {
          return `${indent}${key}${isOptional}: null;`;
        }

        if (value instanceof Date) {
          return `${indent}${key}${isOptional}: Date;`;
        }

        if (typeof value === 'string' && isISODateString(value)) {
          return `${indent}${key}${isOptional}: ${isDateStringFormat ? 'Date' : 'string'};`;
        }

        if (Array.isArray(value)) {
          const elementType = getArrayElementType(value);
          return `${indent}${key}${isOptional}: ${elementType}[];`;
        }

        if (isObject(value)) {
          const nestedContent = generateInterface({
            data: value,
            interfaceName: key,
            isChildObject: true,
            indentLevel: indentLevel + 1,
            isDateStringFormat,
          });
          return `${indent}${key}${isOptional}: ${nestedContent};`;
        }

        const valueType = identifyTSPrimitiveType(value);
        const typeMappings = useMockDatabaseStore.getState().typeMappings;
        const isRecord = (value: unknown): value is Record<string, unknown> => {
          return (
            value !== null && typeof value === 'object' && !Array.isArray(value)
          );
        };

        let mappedType = valueType;
        if (
          typeMappings &&
          isRecord(typeMappings) &&
          valueType in typeMappings
        ) {
          const mapping = typeMappings[valueType];
          if (isRecord(mapping) && 'typescript' in mapping) {
            const tsType = mapping.typescript;
            if (typeof tsType === 'string') {
              mappedType = tsType;
            }
          }
        }

        return `${indent}${key}${isOptional}: ${mappedType};`;
      })
      .join('\n');
  };

  let interfaceContent = '';

  if (Array.isArray(data)) {
    if (isArrayOfObjectsSimilarType) {
      const firstItem = data[0];
      if (isObject(firstItem)) {
        const optionalKeys = findOptionalKeys(data.filter(isObject));
        interfaceContent = `{\n${generateInterfaceContent(firstItem, optionalKeys)}\n${indent.slice(4)}}`;
      }
    } else {
      const typeSummary = summarizeArrayOfObjectValueTypes(data);
      interfaceContent = `{\n${typeSummary
        .map(({ key, value_types }) => {
          const types = value_types
            .map((t) => {
              if (t === 'object') {
                const nestedObj = getObjectFromArray(data, key);
                if (nestedObj) {
                  return generateInterface({
                    data: nestedObj,
                    interfaceName: key,
                    isChildObject: true,
                    indentLevel: indentLevel + 1,
                    isDateStringFormat,
                  });
                }
                return 'Record<string, unknown>';
              }
              return t;
            })
            .join(' | ');
          return `${indent}${key}: ${types};`;
        })
        .join('\n')}\n${indent.slice(4)}}`;
    }
  }

  if (isObject(data)) {
    interfaceContent = `{\n${generateInterfaceContent(data)}\n${indent.slice(4)}}`;
  }

  return isChildObject
    ? interfaceContent
    : `export interface ${interfaceName} ${interfaceContent}`;
}

const objectVariable = {
  key: null,
  key1: 1,
  key2: '2023-06-18T18:17:19.000000Z',
  key3: new Date(),
  user: {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    isActive: true,
    createdAt: '2023-10-01T14:48:00.000Z',
    posts: [
      {
        id: 101,
        title: 'My First Post',
        content: 'This is the content of my first post.',
        tags: ['typescript', 'javascript'],
        createdAt: '2023-10-02T10:15:00.000Z',
        comments: [
          {
            id: 201,
            text: 'Great post!',
            author: 'Jane Smith',
            createdAt: '2023-10-03T11:30:00.000Z',
          },
          {
            id: 202,
            text: 'Thanks for sharing!',
            author: 'Bob Johnson',
            createdAt: '2023-10-04T09:45:00.000Z',
          },
        ],
      },
      {
        id: 102,
        title: 'Another Post',
        content: 'Here is some more content for another post.',
        tags: ['coding', 'react'],
        createdAt: '2023-10-05T12:20:00.000Z',
        comments: [],
      },
    ],
  },
  prop: {
    child1: 2,
    child2: {
      child1: 2,
      child2: new Date(),
    },
  },
  prop1: [
    {
      child1: 1,
      child2: 1,
    },
    {
      child1: 2,
      child2: 1,
      child3: false,
    },
    {
      child1: 2,
      child2: 1,
      child3: 'false',
    },
  ],
  prop2: [
    {
      child1: 1,
      child2: 1,
    },
    {
      child1: 2,
      child2: new Date(),
    },
  ],
  prop3: [
    {
      child1: 1,
      child2: 1,
    },
    {
      child1: 2,
      child2: {
        prop1: [
          {
            child1: 1,
            child2: 1,
          },
          {
            child1: 2,
            child2: 1,
          },
        ],
      },
    },
  ],
};

/*
Result should be:
export interface IObjectVariable {
  key: null;
  key1: number;
  key2: string;
  key3: Date;
  user: {
    id: number;
    name: string;
    email: string;
    isActive: boolean;
    createdAt: string;
    posts: {
      id: number;
      title: string;
      content: string;
      tags: string[];
      createdAt: string;
      comments: {
        id: number;
        text: string;
        author: string;
        createdAt: string;
      }[];
    }[];
  };
  prop: {
    child1: number;
    child2: {
      child1: number;
      child2: Date;
    };
  };
  prop1: {
    child1: number;
    child2: number;
    child3: boolean | string;
  }[];
  prop2: {
    child1: number;
    child2: number | Date;
  }[];
  prop3: {
    child1: number;
    child2:
      | number
      | {
          prop1: {
            child1: number;
            child2: number;
          }[];
        };
  }[];
}
*/

// eslint-disable-next-line no-console
console.log(
  generateInterface({
    interfaceName: 'IObjectVariable',
    data: objectVariable,
    isDateStringFormat: false,
  }),
);
