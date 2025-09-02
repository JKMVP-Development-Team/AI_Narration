import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: true,
    include: [
      'tests/**/*.test.{ts,tsx}',
      'packages/*/src/**/*.test.{ts,tsx}'
    ],
    exclude: [
      'tests/**/*.spec.{ts,tsx}', // Exclude Playwright tests
      'apps/*/src/**/__tests__/**',
      'node_modules/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'apps/*/src/**/*.{ts,tsx}',
        'packages/*/src/**/*.{ts,tsx}'
      ],
      exclude: [
        'apps/*/src/**/*.test.{ts,tsx}',
        'apps/*/src/**/__tests__/**',
        'tests/**'
      ]
    },
  }
});