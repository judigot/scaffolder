import identifyTSPrimitiveType from '@/utils/identifyTSPrimitiveType.ts';

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
export function haveSimilarObjects<T>(arr: T[]): boolean {
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
export function generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects(
  data: Record<string, unknown> | Record<string, unknown>[],
  interfaceName = 'IRootInterface',
  isChildObject = false,
  indentLevel = 1,
): string {
  const isArrayOfObjectsSimilarType =
    Array.isArray(data) && haveSimilarObjects(data);
  const isObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
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
    obj: Record<string, unknown>,
    optionalKeys?: Set<string>,
  ): string => {
    return Object.entries(obj)
      .map(([key, value]) => {
        const isOptional = optionalKeys?.has(key) === true ? '?' : '';

        if (value === null) {
          return `${indent}${key}${isOptional}: null;`;
        }

        if (value instanceof Date || isISODateString(value)) {
          return `${indent}${key}${isOptional}: Date;`;
        }

        if (Array.isArray(value)) {
          if (value.length === 0) {
            return `${indent}${key}${isOptional}: unknown[];`;
          }
          const arrayContent =
            generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects(
              value,
              key,
              true,
              indentLevel + 1,
            );
          return `${indent}${key}${isOptional}: ${arrayContent}[];`;
        }

        if (isObject(value)) {
          const nestedContent =
            generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects(
              value,
              key,
              true,
              indentLevel + 1,
            );
          return `${indent}${key}${isOptional}: ${nestedContent};`;
        }

        const valueType = identifyTSPrimitiveType(value);
        return `${indent}${key}${isOptional}: ${valueType};`;
      })
      .join('\n');
  };

  let interfaceContent = '';

  if (Array.isArray(data)) {
    if (isArrayOfObjectsSimilarType && data.length > 0) {
      const firstItem = data[0];
      if (isObject(firstItem)) {
        const optionalKeys = findOptionalKeys(data.filter(isObject));
        interfaceContent = `{\n${generateInterfaceContent(firstItem, optionalKeys)}\n${indent.slice(4)}}`;
      }
    } else if (data.length > 0) {
      const typeSummary = summarizeArrayOfObjectValueTypes(data);
      interfaceContent = `{\n${typeSummary
        .map(({ key, value_types }) => {
          const types = value_types
            .map((t) => {
              if (t === 'object') {
                const nestedObj = getObjectFromArray(data, key);
                if (nestedObj) {
                  return generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects(
                    nestedObj,
                    key,
                    true,
                    indentLevel + 1,
                  );
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
  } else if (isObject(data)) {
    interfaceContent = `{\n${generateInterfaceContent(data)}\n${indent.slice(4)}}`;
  }

  return isChildObject
    ? interfaceContent
    : `interface ${interfaceName} ${interfaceContent}`;
}

const objectVariable = {
  key: null,
  key1: 1,
  key2: '2023-06-18T18:17:19.000000Z',
  key3: new Date(),
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
interface IObjectVariable {
    key: null;
    key1: number;
    key2: string;
    key3: Date;
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
        child3?: boolean | string;
    }[];
    prop2: {
        child1: number;
        child2: number | Date;
    }[];
    prop3: {
        child1: number;
        child2: number | {
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
  generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects(
    objectVariable,
    'IObjectVariable',
  ),
);
