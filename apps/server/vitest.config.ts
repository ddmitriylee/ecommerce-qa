import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: [
        'api/auth/**/*.ts',
        'api/products/**/*.ts',
        'api/cart/**/*.ts',
        'api/orders/**/*.ts',
        'lib/**/*.ts',
      ],
      exclude: ['**/node_modules/**', '**/dist/**'],
      thresholds: {
        global: {
          lines: 70,
          functions: 70,
          branches: 60,
          statements: 70,
        },
      },
    },
  },
});
