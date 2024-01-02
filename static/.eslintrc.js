module.exports = {
  'root': true,
  'parser': '@typescript-eslint/parser',
  'parserOptions': {
    'project': './tsconfig.json',
    'tsconfigRootDir': __dirname
  },
  'plugins': [
    '@typescript-eslint',
  ],
  'extends': [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@stencil-community/recommended',
  ],
  'ignorePatterns': [".eslintrc.js"],
  'rules': {
    'no-empty-function': 'off',
    'quotes': ['error', 'single'],
    'react/jsx-no-bind': [
      'warn',
      {
        'ignoreRefs': true,
        'allowArrowFunctions': true,
      }
    ],
    '@stencil-community/required-jsdoc': 'off',
    '@typescript-eslint/no-empty-function': ['error'],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        'varsIgnorePattern': '^h$'
      }
    ]
  },
};
