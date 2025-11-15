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
    setupFilesAfterEnv: ['<rootDir>/stencil.polyfills.js'],
    browserHeadless: 'shell',
    coveragePathIgnorePatterns: [
      '<rootDir>/node_modules/',
      '<rootDir>/www/',
      '<rootDir>/src/generated/',
      'stencil.*.js',
      'stencil.*.ts'
    ],
  },
};
