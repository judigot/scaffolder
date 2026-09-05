import config from '@/config/config.ts';

export const checkConditions = (conditions: string[]): boolean => {
  return conditions.every((condition) => {
    const [key, value] = condition.split('=');
    if (key === 'hasUsers') {
      return String(config.users.hasUsers) === value;
    }
    if (key === 'isMultiTenancyEnabled') {
      return String(config.users.isMultiTenancyEnabled) === value;
    }
    return false;
  });
};
