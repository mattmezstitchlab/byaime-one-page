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

        if (path === "/projects" && method === "GET") {
          return send(res, 200, [...rows.values()]);
        }
        if (path === "/projects" && method === "POST") {
          const body = await readJson(req);
          const id = `proj_preview_${rows.size + 1}`;
          const row = {
            id,
            title: body.title ?? "Notre mariage",
            data: { ...(body.data ?? {}), id },
            updatedAt: now(),
          };
          rows.set(id, row);
          return send(res, 201, row);
        }
        if (projectMatch && method === "GET") {
          const row = rows.get(projectMatch[1]);
          return row ? send(res, 200, row) : send(res, 404, { error: "Monde introuvable (aperçu local)" });
        }
        if (projectMatch && (method === "PUT" || method === "PATCH" || method === "POST")) {
          const id = projectMatch[1];
          const body = await readJson(req);
          const row = {
            id,
            title: body.title ?? rows.get(id)?.title ?? "Notre mariage",
            data: { ...(body.data ?? {}), id },
            updatedAt: now(),
          };
          rows.set(id, row);
          return send(res, 200, row);
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
  plugins: [createFakeAimeApi()],
  resolve: {
    alias: [
      { find: /^@clerk\/react\/internal$/, replacement: stub },
      { find: /^@clerk\/react$/, replacement: stub },
    ],
  },
  server: { host: "0.0.0.0", port: 4173, strictPort: false },
});
