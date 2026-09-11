import { createRoot } from 'react-dom/client';

import { MotionConfig } from 'framer-motion';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { installAnalytics } from '@/lib/analytics';

import './index.css';

installAnalytics();

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </ErrorBoundary>,
);
