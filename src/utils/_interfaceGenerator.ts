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
  const typeSummary: Record<string, Set<string>> = {};
  data.forEach((item) => {
    for (const key in item) {
      const value = item[key];
      typeSummary[key] = new Set<string>();
      typeSummary[key].add(identifyTSPrimitiveType(value));
    }
  });
  return Object.entries(typeSummary).map(([key, valueTypes]) => ({
    key,
    value_types: Array.from(valueTypes),
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
  function generateInterfaceContent(
    obj: Record<string, unknown> | Record<string, unknown>[],
  ): string {
    if (Array.isArray(obj)) {
      const dataArray = obj;

      const isArrayOfObjectsSimilarType =
        Array.isArray(dataArray) && haveSimilarObjects(dataArray);

      if (isArrayOfObjectsSimilarType) {
        if (typeof dataArray[0] === 'object' && dataArray[0] !== null) {
          const typeSummary: Record<string, Set<string>> = {};

          dataArray.forEach((item) => {
            const itemObj = item;
            for (const key in itemObj) {
              const value = itemObj[key];
              if (!typeSummary[key]) {
                typeSummary[key] = new Set<string>();
              }

              if (Array.isArray(value)) {
                // Nested array
                const nestedType = generateInterfaceContent(value);
                typeSummary[key].add(`${nestedType}[]`);
              } else if (typeof value === 'object' && value !== null) {
                // Nested object
                const nestedType = generateInterfaceContent(
                  value as Record<string, unknown>,
                );
                typeSummary[key].add(`{\n  ${nestedType}\n}`);
              } else {
                typeSummary[key].add(identifyTSPrimitiveType(value));
              }
            }
          });

          // Generate interface content with correct formatting for union types
          const lines = [];
          for (const [key, types] of Object.entries(typeSummary)) {
            const typeStr = Array.from(types).join(' | ');
            lines.push(`${key}: ${typeStr};`);
          }

          const interfaceContent = lines.join('\n  ');

          return `{\n  ${interfaceContent}\n}[]`;
        } else {
          // Array of primitives
          const types = new Set<string>();
          dataArray.forEach((item) => {
            types.add(identifyTSPrimitiveType(item));
          });
          const typeStr = Array.from(types).join(' | ');
          return `${typeStr}[]`;
        }
      } else {
        // Items are not similar, generate union of types
        const itemTypes = dataArray.map((item) =>
          generateInterfaceContent(item),
        );
        const uniqueItemTypes = Array.from(new Set(itemTypes));
        const unionType = uniqueItemTypes.join(' | ');
        return `(${unionType})[]`;
      }
    } else if (typeof obj === 'object' && obj !== null) {
      const lines = [];

      for (const [key, value] of Object.entries(obj)) {
        let typeStr = '';

        if (Array.isArray(value)) {
          // Value is an array
          const dataArray = value as Record<string, unknown>[];

          const isArrayOfObjectsSimilarType =
            Array.isArray(dataArray) && haveSimilarObjects(dataArray);

          if (isArrayOfObjectsSimilarType) {
            // Process the array items to collect types for each key
            const itemType = generateInterfaceContent(dataArray);
            typeStr = itemType;
          } else {
            // Items are not similar, generate union of types
            const itemTypes = dataArray.map((item) =>
              generateInterfaceContent(item),
            );
            const uniqueItemTypes = Array.from(new Set(itemTypes));
            const unionType = uniqueItemTypes.join(' | ');
            typeStr = `(${unionType})[]`;
          }
        } else if (typeof value === 'object' && value !== null) {
          // Value is an object, process recursively
          const nestedType = generateInterfaceContent(
            value as Record<string, unknown>,
          );
          typeStr = `{\n  ${nestedType}\n}`;
        } else {
          // Value is a primitive, get its type
          typeStr = identifyTSPrimitiveType(value);
        }

        lines.push(`${key}: ${typeStr};`);
      }

      const interfaceContent = lines.join('\n  ');

      return interfaceContent;
    } else {
      // Value is a primitive
      return identifyTSPrimitiveType(obj);
    }
  }

  const interfaceContent = generateInterfaceContent(data);

  return isChildObject
    ? `{\n  ${interfaceContent}\n}`
    : `interface ${interfaceName} {\n  ${interfaceContent}\n}`;
}

// const objectVariable = {
//   key1: 1,
//   key2: 'Value',
// };

const objectVariable = {
  prop1: [
    {
      child1: 1,
      child2: 1,
    },
    {
      child1: 2,
      child2: 'Value',
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

/*prettier-ignore*/ (($= generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects(objectVariable, "IData"))=>{console.log(["string","number"].includes(typeof $)?$:JSON.stringify($,null,4));})();
