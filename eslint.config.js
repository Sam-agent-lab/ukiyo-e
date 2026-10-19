import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': 'error',
      'no-undef': 'error',
      eqeqeq: 'error',
      'prefer-const': 'error',
    },
  },
];
