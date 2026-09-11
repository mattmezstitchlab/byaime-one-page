import { createRoot } from 'react-dom/client';

import { MotionConfig } from 'framer-motion';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { installAnalytics } from '@/lib/analytics';
import { I18nProvider } from '@/lib/i18n';

import './index.css';

installAnalytics();

// PWA : coquille hors-ligne installable (jamais en dev, jamais pendant les tests SSR).
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* L'application fonctionne sans la coquille hors-ligne. */
    });
  });
}

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <I18nProvider>
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </I18nProvider>
  </ErrorBoundary>,
);
