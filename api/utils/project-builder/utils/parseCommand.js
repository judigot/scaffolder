import { ACTION_FLAGS } from '../../../utils/project-builder/constants/actionFlags';
// Flag prefix used for all command options
const FLAG_PREFIX = '--';
const parseConditions = (value) => {
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
const parseQuotedOrRawValue = (value) => {
  const trimmedValue = value.trim();
  const match = /^"([^"]+)"$|^'([^']+)'$/.exec(trimmedValue);
  return match ? match[1] || match[2] : trimmedValue;
};
export const parseCommand = (command) => {
  const [mainCommandPart, ...optionParts] = command.split(FLAG_PREFIX);
  const mainCommand = mainCommandPart.trim().replace(/[()]/g, '');
  const options = {};
  optionParts.forEach((part) => {
    const [key, ...valueParts] = part.trim().split(' ');
    const value = valueParts.join(' ').trim();
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
      default:
        break;
    }
  });
  return { command: mainCommand, options };
};
