import { cardSchema, participationSchema, projectWithCards, profileInputSchema, assignmentErrors } from "../../api-server/src/lib/universalCard.ts";
import { stripCardProjection } from "../../../lib/aime-domain/src/universal-card.ts";
import { mergeConfig } from "vite";

import baseConfig from "../vite.config";

/*
 * Config d'APERÇU LOCAL (npm/vite via `-c preview/vite.preview.mjs`) :
 *  1. `@clerk/react` est remplacé par un stub de session simulée (preview/clerk-stub.tsx)
 *     pour ouvrir l'app sans clé Pub Clerk, sans réseau et sans base de données ;
 *  2. une fausse API `/api/*` répond en mémoire aux quatre routes du store
 *     (GET/POST /projects, PUT /projects/:id, GET /projects/:id/rsvp-links) pour
 *     que l'espace privé enregistre réellement le Monde pendant la session.
 * Aucune de ces pièces n'entre dans le build : `vite.config.ts` est la config de
 * production et n'aliasse rien.
 */
const stub = new URL("./clerk-stub.tsx", import.meta.url).pathname;

function createFakeAimeApi() {
  /** @type {Map<string, { id: string, title: string, data: unknown, updatedAt: string }>} */
  const rows = new Map();
  let card = null;
  const participations = new Map();
  const profiles = new Map();
  const projected = row => ({ ...row, role: 'owner', data: projectWithCards(row.data, card && participations.has(row.id) ? [{ userId: 'preview-user', card: card.data, profiles: [...profiles.values()], participation: participations.get(row.id) }] : []) });

  const now = () => new Date().toISOString();
  const send = (res, status, payload) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(payload === undefined ? "" : JSON.stringify(payload));
  };
  const readJson = (req) =>
    new Promise((resolve) => {
      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk;
      });
      req.on("end", () => {
        try {
          resolve(raw ? JSON.parse(raw) : {});
        } catch {
          resolve({});
        }
      });
    });

  return {
    name: "aime-preview-fake-api",
    configureServer(server) {
      server.middlewares.use("/api", async (req, res, next) => {
        const path = decodeURIComponent((req.url || "/").split("?")[0]);
        const method = (req.method || "GET").toUpperCase();
        const projectMatch = path.match(/^\/projects\/([^/]+)$/);
        const rsvpMatch = path.match(/^\/projects\/[^/]+\/rsvp-links$/);

        // Preview-only persistence: no Clerk account or production database is contacted.
        if (path === "/me/card") {
          if (method === 'GET') return send(res, 200, card);
          if (method === 'PUT') {
            const body = await readJson(req);
            const parsed = cardSchema.safeParse(body.data);
            if (!parsed.success) return send(res, 400, { error: 'Carte invalide' });
            if ((card?.updatedAt ?? null) !== body.updatedAt) return send(res, 409, { error: 'Conflit de version' });
            card = { userId: 'preview-user', data: parsed.data, updatedAt: now() };
            return send(res, 200, card);
          }
        }
        if (path === '/me/professional-profiles') {
          if (method === 'GET') return send(res, 200, [...profiles.values()]);
          if (method === 'PUT') {
            const parsed = profileInputSchema.safeParse(await readJson(req));
            if (!parsed.success || !card) return send(res, 400, { error: 'Profil métier invalide' });
            const input = parsed.data, existing = profiles.get(input.profession);
            if ((existing?.updatedAt ?? null) !== input.updatedAt) return send(res, 409, { error: 'Conflit de version' });
            const row = { id: existing?.id ?? crypto.randomUUID(), cardUserId: 'preview-user', profession: input.profession, data: input.data, updatedAt: now() };
            profiles.set(row.profession, row); return send(res, 200, row);
          }
        }
        const contextMatch = path.match(/^\/projects\/([^/]+)\/my-participation$/);
        if (contextMatch) {
          const id = contextMatch[1];
          if (!rows.has(id)) return send(res, 404, { error: 'Mariage introuvable' });
          if (method === 'GET') return send(res, 200, participations.get(id) ?? null);
          if (method === 'PUT') {
            const parsed = participationSchema.safeParse(await readJson(req));
            if (!card || !parsed.success) return send(res, 400, { error: 'Participation invalide' });
            const issues = assignmentErrors('preview-user', parsed.data.roles, parsed.data.assignments ?? [], [...profiles.values()], rows.get(id)?.data.timeline ?? [], parsed.data);
            if (issues.length) return send(res, 422, { error: issues.join(' · ') });
            participations.set(id, parsed.data);
            return send(res, 200, parsed.data);
          }
        }
        if (path === "/projects" && method === "GET") {
          return send(res, 200, [...rows.values()].map(projected));
        }
        if (path === "/projects" && method === "POST") {
          const body = await readJson(req);
          const id = crypto.randomUUID();
          const row = {
            id,
            title: body.title ?? "Notre mariage",
            data: { ...stripCardProjection(body.data ?? {}), id },
            updatedAt: now(),
          };
          rows.set(id, row);
          return send(res, 201, projected(row));
        }
        if (projectMatch && method === "GET") {
          const row = rows.get(projectMatch[1]);
          return row ? send(res, 200, projected(row)) : send(res, 404, { error: "Monde introuvable (aperçu local)" });
        }
        if (projectMatch && (method === "PUT" || method === "PATCH" || method === "POST")) {
          const id = projectMatch[1];
          const body = await readJson(req);
          const row = {
            id,
            title: body.title ?? rows.get(id)?.title ?? "Notre mariage",
            data: { ...stripCardProjection(body.data ?? {}), id },
            updatedAt: now(),
          };
          rows.set(id, row);
          return send(res, 200, projected(row));
        }
        if (rsvpMatch && method === "GET") {
          return send(res, 200, []);
        }
        return send(res, 404, {
          error: `Endpoint non simulé dans l’aperçu local : ${method} ${path}`,
        });
      });
    },
  };
}

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
