import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/test/setup.ts',
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'lcov', 'html'],
            reportsDirectory: './coverage',
            include: [
                'src/shared/lib/**/*.ts',
                'src/shared/hooks/**/*.ts',
                'src/features/**/*.ts',
            ],
            exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/test/**'],
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
