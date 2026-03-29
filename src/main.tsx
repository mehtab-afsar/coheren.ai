import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import './styles/animations.css'
import App from './App.tsx'
import { initAnalytics } from './lib/analytics'
import { validateEnv } from './config/env'
import { env } from './config/env'

validateEnv()
initAnalytics()

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: env.IS_PROD ? 0.1 : 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: env.IS_PROD ? 1.0 : 0,
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => console.warn('[SW] Registration failed:', err));
  });
}
