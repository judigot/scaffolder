import { ACTION_FLAGS } from '@/utils/project-builder/constants/actionFlags.ts';
import { ICommandOptions } from '@/utils/project-builder/interfaces/interfaces.ts';

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
): { command: string; options: ICommandOptions } => {
  const [mainCommandPart, ...optionParts] = command.split('--');
  const mainCommand = mainCommandPart.trim().replace(/[()]/g, '');
  const options: ICommandOptions = {};

  optionParts.forEach((part) => {
    const [key, ...valueParts] = part.trim().split(' ');
    const value = valueParts.join(' ').trim();

    switch (key) {
      case ACTION_FLAGS.CONDITIONS:
        if (value) {
          options.conditions = parseConditions(value);
        }
        break;

      case ACTION_FLAGS.TEMPLATE:
        if (value) {
          options.template = value;
        }
        break;

      case ACTION_FLAGS.SCOPED:
        options.useRelatedTable = true;
        break;

      case ACTION_FLAGS.INCLUDE_TABLE:
        if (value) {
          options.includeTable = parseQuotedOrRawValue(value);
        }
        break;

      case ACTION_FLAGS.EXCLUDE_TABLE:
        if (value) {
          options.excludeTable = parseQuotedOrRawValue(value);
        }
        break;

      default:
        break;
    }
  });

  return { command: mainCommand, options };
};
