import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts', '__tests__/performance/**/*.test.ts', '__tests__/chaos/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: [
        'api/auth/**/*.ts',
        'api/products/**/*.ts',
        'api/cart/**/*.ts',
        'api/orders/**/*.ts',
        'api/categories/**/*.ts',
        'api/admin/**/*.ts',
        'api/users/**/*.ts',
        'lib/**/*.ts',
      ],
      exclude: ['**/node_modules/**', '**/dist/**'],
      thresholds: {
        global: {
          lines: 80,
          functions: 80,
          branches: 70,
          statements: 80,
        },
      },
    },
  },
});
