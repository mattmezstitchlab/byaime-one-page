import { mergeConfig } from "vite";
import { createFakeAimeApi } from "./fake-api.mjs";

import baseConfig from "../vite.config";

/*
 * Config d'APERÇU LOCAL (npm/vite via `-c preview/vite.preview.mjs`) :
 *  1. `@clerk/react` est remplacé par un stub de session simulée (preview/clerk-stub.tsx)
 *     pour ouvrir l'app sans clé Pub Clerk, sans réseau et sans base de données ;
 *  2. une fausse API `/api/*` répond en mémoire aux routes du store (monde,
 *     carte, participation, liens de RSVP) pour que l'espace privé enregistre
 *     réellement le Monde pendant la session — le plugin est dans
 *     `fake-api.mjs`, partagé avec `vite preview` (le tournage de la visite).
 * Aucune de ces pièces n'entre dans le build : `vite.config.ts` est la config de
 * production et n'aliasse rien.
 */
const stub = new URL("./clerk-stub.tsx", import.meta.url).pathname;

export default mergeConfig(baseConfig, {
  /*
   * 3) l'aperçu simule une clé publique d'authentification. Depuis le lot 1.1 du
   *    plan, c'est la variable d'environnement — pas le retour du helper Clerk —
   *    qui décide du mode dégradé : sans cette valeur, l'aperçu démarrerait en
   *    mode dégradé et l'espace privé ne serait plus atteignable ici. Le mode
   *    dégradé, lui, est contrôlé par `preview/smoke.mjs` (son propre serveur,
   *    avec la clé définie à `undefined`).
   */
  define: {
    "import.meta.env.VITE_CLERK_PUBLISHABLE_KEY": JSON.stringify("pk_test_preview"),
  },
  plugins: [createFakeAimeApi()],
  resolve: {
    alias: [
      { find: /^@clerk\/react\/internal$/, replacement: stub },
      { find: /^@clerk\/react$/, replacement: stub },
    ],
  },
  /* `allowedHosts: true` : Vite ≥ 5.4 rejette par défaut tout hôte qui n'est
     pas localhost (« Blocked request. This host is not allowed. »). L'aperçu
     est servi derrière un hôte de prévisualisation, il faut donc l'autoriser.
     Ce réglage ne vit que dans ce fichier d'aperçu local : `vite.config.ts`,
     la config de build, ne le reçoit pas. */
  server: { host: "0.0.0.0", port: 4173, strictPort: false, allowedHosts: true },
});
