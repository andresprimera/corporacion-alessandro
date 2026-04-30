import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import unicorn from 'eslint-plugin-unicorn';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    plugins: { unicorn },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      'no-console': 'error',
      'unicorn/filename-case': [
        'error',
        { case: 'kebabCase', ignore: ['\\.d\\.ts$'] },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'axios', message: 'Use the built-in fetch (or HttpService) — no axios.' },
            { name: 'lodash', message: 'Use native array/object methods.' },
            { name: 'lodash-es', message: 'Use native array/object methods.' },
            { name: 'uuid', message: 'Use crypto.randomUUID().' },
            { name: 'date-fns', message: 'Use native Date and Intl APIs.' },
            { name: 'dayjs', message: 'Use native Date and Intl APIs.' },
            { name: 'moment', message: 'Use native Date and Intl APIs.' },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "ClassDeclaration[id.name=/Service$/] > ClassBody > MethodDefinition[kind='method'][accessibility!='private'][key.name=/^(get|fetch|add|delete|destroy|set|list|edit)[A-Z]/]",
          message:
            'Service methods use approved verbs: find/create/update/remove/count/clear (not get/fetch/add/delete/destroy/set/list/edit). See CLAUDE.md backend naming.',
        },
        {
          selector:
            "ClassDeclaration[id.name=/Controller$/] > ClassBody > MethodDefinition[kind='method'][accessibility!='private'][key.name=/^(list|add|edit|delete|destroy|fetch)[A-Z]/]",
          message:
            'Controller methods use approved verbs: findAll/findOne/create/update/remove (or <verb><Noun>). See CLAUDE.md backend naming.',
        },
      ],
    },
  },
  {
    files: ['src/services/**/*.ts', 'src/app.service.ts', 'src/app.controller.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
]);
