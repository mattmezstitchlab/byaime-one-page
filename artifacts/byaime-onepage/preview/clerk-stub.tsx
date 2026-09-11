/*
 * Stub Clerk — utilisé UNIQUEMENT par l'aperçu local (`preview/vite.preview.mjs`).
 *
 * Pourquoi : l'aperçu doit pouvoir se lancer sans clé Pub Clerk, sans réseau et
 * sans base de données. Ce fichier n'est importé par aucun code de production :
 * `vite.config.ts` (build et dev normaux) ne l'aliasse pas.
 *
 * Session simulée : `localStorage["aime-preview-session"] === "1"` signifie
 * « connecté ». L'écran de création de compte propose donc un bouton pour entrer
 * dans l'espace de démonstration, ce qui permet de parcourir tout le parcours
 * accueil → saisie → espace privé sans Clerk.
 *
 * IMPORTANT : toute API Clerk consommée par l'app doit être exposée ici.
 * `preview/smoke.mjs` le vérifie (grep des usages : useClerk → addListener,
 * signOut, openUserProfile ; useUser → user ; useAuth → isLoaded, isSignedIn,
 * userId ; useSession → session).
 */
import { type ReactNode, useState } from "react";

const SESSION_KEY = "aime-preview-session";
const INTENTION_DRAFT_KEY = "aime-intention-draft";

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible (navigation privée) : l'aperçu reste utilisable */
  }
}

export function isPreviewSignedIn() {
  return readStorage(SESSION_KEY) === "1";
}

function go(path: string) {
  if (typeof window === "undefined") return;
  window.location.assign(path);
}

export function ClerkProvider({ children }: { children?: ReactNode; [key: string]: unknown }) {
  return <>{children}</>;
}

export function publishableKeyFromHost(_host: string, key?: string) {
  return key || "pk_test_preview";
}

export function Show({ when, children, fallback = null }: { when: boolean; children?: ReactNode; fallback?: ReactNode }) {
  return when ? <>{children}</> : <>{fallback}</>;
}

