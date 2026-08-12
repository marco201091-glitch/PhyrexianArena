import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts'],
      exclude: ['lib/types/**'],
      reporter: ['text', 'json-summary'],
      thresholds: {
        statements: 55,
        branches: 72,
        functions: 72,
        lines: 55,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
