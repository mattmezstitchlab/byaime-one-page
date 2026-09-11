type AnalyticsData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: {
      track(name: string, data?: AnalyticsData): void;
    };
  }
}

const scriptSrc = import.meta.env.VITE_UMAMI_SRC as string | undefined;
const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined;
let installed = false;

/**
 * Umami est cookieless : aucune bannière n'est nécessaire, mais le script doit
 * être déclaré. Sans ces deux variables d'environnement, on n'émet rien — et on
 * ne fait pas semblant de mesurer.
 */
export function installAnalytics(): void {
  if (typeof window === 'undefined' || installed || !scriptSrc || !websiteId) return;
  installed = true;
  const script = document.createElement('script');
  script.async = true;
  script.src = scriptSrc;
  script.dataset.websiteId = websiteId;
  document.head.appendChild(script);
}

export function trackEvent(name: string, data?: AnalyticsData): void {
  if (typeof window === 'undefined') return;

  try {
    window.umami?.track(name, data);
  } catch {
    // Analytics must never break the app.
  }
}
