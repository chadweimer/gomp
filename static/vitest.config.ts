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
          setupFiles: ['./vitest.setup.ts'],
          testTimeout: 10000,
        },
      },
    ],
    coverage: {
      reporter: ['lcov', 'text'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.spec.{ts,tsx}', 'src/**/*.d.ts', 'src/generated/*.ts'],
    }
  },
});
