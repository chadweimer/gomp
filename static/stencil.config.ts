import { Config } from '@stencil/core';

// https://stenciljs.com/docs/config

export const config: Config = {
  globalScript: 'src/global/app.ts',
  globalStyle: 'src/global/app.css',
  taskQueue: 'async',
  outputTargets: [{
    type: 'www',
    baseUrl: '/static/',
    serviceWorker: null,
    copy: [
      { src: 'default-home-image.png' }
    ]
  }],
};
