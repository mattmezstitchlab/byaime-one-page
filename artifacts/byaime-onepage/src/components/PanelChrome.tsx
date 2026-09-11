import { createContext, useContext, type ReactNode } from "react";

/**
 * Contexte partagé qui donne à chaque panneau (CenteredBlock) le fil d'ariane
 * et la navigation de la page dans laquelle il a été ouvert.
 */
export type PanelBreadcrumbItem = {
  label: string;
  href?: string;
};

export type PanelNavItem = {
  id: string;
  label: string;
  /** Lien de navigation (route) quand la navigation est une route. */
  href?: string;
  /** Action interne (changement de vue / de panneau) quand la navigation est locale. */
  onClick?: () => void;
  active?: boolean;
};

export type PanelChrome = {
  breadcrumb: PanelBreadcrumbItem[];
  navigation: PanelNavItem[];
};

const DEFAULT_CHROME: PanelChrome = {
  breadcrumb: [{ label: "AIME", href: "/" }],
  navigation: [],
};

const PanelChromeContext = createContext<PanelChrome>(DEFAULT_CHROME);

export function PanelChromeProvider({ chrome, children }: { chrome: PanelChrome; children: ReactNode }) {
  return <PanelChromeContext.Provider value={chrome}>{children}</PanelChromeContext.Provider>;
}

export function usePanelChrome(): PanelChrome {
  return useContext(PanelChromeContext);
}
