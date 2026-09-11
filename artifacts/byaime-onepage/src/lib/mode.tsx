import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useProject } from "@/store/project-store";

/**
 * Mode d'affichage de l'espace privé : « facile » (l'essentiel, guidé) ou
 * « pro » (tout le cockpit). Même patron que l'apparence sombre/clair :
 * préférence persistée en `localStorage`, effective immédiatement, sans
 * toucher aux données — le mode est une lentille, pas un fork.
 */
export type AimeMode = "facile" | "pro";

export const MODE_STORAGE_KEY = "aime-mode";

export function readStoredMode(): AimeMode | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
  return stored === "facile" || stored === "pro" ? stored : null;
}

/**
 * Mode par défaut sans préférence stockée : le persona d'onboarding décide —
 * les couples commencent en Facile, les professionnels en Pro.
 */
export function resolveDefaultMode(persona: "couple" | "pro" | undefined): AimeMode {
  return persona === "pro" ? "pro" : "facile";
}

/**
 * Mode effectif : les rôles accompagnants restent en Facile quoi qu'il arrive
 * (minimum du rôle et de la préférence).
 */
export function resolveEffectiveMode(preference: AimeMode, role: string): AimeMode {
  return role === "family" || role === "viewer" ? "facile" : preference;
}

type ModeValue = {
  /** Mode effectif, rôle pris en compte : c'est lui qui filtre l'interface. */
  mode: AimeMode;
  /** Préférence stockée (ou déduite du persona) avant application du rôle. */
  preference: AimeMode;
  setMode: (mode: AimeMode) => void;
};

const ModeContext = createContext<ModeValue | null>(null);

function useModeState(): ModeValue {
  const { project, currentRole } = useProject();
  const [stored, setStored] = useState<AimeMode | null>(readStoredMode);
  const setMode = useCallback((next: AimeMode) => {
    setStored(next);
    if (typeof window !== "undefined") window.localStorage.setItem(MODE_STORAGE_KEY, next);
  }, []);
  /* Sans choix explicite, la préférence suit le persona du projet — y compris
     quand le projet arrive après coup (hydratation asynchrone). */
  const preference = stored ?? resolveDefaultMode(project?.persona);
  const mode = resolveEffectiveMode(preference, currentRole);
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.dataset.aimeMode = mode;
  }, [mode]);
  return useMemo(() => ({ mode, preference, setMode }), [mode, preference, setMode]);
}

export function ModeProvider({ children }: { children: ReactNode }) {
  return <ModeContext.Provider value={useModeState()}>{children}</ModeContext.Provider>;
}

/** Hors provider (rendus isolés, tests) : le mode Pro, soit le comportement historique. */
const FALLBACK_VALUE: ModeValue = { mode: "pro", preference: "pro", setMode: () => {} };

export function useMode(): ModeValue {
  return useContext(ModeContext) ?? FALLBACK_VALUE;
}
