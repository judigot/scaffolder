export function generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects(options: {
  interfaceName: string;
  arrayOfObjectsVariableOrObject:
    | Record<string, unknown>
    | Record<string, unknown>[];
  typeMappings: Record<string, { typescript: string }>;
  isDateStringFormat: boolean;
}): string {
  interface IInterfaceDefinition {
    interfaceName: string;
    fields: Record<string, Set<string>>;
    isNested?: boolean;
  }

  function getInterfaceDefinition(
    data: unknown,
    interfaceName: string,
    interfaces: Map<string, IInterfaceDefinition>,
    typeMappings: Record<string, { typescript: string }>,
    isNested = false,
  ): void {
    if (interfaces.has(interfaceName)) return;

    const fields: Record<string, Set<string>> = {};

    if (Array.isArray(data)) {
      data.forEach((item: Record<string, unknown>) => {
        if (typeof item === 'object') {
          processObject(item, fields, interfaces, typeMappings);
        }
      });
    } else if (typeof data === 'object' && data !== null) {
      processObject(data, fields, interfaces, typeMappings);
    }

    interfaces.set(interfaceName, { interfaceName, fields, isNested });
  }

  function processObject(
    obj: object,
    fields: Record<string, Set<string>>,
    interfaces: Map<string, IInterfaceDefinition>,
    typeMappings: Record<string, { typescript: string }>,
  ): void {
    Object.entries(obj).forEach(([key, value]) => {
      const fieldType = determineFieldType(
        value,
        key,
        interfaces,
        typeMappings,
      );

      fields[key] ??= new Set();
      fields[key].add(fieldType);
    });
  }

  function determineFieldType(
    value: unknown,
    key: string,
    interfaces: Map<string, IInterfaceDefinition>,
    typeMappings: Record<string, { typescript: string }>,
  ): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'unknown[]'; // Handle empty arrays
      const elementType = determineFieldType(
        value[0],
        key,
        interfaces,
        typeMappings,
      );
      return `${elementType}[]`;
    } else if (typeof value === 'object') {
      const nestedInterfaceName = `I${capitalize(key)}`;
      getInterfaceDefinition(
        value,
        nestedInterfaceName,
        interfaces,
        typeMappings,
        true,
      );
      return nestedInterfaceName;
    } else {
      return mapTypeFromValue(value, key, typeMappings);
    }
  }

  function mapTypeFromValue(
    value: unknown,
    key: string,
    typeMappings: Record<string, { typescript: string }>,
  ): string {
    const type = typeof value;

    if (key in typeMappings) {
      return typeMappings[key].typescript;
    }

    if (type === 'number') return 'number';
    if (type === 'string') {
      if (
        !options.isDateStringFormat &&
        !isNaN(new Date(String(value)).getTime())
      ) {
        return 'Date';
      }
      return 'string';
    }

    if (type === 'boolean') return 'boolean';

    return 'unknown';
  }

  function generateInterfaceCodeForNestedObjects(
    interfaceDef: IInterfaceDefinition,
  ): string {
    const { interfaceName, fields } = interfaceDef;

    let code = `export interface ${interfaceName} {\n`;
    Object.entries(fields).forEach(([key, types]) => {
      code += `  ${key}: ${Array.from(types).join(' | ')};\n`;
    });
    code += `}`;
    return code;
  }

  function generateTypeGuardForNestedObjects(
    interfaceDef: IInterfaceDefinition,
    interfaces: Map<string, IInterfaceDefinition>,
  ): string {
    const { interfaceName, fields } = interfaceDef;

    let code = `export function is${interfaceName}(data: unknown): data is ${interfaceName} {\n`;

    // Define inline type guard functions for nested objects (e.g., isUser, isPost)
    interfaces.forEach((nestedInterfaceDef) => {
      if (nestedInterfaceDef.isNested ?? false) {
        code += `  type I${capitalize(nestedInterfaceDef.interfaceName.slice(1))} = ${interfaceName}['${nestedInterfaceDef.interfaceName.slice(1).toLowerCase()}'][number];\n`;
        code += `  function is${capitalize(nestedInterfaceDef.interfaceName.slice(1))}(data: unknown): data is I${capitalize(nestedInterfaceDef.interfaceName.slice(1))} {\n`;
        code += `    if (data === null || typeof data !== 'object') return false;\n`;

        Object.keys(nestedInterfaceDef.fields).forEach((key) => {
          code += `    if (!('${key}' in data)) return false;\n`;
        });

        Object.entries(nestedInterfaceDef.fields).forEach(([key, types]) => {
          code += `    if (!(${Array.from(types)
            .map((type) => generateTypeCheck(type, key))
            .join(' && ')})) return false;\n`;
        });

        code += `    return true;\n`;
        code += `  }\n`;
      }
    });

    // Main type guard function for the root interface
    code += `  if (data === null || typeof data !== 'object') return false;\n`;
    Object.keys(fields).forEach((key) => {
      code += `  if (!('${key}' in data)) return false;\n`;
    });

    Object.entries(fields).forEach(([key, types]) => {
      code += `  if (!(${Array.from(types)
        .map((type) => generateTypeCheck(type, key))
        .join(' || ')})) return false;\n`;
    });

    code += `  return true;\n}`;
    return code;
  }

  function generateTypeCheck(type: string, key: string): string {
    if (type === 'null') {
      return `data.${key} === null`;
    } else if (type === 'string') {
      return `typeof data.${key} === 'string'`;
    } else if (type.endsWith('[]')) {
      const elementType = type.slice(0, -2);
      if (elementType.startsWith('I')) {
        return `Array.isArray(data.${key}) && data.${key}.every(is${elementType.slice(1)})`;
      }
      return `Array.isArray(data.${key}) && data.${key}.every(item => typeof item === '${elementType}')`;
    } else if (type === 'Date') {
      /* Check if the date string is valid */
      return `typeof data.${key} === 'string' && !isNaN(Date.parse(data.${key}))`;
    } else {
      return `typeof data.${key} === '${type}'`;
    }
  }

  function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  const { interfaceName, arrayOfObjectsVariableOrObject, typeMappings } =
    options;

  const interfaces = new Map<string, IInterfaceDefinition>();
  const mainInterfaceName = `I${capitalize(interfaceName)}`;

  getInterfaceDefinition(
    arrayOfObjectsVariableOrObject,
    mainInterfaceName,
    interfaces,
    typeMappings,
  );

  let code = '';

  // Generate interfaces and type guards
  interfaces.forEach((interfaceDef) => {
    code += generateInterfaceCodeForNestedObjects(interfaceDef) + '\n\n';
    if (interfaceDef.interfaceName === mainInterfaceName) {
      code +=
        generateTypeGuardForNestedObjects(interfaceDef, interfaces) + '\n\n';
    }
  });

  // Generate array type guard for the main interface
  if (!(interfaces.get(mainInterfaceName)?.isNested ?? false)) {
    code += `
export function is${mainInterfaceName}Array(data: unknown): data is ${mainInterfaceName}[] {
  return Array.isArray(data) && data.every(is${mainInterfaceName});
}
`.trim();
  }

  return code.trim();
}
