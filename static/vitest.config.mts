import { defineVitestConfig } from '@stencil/vitest/config';
import { stencilVitestPlugin } from '@stencil/vitest/plugin';

export default defineVitestConfig({
  stencilConfig: './stencil.config.ts',
  test: {
    projects: [
      {
        plugins: [stencilVitestPlugin({ css: true })],
        test: {
          name: 'spec',
          include: ['src/**/*.spec.{ts,tsx}'],
          environment: 'stencil',
          environmentOptions: {
            stencil: {
              domEnvironment: 'jsdom'
            },
          },
          testTimeout: 10000,
        },
      },
    ],
    coverage: {
      reportOnFailure: true,
      reporter: ['lcov', 'text'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.spec.{ts,tsx}', 'src/**/*.d.ts', 'src/generated/**/*.ts'],
    }
  },
});
