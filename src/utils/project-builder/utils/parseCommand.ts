import { ACTION_FLAGS } from '@/utils/project-builder/constants/actionFlags.ts';
import type { IActionFlags } from '@/utils/project-builder/interfaces/interfaces.ts';

// Flag prefix used for all command options
const FLAG_PREFIX = '--';

const parseConditions = (value: string): string[] => {
  const trimmedValue = value.trim();
  if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
    return trimmedValue
      .slice(1, -1)
      .split(',')
      .map((condition) => condition.trim())
      .filter(Boolean);
  }
  return trimmedValue.length > 0 ? [trimmedValue] : [];
};

const parseQuotedOrRawValue = (value: string): string => {
  const trimmedValue = value.trim();
  const match = /^"([^"]+)"$|^'([^']+)'$/.exec(trimmedValue);
  return match ? match[1] || match[2] : trimmedValue;
};

export const parseCommand = (
  command: string,
): { command: string; options: IActionFlags } => {
  const [mainCommandPart, ...optionParts] = command.split(FLAG_PREFIX);
  // Only remove parentheses at the start/end of the command, not inside placeholders
  // This preserves {{index(1)}} and {{timestamp('YYYY-MM-DD')}} syntax
  const mainCommand = mainCommandPart.trim().replace(/^\(|\)$/g, '');
  const options: IActionFlags = {};

  optionParts.forEach((part) => {
    const trimmedPart = part.trim();
    let key: string;
    let value: string;

    const equalsIndex = trimmedPart.indexOf('=');
    if (equalsIndex !== -1) {
      key = trimmedPart.substring(0, equalsIndex);
      value = trimmedPart.substring(equalsIndex + 1).trim();
    } else {
      const [firstPart, ...valueParts] = trimmedPart.split(' ');
      key = firstPart;
      value = valueParts.join(' ').trim();
    }

    switch (key) {
      case ACTION_FLAGS.CONDITIONS:
        if (value) {
          options[ACTION_FLAGS.CONDITIONS] = parseConditions(value);
        }
        break;

      case ACTION_FLAGS.TEMPLATE:
        if (value) {
          options[ACTION_FLAGS.TEMPLATE] = value;

          // Check if the template path is a relative path
          if (!value.startsWith('/')) {
            options[ACTION_FLAGS.IS_RELATIVE_PATH] = true;
          }
        }
        break;

      case ACTION_FLAGS.SCOPED:
        options[ACTION_FLAGS.SCOPED] = true;
        break;

      case ACTION_FLAGS.INCLUDE_TABLE:
        if (value) {
          options[ACTION_FLAGS.INCLUDE_TABLE] = parseQuotedOrRawValue(value);
        }
        break;

      case ACTION_FLAGS.EXCLUDE_TABLE:
        if (value) {
          options[ACTION_FLAGS.EXCLUDE_TABLE] = parseQuotedOrRawValue(value);
        }
        break;

      case ACTION_FLAGS.DATA_SOURCE:
        if (value) {
          options[ACTION_FLAGS.DATA_SOURCE] = parseQuotedOrRawValue(value);
        }
        break;

      case ACTION_FLAGS.FORMAT:
        if (value === 'false') {
          options[ACTION_FLAGS.FORMAT] = false;
        } else {
          options[ACTION_FLAGS.FORMAT] = true;
        }
        break;

      default:
        break;
    }
  });

  return { command: mainCommand, options };
};
