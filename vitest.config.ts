import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    reporters: ['verbose'],
  },
  resolve: {
    alias: {
      '@core':      path.resolve(__dirname, 'src/core'),
      '@features':  path.resolve(__dirname, 'src/features'),
      '@shared':    path.resolve(__dirname, 'src/shared'),
      '@lib':       path.resolve(__dirname, 'src/lib'),
      '@utils':     path.resolve(__dirname, 'src/utils'),
      '@types-app': path.resolve(__dirname, 'src/types'),
    },
  },
});
