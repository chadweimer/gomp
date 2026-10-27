import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.spec.ts'],
    testTimeout: 10000,
    coverage: {
      reportOnFailure: true,
      reporter: ['lcov', 'text'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.d.ts', 'src/helpers/schema.gen.ts'],
    },
  },
});

