import config from '../../../config/config';
export const checkConditions = (conditions) => {
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
