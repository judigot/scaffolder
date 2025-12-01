import prettier from 'prettier';
import phpPlugin from '@prettier/plugin-php';

async function formatCode(code: string) {
  try {
    const formatted = await prettier.format(code, {
      plugins: [phpPlugin],
      parser: 'php',
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
    });

    return {
      php: formatted,
    };
  } catch (error) {
    console.error('Failed to format PHP code:', error);
    return {
      php: code,
    };
  }
}

export default formatCode;
