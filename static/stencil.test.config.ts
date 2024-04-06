import { Config } from '@stencil/core';

// https://stenciljs.com/docs/config

export const config: Config = {
  globalScript: 'src/global/app.ts',
  globalStyle: 'src/global/app.css',
  taskQueue: 'async',
  outputTargets: [{
    type: 'www',
    baseUrl: '/',
    serviceWorker: null,
    copy: [
      { src: 'default-home-image.png' }
    ]
  }],
  testing: {
    browserHeadless: 'new',
    coveragePathIgnorePatterns: [
      '<rootDir>/node_modules/',
      '<rootDir>/www/',
      '<rootDir>/src/generated/',
      'stencil.*.ts'
    ],
    moduleNameMapper: {
      '^axios$': '<rootDir>/node_modules/axios/dist/node/axios.cjs'
    },
  },
};
