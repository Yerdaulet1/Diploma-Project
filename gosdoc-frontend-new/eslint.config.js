import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', {
        varsIgnorePattern:        '^[A-Z_]',
        argsIgnorePattern:        '^_',
        caughtErrorsIgnorePattern: '^(_|err$|e$)',
        destructuredArrayIgnorePattern: '^_',
      }],
      // Idiomatic for "swallow error on purpose"
      'no-empty': ['error', { allowEmptyCatch: true }],
      // router.jsx and provider files legitimately export non-component helpers
      'react-refresh/only-export-components': 'off',
      // React Compiler's experimental rules trip on safe patterns
      // (e.g. accessing refs through callbacks defined inline).
      'react-hooks/refs': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
