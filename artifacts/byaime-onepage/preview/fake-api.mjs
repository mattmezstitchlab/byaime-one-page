/*
 * L'API factice de l'aperçu local : les routes du store, répondues en mémoire,
 * pour que l'espace privé enregistre réellement son Monde sans Clerk, sans
 * réseau et sans base de données.
 *
 * Elle vit dans son module parce qu'elle sert deux serveurs : `vite` en mode
 * dev (`configureServer`, l'aperçu habituel) et `vite preview` sur le build de
 * production (`configurePreviewServer`, le serveur de tournage de la visite
 * guidée — où chaque seconde de transformation de module se verrait à l'écran).
 *
 * Aucune de ces pièces n'entre dans le build livré : `vite.config.ts`, la
 * config de production, n'aliasse rien et n'embarque pas ce plugin.
 */
import { cardSchema, participationSchema, projectWithCards, profileInputSchema, assignmentErrors } from "../../api-server/src/lib/universalCard.ts";
import { stripCardProjection } from "../../../lib/aime-domain/src/universal-card.ts";

export function createFakeAimeApi() {
  /** @type {Map<string, { id: string, title: string, data: unknown, updatedAt: string }>} */
  const rows = new Map();
  let card = null;
  const participations = new Map();
  /** Les liens de participation, par Monde puis par personne. */
  const participantLinks = new Map();
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

  /** Le middleware lui-même, branché de la même façon sur les deux serveurs. */
  const handle = async (req, res, next) => {
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
    /* Un lien de participation, créé puis relu : c'est la route que l'invité
       utilise, et `GET /projects/:id/rsvp-links` la renvoie au Monde. */
    const participantMatch = path.match(/^\/projects\/([^/]+)\/rsvp-links\/([^/]+)$/);
    if (participantMatch && method === 'POST') {
      const [, id, guestId] = participantMatch;
      if (!rows.has(id)) return send(res, 404, { error: 'Monde introuvable (aperçu local)' });
      const links = participantLinks.get(id) ?? new Map();
      const token = crypto.randomUUID();
      links.set(guestId, { guestId, token, revoked: false, response: null });
      participantLinks.set(id, links);
      return send(res, 201, links.get(guestId));
    }
    if (participantMatch && method === 'DELETE') {
      const [, id, guestId] = participantMatch;
      (participantLinks.get(id) ?? new Map()).delete(guestId);
      return send(res, 200, { ok: true });
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
      const id = path.split("/")[2];
      return send(res, 200, [...(participantLinks.get(id)?.values() ?? [])]);
    }
    return send(res, 404, {
      error: `Endpoint non simulé dans l’aperçu local : ${method} ${path}`,
    });
  };

  return {
    name: "aime-preview-fake-api",
    configureServer(server) {
      server.middlewares.use("/api", handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api", handle);
    },
  };
}
