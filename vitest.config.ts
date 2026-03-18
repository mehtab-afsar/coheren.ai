import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    reporters: ['verbose'],
    setupFiles: ['src/__tests__/setup.ts'],
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL':      JSON.stringify('http://localhost:54321'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('test-anon-key'),
    'import.meta.env.VITE_GROQ_API_KEY':      JSON.stringify('test-groq-key'),
    'import.meta.env.VITE_JINA_API_KEY':      JSON.stringify('test-jina-key'),
    'import.meta.env.VITE_POSTHOG_KEY':       JSON.stringify(''),
    'import.meta.env.VITE_POSTHOG_HOST':      JSON.stringify('https://app.posthog.com'),
    'import.meta.env.PROD':                   'false',
    'import.meta.env.DEV':                    'true',
    'import.meta.env.MODE':                   JSON.stringify('test'),
  },
  resolve: {
    alias: {
      '@core':      path.resolve(__dirname, 'src/core'),
      '@features':  path.resolve(__dirname, 'src/features'),
      '@shared':    path.resolve(__dirname, 'src/shared'),
      '@lib':       path.resolve(__dirname, 'src/lib'),
      '@utils':     path.resolve(__dirname, 'src/utils'),
      '@hooks':     path.resolve(__dirname, 'src/hooks'),
      '@types-app': path.resolve(__dirname, 'src/types'),
      '@config':    path.resolve(__dirname, 'src/config'),
    },
  },
});