/** Carte d'accueil de l'aperçu : elle remplace le formulaire Clerk, en affichant ce que la landing a retenu. */
function PreviewAuthCard({ mode }: { mode: "sign-up" | "sign-in" }) {
  // Lu à l'initialisation (pas dans un effet) : la carte n'affiche jamais
  // « rien » le temps d'un rendu, et le contrôle SSR la voit remplie.
  const [draft] = useState<string | null>(() => readStorage(INTENTION_DRAFT_KEY));
  const [signedIn] = useState<boolean>(() => isPreviewSignedIn());

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#050506",
        color: "#faf6ef",
        fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: "min(440px, 100%)",
          border: "1px solid rgba(250,246,239,.14)",
          borderRadius: 20,
          padding: "32px 28px",
          background: "rgba(255,255,255,.03)",
        }}
      >
        <p style={{ fontSize: 10, letterSpacing: ".28em", textTransform: "uppercase", color: "#c9a96a", margin: 0 }}>
          Aperçu local · Clerk simulé
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 400, margin: "14px 0 10px" }}>
          {mode === "sign-up" ? "Créer mon espace" : "Se connecter"}
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(250,246,239,.66)", margin: 0 }}>
          Sur le site réel, cet écran est le formulaire de {mode === "sign-up" ? "création de compte" : "connexion"} de Clerk
          (e-mail, mot de passe, comptes sociaux). En aperçu, aucun réseau n’est appelé : la session est simulée dans ce
          navigateur et l’espace de démonstration est sauvegardé par le serveur de développement.
        </p>
        <div
          style={{
            marginTop: 20,
            padding: "14px 16px",
            borderRadius: 14,
            border: "1px dashed rgba(250,246,239,.2)",
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          <span style={{ color: "rgba(250,246,239,.5)" }}>Ce qu’AIME a retenu sur l’accueil : </span>
          <em>{draft && draft.trim() ? draft : "rien — reprenez la phrase dans le champ de l’accueil."}</em>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 22 }}>
          {signedIn ? (
            <button
              type="button"
              onClick={() => go("/user-portal")}
              style={{
                appearance: "none",
                border: 0,
                borderRadius: 999,
                padding: "12px 18px",
                background: "#faf6ef",
                color: "#050506",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reprendre l’espace de démonstration
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                writeStorage(SESSION_KEY, "1");
                go("/user-portal");
              }}
              style={{
                appearance: "none",
                border: 0,
                borderRadius: 999,
                padding: "12px 18px",
                background: "#faf6ef",
                color: "#050506",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Entrer dans l’espace de démonstration
            </button>
          )}
          <button
            type="button"
            onClick={() => go("/")}
            style={{
              appearance: "none",
              border: "1px solid rgba(250,246,239,.22)",
              borderRadius: 999,
              padding: "11px 18px",
              background: "transparent",
              color: "rgba(250,246,239,.8)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Revenir à l’accueil
          </button>
        </div>
        <p style={{ fontSize: 11, color: "rgba(250,246,239,.45)", marginBottom: 0, marginTop: 18 }}>
          Pour essayer le vrai parcours Clerk : `VITE_CLERK_PUBLISHABLE_KEY=… corepack pnpm exec vite` (config normale, sans
          ce stub).
        </p>
      </div>
    </div>
  );
}

export function SignIn() {
  return <PreviewAuthCard mode="sign-in" />;
}

export function SignUp() {
  return <PreviewAuthCard mode="sign-up" />;
}

export function useAuth() {
  const signedIn = isPreviewSignedIn();
  return {
    isLoaded: true,
    isSignedIn: signedIn,
    userId: signedIn ? "user_preview" : null,
    sessionId: signedIn ? "sess_preview" : null,
    clerk: null,
    sessionClaims: null,
    has: () => false,
    getToken: async () => null,
    signOut: async () => undefined,
  };
}

export function useSession() {
  const signedIn = isPreviewSignedIn();
  return { isLoaded: true, session: signedIn ? { id: "sess_preview", status: "active" } : null };
}

/** Toutes les méthodes que l'app appelle réellement, en version no-op ou simulée. */
export function useClerk() {
  return {
    ready: true,
    client: null,
    session: null,
    user: null,
    // L'app s'abonne aux changements de compte pour vider le cache React Query.
    addListener: (_callback: (payload: { user?: unknown }) => void) => () => undefined,
    signOut: async () => {
      writeStorage(SESSION_KEY, "0");
      go("/");
    },
    redirectToSignIn: () => go("/connexion"),
    redirectToSignUp: () => go("/creation"),
    openUserProfile: () => go("/profile"),
    close: () => undefined,
    setSession: async () => undefined,
  };
}

export function useUser() {
  const signedIn = isPreviewSignedIn();
  return {
    isLoaded: true,
    isSignedIn: signedIn,
    user: signedIn
      ? {
          id: "user_preview",
          fullName: "Camille & Thomas",
          firstName: "Camille",
          lastName: "Thomas",
          createdAt: "2026-09-01T09:00:00.000Z",
          primaryEmailAddress: { emailAddress: "camille@exemple.fr", verification: { status: "verified" } },
          externalAccounts: [],
          imageUrl: "",
        }
      : null,
    fullName: signedIn ? "Camille & Thomas" : null,
    primaryEmailAddress: signedIn ? { emailAddress: "camille@exemple.fr" } : null,
    has: () => false,
    reload: async () => undefined,
  };
}

export function useSignIn() {
  return { isLoaded: true, signIn: null, setActive: async () => undefined, signOut: async () => undefined };
}

export function useSignUp() {
  return {
    isLoaded: true,
    signUp: null,
    createEmailLink: async () => undefined,
    attempVerification: async () => undefined,
    setActive: async () => undefined,
    signOut: async () => undefined,
  };
}
