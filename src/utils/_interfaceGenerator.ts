import identifyTSPrimitiveType from './identifyTSPrimitiveType';

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
  if (arr.length <= 1) return true;

  const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

  const getType = (value: unknown): string => {
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    return typeof value;
  };

  const compareStructure = (base: unknown, target: unknown): boolean => {
    const baseType = getType(base);
    const targetType = getType(target);

    if (baseType !== targetType) return false;

    if (baseType === 'object' && isObject(base) && isObject(target)) {
      const baseKeys = Object.keys(base);
      const targetKeys = Object.keys(target);

      if (baseKeys.length !== targetKeys.length) return false;

      return baseKeys.every(
        (key) => key in target && compareStructure(base[key], target[key]),
      );
    }

    if (baseType === 'array' && Array.isArray(base) && Array.isArray(target)) {
      if (base.length !== target.length) return false;

      return base.every((item, index) => compareStructure(item, target[index]));
    }

    return baseType === targetType;
  };

  const firstType = getType(arr[0]);
  const firstObj = arr[0];

  return arr.every((item) => {
    const itemType = getType(item);

    if (itemType !== firstType) return false;

    if (firstType === 'object' && isObject(firstObj) && isObject(item)) {
      return compareStructure(firstObj, item);
    }

    return firstType === itemType;
  });
}

/*
Prompt:
You can add code, but should not remove code. keep all the variables and parameters intact.
Only modify generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects. Keep the other functions intact.
Never remove this:
const isArrayOfObjectsSimilarType =
    Array.isArray(dataArray) && haveSimilarObjects(dataArray);
*/

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
 * @returns A string representing the TypeScript interface with nested types.
 */
export function generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects(
  data: Record<string, unknown> | Record<string, unknown>[],
  interfaceName = 'IRootInterface',
  isChildObject = false,
): string {
  const isObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  };

  const generateInterfaceContent = (obj: Record<string, unknown>): string => {
    return (
      Object.entries(obj)
        .map(([key, value]) => {
          const valueType =
            value === null ? 'null' : identifyTSPrimitiveType(value);

          if (value instanceof Date) {
            return `${key}: Date;`;
          }

          if (typeof value !== 'string') {
            if (Array.isArray(value)) {
              return `\n  ${key}: {${generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects(value, key, true)}}[];`; /* Array of similar objects */
            } else if (isObject(value)) {
              return `\n  ${key}: {${generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects(value, key, true)}};`; /* Recursion for nested objects */
            }
          }

          return `\n  ${key}: ${valueType};`;
        })
        .join('  ') + '\n'
    );
  };

  let interfaceContent = '';

  if (Array.isArray(data)) {
    if (haveSimilarObjects(data)) {
      interfaceContent =
        generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects(
          data[0],
          '',
          true,
        );
    } else {
      const typeSummary = summarizeArrayOfObjectValueTypes(data);
      interfaceContent = typeSummary
        .map(({ key, value_types }) => {
          const typeUnion = value_types.join(' | ');
          return `${key}: ${typeUnion};`;
        })
        .join('\n  ');
    }
  } else if (isObject(data)) {
    interfaceContent = generateInterfaceContent(data);
  }

  return isChildObject
    ? `  ${interfaceContent}`
    : `interface ${interfaceName} {  ${interfaceContent}}`;
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
interface IData {
  prop1: {
    child1: number;
    child2: number | string;
  }[];
}
*/

// eslint-disable-next-line no-console
/*prettier-ignore*/ (($= generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects(objectVariable, "IData"))=>{console.log(["string","number"].includes(typeof $)?$:JSON.stringify($,null,4));})();
