import prettier from 'prettier';
import phpPlugin from '@prettier/plugin-php';

function formatCode(code: string) {
  return {
    php: prettier.format(code, {
      plugins: [phpPlugin],
      parser: 'php',
    }),
  };
}

export default formatCode;