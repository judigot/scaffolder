import reactRefresh from 'eslint-plugin-react-refresh';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import noTypeAssertion from 'eslint-plugin-no-type-assertion';
import react from 'eslint-plugin-react';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import unicorn from 'eslint-plugin-unicorn';
import sonarjs from 'eslint-plugin-sonarjs';
import promise from 'eslint-plugin-promise';
import eslintComments from 'eslint-plugin-eslint-comments';
import regexp from 'eslint-plugin-regexp';
import perfectionist from 'eslint-plugin-perfectionist';

import { defineConfig, globalIgnores } from 'eslint/config';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// prettier-ignore
const isNextJs = (() => { try { const p = require(`${process.cwd()}/package.json`); return ( 'next' in (p.dependencies ?? {}) || 'next' in (p.devDependencies ?? {}) || [ 'next.config.js', 'next.config.mjs', 'next.config.ts', 'next.config.cjs', ].some((f) => require('fs').existsSync(f)) ); } catch { return false; } })();
// prettier-ignore
const nextConfigs = (() => { if (!isNextJs) return []; try { const nextVitals = require('eslint-config-next/core-web-vitals'); const nextTs = require('eslint-config-next/typescript'); return [...nextVitals, ...nextTs]; } catch { return []; } })();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig([
  globalIgnores([
    // Default ignores of eslint-config-next:
    '**/dist',
    '**/eslint.config.js',
    '**/vite.config.ts',
    '**/vitest.config.ts',
    '**/tailwind.config.js',
    '**/postcss.config.js',

    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react,
      'no-type-assertion': noTypeAssertion,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      unicorn,
      sonarjs,
      promise,
      'eslint-comments': eslintComments,
      regexp,
      perfectionist,
    },
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      ...(() =>
        isNextJs
          ? [reactRefresh.configs.next]
          : [
              importPlugin.flatConfigs.recommended,
              reactRefresh.configs.vite,
            ])(),
    ],

    languageOptions: {
      globals: {
        ...globals.browser,

        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        test: 'readonly',
        vi: 'readonly',
      },

      parser: tsParser,
      ecmaVersion: 12,
      sourceType: 'module',

      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },

        project: [
          './tsconfig.json',
          ...(() => {
            if (!isNextJs) {
              return ['./tsconfig.app.json', './tsconfig.node.json'];
            }
            return [];
          })(),
        ],
        tsconfigRootDir: __dirname,
      },
    },

    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true, // Ensures TypeScript types are always considered
        },
      },
    },

    rules: {
      'import/extensions': [
        'error',
        'ignorePackages', // Always require extensions in imports
        {
          ts: 'always', // Always require .ts extension for TypeScript files
          tsx: 'always', // Always require .tsx extension for React files
          index: 'never',
        },
      ],
      curly: ['error', 'all'],
      'no-type-assertion/no-type-assertion': 'error',
      'object-shorthand': ['error', 'always'],

      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
        },
      ],

      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: 'Enums are not allowed. Use object literals instead.',
        },
      ],

      'no-alert': ['error'],

      'no-console': [
        'error',
        {
          allow: ['warn', 'error'],
        },
      ],

      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': ['error'],

      'no-unused-vars': 'off', // Disable this base rule in favor of @typescript-eslint/no-unused-vars (recommended)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      'react/jsx-props-no-spreading': 'error',

      'react/jsx-filename-extension': [
        1,
        {
          extensions: ['.tsx'],
        },
      ],

      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react/jsx-pascal-case': 'error',

      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'function',
          modifiers: ['exported'],
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'class',
          format: ['PascalCase'],
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
          prefix: ['I'],
        },
      ],

      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: false, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', disallowTypeAnnotations: true },
      ],
      '@typescript-eslint/no-unnecessary-type-parameters': 'error',
      '@typescript-eslint/no-confusing-void-expression': [
        'error',
        { ignoreArrowShorthand: false, ignoreVoidOperator: false },
      ],
      '@typescript-eslint/no-floating-promises': [
        'error',
        { ignoreIIFE: false },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/prefer-readonly-parameter-types': [
        'error',
        { checkParameterProperties: true, ignoreInferredTypes: true },
      ],
      '@typescript-eslint/method-signature-style': ['error', 'property'],

      'import/no-cycle': ['error', { maxDepth: 1 }],
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/*.test.ts',
            '**/*.test.tsx',
            '**/setupTests.ts',
            '**/vitest.setup.ts',
          ],
        },
      ],
      'import/no-relative-packages': 'error',
      'import/no-useless-path-segments': 'error',
      'import/no-default-export': 'error',

      'react/jsx-no-leaked-render': ['error', { validStrategies: ['coerce'] }],
      'react/no-unstable-nested-components': 'error',
      'react/jsx-no-constructed-context-values': 'error',
      'react/no-array-index-key': 'error',
      'react/jsx-no-useless-fragment': 'error',
      'react/prop-types': 'off',

      'regexp/no-super-linear-backtracking': 'error',

      'sonarjs/no-all-duplicated-branches': 'error',
      'sonarjs/no-inverted-boolean-check': 'error',

      // 'unicorn/filename-case': [
      //   'error',
      //   { cases: { camelCase: true, pascalCase: true, kebabCase: true } },
      // ],
      'unicorn/no-null': 'off',

      'eslint-comments/disable-enable-pair': [
        'error',
        { allowWholeFile: true },
      ],
      'eslint-comments/no-unused-disable': 'error',

      complexity: ['error', { max: 15 }],
      'max-depth': ['error', 3],
      'max-params': ['error', 3],
      'max-nested-callbacks': ['error', 3],
      'max-lines-per-function': [
        'error',
        { max: 100, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  ...nextConfigs,
]);
