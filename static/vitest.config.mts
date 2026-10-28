import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    css: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.spec.{ts,tsx}'],
    testTimeout: 10000,
    coverage: {
      reportOnFailure: true,
      reporter: ['lcov', 'text'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.spec.{ts,tsx}', 'src/**/*.d.ts', 'src/**/*.gen.ts'],
    },
  },
});
