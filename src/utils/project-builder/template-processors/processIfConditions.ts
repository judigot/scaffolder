export const processIfConditions = (
  content: string,
  replacements: Record<string, string | string[]>,
): string => {
  // Process simple IF conditions without ENDIF
  const simpleIfPattern =
    /{%\s*IF\s+([^\s]+)\s+EQUALS\s+['"]?([^'"%{}]*)['"]?\s*%}([^{%]*){%\s*ENDIF\s*%}/g;
  content = content.replace(
    simpleIfPattern,
    (
      _match: string,
      variableName: string,
      value: string,
      ifContent: string,
    ) => {
      console.warn(
        `Processing IF condition: ${String(variableName)} EQUALS "${String(value)}" with content length ${String(ifContent.length)}`,
      );

      // Check if the variable exists
      if (!(variableName in replacements)) {
        console.warn(
          `Variable ${String(variableName)} not found in replacements`,
        );
        return '';
      }

      const variableValue =
        typeof replacements[variableName] === 'string'
          ? String(replacements[variableName])
          : '';

      console.warn(
        `Variable ${String(variableName)} has value "${String(variableValue)}", comparing with "${String(value)}"`,
      );

      return variableValue === value ? ifContent : '';
    },
  );

  // Process EQUALS with more complex content (may contain nested tags)
  const complexEqualsPattern =
    /{%\s*IF\s+([^\s]+)\s+EQUALS\s+['"]?([^'"%{}]*)['"]?\s*%}([\s\S]*?){%\s*ENDIF\s*%}/g;
  content = content.replace(
    complexEqualsPattern,
    (
      _match: string,
      variableName: string,
      value: string,
      ifContent: string,
    ) => {
      console.warn(
        `Processing complex IF condition: ${String(variableName)} EQUALS "${String(value)}" with content length ${String(ifContent.length)}`,
      );

      // Check if the variable exists
      if (!(variableName in replacements)) {
        console.warn(
          `Variable ${String(variableName)} not found in replacements`,
        );
        return '';
      }

      const variableValue =
        typeof replacements[variableName] === 'string'
          ? String(replacements[variableName])
          : '';

      console.warn(
        `Variable ${String(variableName)} has value "${String(variableValue)}", comparing with "${String(value)}"`,
      );

      return variableValue === value ? ifContent : '';
    },
  );

  // Process NOT EQUAL with more complex content
  const notEqualsPattern =
    /{%\s*IF\s+([^\s]+)\s+NOT\s+EQUAL\s+['"]?([^'"%{}]*)['"]?\s*%}([\s\S]*?){%\s*ENDIF\s*%}/g;
  content = content.replace(
    notEqualsPattern,
    (
      _match: string,
      variableName: string,
      value: string,
      ifContent: string,
    ) => {
      console.warn(
        `Processing NOT EQUAL condition: ${String(variableName)} NOT EQUAL "${String(value)}" with content length ${String(ifContent.length)}`,
      );

      // Check if the variable exists
      if (!(variableName in replacements)) {
        console.warn(
          `Variable ${String(variableName)} not found in replacements`,
        );
        return '';
      }

      const variableValue =
        typeof replacements[variableName] === 'string'
          ? String(replacements[variableName])
          : '';

      console.warn(
        `Variable ${String(variableName)} has value "${String(variableValue)}", comparing with "${String(value)}"`,
      );

      return variableValue !== value ? ifContent : '';
    },
  );

  // Process else condition format
  const elsePattern =
    /{%\s*IF\s+([^\s]+)\s+EQUALS\s+['"]?([^'"%{}]*)['"]?\s*%}([\s\S]*?){%\s*ELSE\s*%}([\s\S]*?){%\s*ENDIF\s*%}/g;
  content = content.replace(
    elsePattern,
    (
      _match: string,
      variableName: string,
      value: string,
      ifContent: string,
      elseContent: string,
    ) => {
      console.warn(
        `Processing IF/ELSE condition: ${String(variableName)} EQUALS "${String(value)}"`,
      );

      // Check if the variable exists
      if (!(variableName in replacements)) {
        console.warn(
          `Variable ${String(variableName)} not found in replacements`,
        );
        return elseContent; // Use else content if variable isn't found
      }

      const variableValue =
        typeof replacements[variableName] === 'string'
          ? String(replacements[variableName])
          : '';

      console.warn(
        `Variable ${String(variableName)} has value "${String(variableValue)}", comparing with "${String(value)}"`,
      );

      return variableValue === value ? ifContent : elseContent;
    },
  );

  return content;
};
