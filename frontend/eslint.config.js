import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import unicorn from 'eslint-plugin-unicorn'
import importPlugin from 'eslint-plugin-import'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: { unicorn, import: importPlugin },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      'no-console': 'error',
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
          ignore: ['^App\\.tsx$', '^vite-env\\.d\\.ts$'],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'confirm', message: 'Use shadcn AlertDialog instead of window.confirm().' },
        { name: 'alert', message: 'Use shadcn Dialog or sonner toast instead of window.alert().' },
        { name: 'prompt', message: 'Use shadcn Dialog with a form instead of window.prompt().' },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'axios', message: 'Use authFetch / publicFetch from @/lib/api instead of axios.' },
            { name: 'zod', message: "Import from 'zod/v4' (this project pins to Zod v4)." },
            {
              name: '@hookform/resolvers/zod',
              message: "Use standardSchemaResolver from '@hookform/resolvers/standard-schema' instead.",
            },
            { name: 'lodash', message: 'Use native array/object methods.' },
            { name: 'lodash-es', message: 'Use native array/object methods.' },
            { name: 'uuid', message: 'Use crypto.randomUUID().' },
            { name: 'date-fns', message: 'Use native Date and Intl APIs.' },
            { name: 'dayjs', message: 'Use native Date and Intl APIs.' },
            { name: 'moment', message: 'Use native Date and Intl APIs.' },
            { name: 'zustand', message: 'No state management libraries — use React Query + Context + useState.' },
            { name: 'redux', message: 'No state management libraries — use React Query + Context + useState.' },
            { name: '@reduxjs/toolkit', message: 'No state management libraries — use React Query + Context + useState.' },
            { name: 'jotai', message: 'No state management libraries — use React Query + Context + useState.' },
            { name: 'recoil', message: 'No state management libraries — use React Query + Context + useState.' },
            { name: 'react-icons', message: 'Use lucide-react for icons.' },
            { name: 'phosphor-react', message: 'Use lucide-react for icons.' },
          ],
          patterns: [
            {
              group: ['../*'],
              message: "Use the '@/' alias instead of relative parent imports.",
            },
            {
              group: ['@heroicons/react', '@heroicons/react/*', '@iconify/*', 'react-icons/*'],
              message: 'Use lucide-react for icons.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "ExpressionStatement > Literal[value='use client']",
          message: "'use client' is a Next.js directive — this is a Vite SPA, remove it.",
        },
        {
          selector: "ExpressionStatement > Literal[value='use server']",
          message: "'use server' is a Next.js directive — this is a Vite SPA, remove it.",
        },
        {
          selector: "JSXAttribute[name.name='style']",
          message:
            'Use Tailwind via className. Inline style is reserved for dynamic CSS variables (exempt: components/ui/).',
        },
      ],
    },
  },
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}'],
    ignores: ['src/components/ui/**'],
    rules: {
      'import/no-default-export': 'error',
    },
  },
  {
    files: [
      'src/components/**/*.{ts,tsx}',
      'src/pages/**/*.{ts,tsx}',
      'src/App.tsx',
      'src/main.tsx',
      'src/router.tsx',
    ],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'no-restricted-imports': 'off',
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['**/*.spec.{ts,tsx}', '**/*.test.{ts,tsx}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
])
