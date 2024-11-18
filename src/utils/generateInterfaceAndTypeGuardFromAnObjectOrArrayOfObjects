// Type mappings for generating TypeScript types
const typeMappings = {
  primaryKey: {
    typescript: 'number',
  },
  password: {
    typescript: 'string',
  },
  number: {
    typescript: 'number',
  },
  float: {
    typescript: 'number',
  },
  string: {
    typescript: 'string',
  },
  boolean: {
    typescript: 'boolean',
  },
  Date: {
    typescript: 'string', // Treat dates as strings for this example
  },
} as const;

export const generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects = ({
  interfaceName,
  data,
  typeMappings,
  isDateStringFormat,
}: {
  interfaceName: string;
  data: unknown;
  typeMappings: {
    primaryKey: {
      typescript: 'number';
    };
    password: {
      typescript: 'string';
    };
    number: {
      typescript: 'number';
    };
    float: {
      typescript: 'number';
    };
    string: {
      typescript: 'string';
    };
    boolean: {
      typescript: 'boolean';
    };
    Date: {
      typescript: 'Date';
    };
  };
  isDateStringFormat: boolean;
}): string => {
  /*
  Algorithm:
  Compile all the nested objects inside an array using analyzeObjectHierarchy. These will be used for generating the main exported interface.
  Example:
  export IData {
    key: string;
    nestedObject: *INestedObject interface body*
    nestedObject2: *INestedObject2 interface body*[]
  }
  
  The same array will be used for generating the child types and child type guards inside the main type guard.
  Example:
  // Main type guard
  export function isData(data: unknown): data is isData {
    if (Array.isArray(data)) {
      return data.every(isIJSONSchema);
    }
      // Start of child types. Iterate over the heirarchy array
      type INestedType = IData['NestedTypeKey'];
      // End of child types

      // Start of child type guards for the child types. Iterate over the heirarchy array
      
      // End of child type guards for the child types
  }

  If isDateStringFormat is true, i want all the string-formatted dates to be string:

  Example:
  created_at: '2023-06-18T10:17:19.000Z',
  It should be
  created_date: string;
  Also in the typeguard

  If isDateStringFormat is false then:
  created_date: string;
  Also in the typeguard
  */
  interface IHierarchyNode {
    key: string;
    level: number;
    value: unknown;
    children?: IHierarchyNode[];
  }

  const analyzeObjectHierarchy = (
    obj: Record<string, unknown>,
    level = 0,
  ): IHierarchyNode[] => {
    const hierarchy: IHierarchyNode[] = [];

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const node: IHierarchyNode = { key, level, value }; // Include the primitive value

        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            node.children = value.map((item, index) => ({
              key: `${key}[${index}]`,
              level: level + 1,
              value: item, // Include the array item as value
            }));
          } else {
            node.children = analyzeObjectHierarchy(
              value as Record<string, unknown>,
              level + 1,
            );
          }
        }

        hierarchy.push(node);
      }
    }

    return hierarchy;
  };

  const hierarchy = analyzeObjectHierarchy(data);

  function populateInterfaceProperties(element: IHierarchyNode): string {
    if (typeof element.value !== 'object') {
      return `${element.key}: ${typeof element.value};`;
    } else {
      if (Array.isArray(element.value)) {
        return `${element.key}: I${element.key.toUpperCase()}[];`;
      } else {
        return `${element.key}: I${element.key.toUpperCase()};`;
      }
    }
  }

  /**
   * Summarizes the value types of keys in an array of objects.
   *
   * @param data - The array of objects to summarize.
   * @returns An array of { key: string; value_types: string[]; } representing the value types of each key.
   */
  function summarizeArrayOfObjectValueTypes(data: Record<string, unknown>[]): {
    key: string;
    value_types: string[];
  }[] {
    const typeSummary: Record<string, Set<string>> = {};
    data.forEach((item) => {
      for (const key in item) {
        const value = item[key];
        let valueType: string;
        if (value === null) {
          valueType = 'null';
        } else if (value instanceof Date) {
          valueType = 'Date';
        } else if (typeof value === 'string') {
          valueType = 'string';
        } else if (typeof value === 'number') {
          valueType = Number.isInteger(value) ? 'number' : 'float';
        } else {
          valueType = typeof value;
        }
        if (!typeSummary[key]) {
          typeSummary[key] = new Set<string>();
        }
        typeSummary[key].add(valueType);
      }
    });
    return Object.entries(typeSummary).map(([key, valueTypes]) => ({
      key,
      value_types: Array.from(valueTypes),
    }));
  }

  /**
   * Checks if an array consists of similar objects, meaning all objects in the
   * array must have the same keys. If any element in the array is not an object,
   * or if the objects have different keys, the function returns false.
   * Returns true for empty arrays or arrays with a single object.
   *
   * @param arr - The array to check.
   * @returns A boolean indicating whether all objects in the array have similar keys.
   */
  function haveSimilarObjects<T>(arr: T[]): boolean {
    if (arr.length === 0 || arr.length === 1) {
      return true;
    }

    if (typeof arr[0] !== 'object' || arr[0] === null) {
      return false;
    }

    const firstKeys = Object.keys(arr[0]);

    return arr.every((obj) => {
      if (typeof obj !== 'object' || obj === null) {
        return false;
      }

      const keys = Object.keys(obj);
      return (
        keys.length === firstKeys.length &&
        keys.every((key) => firstKeys.includes(key))
      );
    });
  }

  return `
  export interface I${interfaceName} {
    ${(() => {
      return hierarchy
        .map(populateInterfaceProperties) // Use the helper function for consistency
        .join('\n    '); // Join the elements with a newline and indentation
    })()}
  }

  export function isI${interfaceName}(data: unknown): data is I${interfaceName} {
    if (Array.isArray(data)) {
      return data.every(isI${interfaceName});
    }
  }

  export function isI${interfaceName}Array(data: unknown): data is I${interfaceName}[] {
    return Array.isArray(data) && data.every(isI${interfaceName});
  }
  `;
};
