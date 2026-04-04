import { defineVitestConfig } from '@stencil/vitest/config';

export default defineVitestConfig({
  stencilConfig: './stencil.config.ts',
  test: {
    projects: [
      {
        test: {
          name: 'spec',
          include: ['src/**/*.spec.{ts,tsx}'],
          environment: 'stencil',
          environmentOptions: {
            stencil: {
              domEnvironment: 'jsdom'
            },
          },
          setupFiles: ['./vitest-setup.ts'],
        },
      },
    ],
  },
});
