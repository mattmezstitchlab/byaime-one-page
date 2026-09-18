import {
  type PublicBlockVisibility,
  type PublicPage,
  type PublicPageBlock,
  type PublicTextField,
  type TimelineEvent,
  type WorldProject,
  type WorldVisual,
} from "./types";

/*
 * Pont AIME-COMPOSER — tranche 1 : la Page du Monde en composition
 * déclarative (docs/pont-architecture-aime.md §4).
 *
 * Un bloc = une liaison vers une source canonique, jamais une copie de sa
 * valeur. La projection relit le Monde en direct, et l'effet Ripple — une
 * donnée saisie une fois, propagée partout — devient une propriété du
 * modèle, vérifiée par test, pas une promesse d'écran.
 *
 * Règle de visibilité, gravée : rien ne devient public par héritage. Un
 * bloc porte sa propre visibilité, et un Moment ne rejoint la page que
 * par sa visibilité « audience » — jamais par défaut, jamais déduite.
 */

/** La composition que le kit Mariage livre par défaut : l'utilisateur
 *  n'assemble rien, il ajuste. Visuel du Monde → nom → sous-titre →
 *  Moments publics. */
export const DEFAULT_PUBLIC_PAGE: PublicPage = {
  blocks: [
    { id: "pp-hero", type: "visual", source: { kind: "heroVisual" }, visibility: "public" },
    { id: "pp-title", type: "text", source: { kind: "world", field: "title" }, visibility: "public" },
    { id: "pp-subtitle", type: "text", source: { kind: "world", field: "subtitle" }, visibility: "public" },
    { id: "pp-moments", type: "moments", source: { kind: "timeline" }, visibility: "public" },
  ],
};

export function defaultPublicPage(): PublicPage {
  return { blocks: DEFAULT_PUBLIC_PAGE.blocks.map((block) => ({ ...block, source: { ...block.source } })) };
}

const TEXT_FIELDS: readonly PublicTextField[] = ["title", "subtitle", "venue", "city"];

/**
 * Normalisation tolérante d'une page stockée : les blocs invalides sont
 * écartés, jamais corrigés — et une page vide retombe sur la composition
 * du kit, pour qu'aucun Monde n'ouvre une page vide.
 */
export function normalizePublicPage(value: unknown): PublicPage {
  const raw = value as { blocks?: unknown } | null | undefined;
  const blocks = Array.isArray(raw?.blocks) ? raw.blocks : [];
  const cleaned = blocks
    .map((block) => normalizeBlock(block))
    .filter((block): block is PublicPageBlock => block !== null);
  return cleaned.length ? { blocks: cleaned } : defaultPublicPage();
}

function normalizeBlock(value: unknown): PublicPageBlock | null {
  if (!value || typeof value !== "object") return null;
  const block = value as Partial<PublicPageBlock> & { source?: Record<string, unknown> };
  if (typeof block.id !== "string" || !block.id.trim()) return null;
  const source = block.source;
  if (!source || typeof source !== "object") return null;
  if (source.kind === "world") {
    if (block.type !== "text") return null;
    if (!TEXT_FIELDS.includes(source.field as PublicTextField)) return null;
  } else if (source.kind === "heroVisual") {
    if (block.type !== "visual") return null;
  } else if (source.kind === "timeline") {
    if (block.type !== "moments") return null;
  } else if (source.kind === "document") {
    if (block.type !== "visual") return null;
    if (typeof source.documentId !== "string" || !source.documentId) return null;
  } else {
    return null;
  }
  return {
    id: block.id,
    type: block.type,
    source: source as PublicPageBlock["source"],
    visibility: block.visibility === "prive" ? "prive" : "public",
  };
}

/** La page d'un Monde, avec repli : un Monde créé avant la tranche, ou un
 *  import sans page, ouvre la composition du kit — jamais une page vide. */
export function publicPageOf(project: Pick<WorldProject, "publicPage">): PublicPage {
  return project.publicPage ?? defaultPublicPage();
}

/** Mise à jour pure : la visibilité d'un bloc se change en un clic, sans
 *  toucher aux liaisons. */
export function withBlockVisibility(page: PublicPage, blockId: string, visibility: PublicBlockVisibility): PublicPage {
  return { blocks: page.blocks.map((block) => (block.id === blockId ? { ...block, visibility } : block)) };
}

/* ── Projection ─────────────────────────────────────────────────── */

export type PublicMomentProjection = {
  id: string;
  title: string;
  time: number;
  location?: string;
};

export type ResolvedPublicBlock =
  | { id: string; type: "text"; field: PublicTextField; text: string }
  | { id: string; type: "visual"; visual: WorldVisual }
  | { id: string; type: "moments"; moments: PublicMomentProjection[] }
  | { id: string; type: "missing"; reason: string };

/**
 * Un Moment ne devient public que par sa propre visibilité « audience » :
 * jamais par héritage du bloc, jamais par défaut. Les événéments privés
 * ou d'équipe existent, mais ils ne quittent pas le Monde.
 */
export function publicMoments(events: TimelineEvent[]): PublicMomentProjection[] {
  return events
    .filter((event) => event.visibility === "audience")
    .sort((a, b) => a.time - b.time)
    .map((event) => ({
      id: event.id,
      title: event.title,
      time: event.time,
      ...(event.location ? { location: event.location } : {}),
    }));
}

/**
 * Résout un bloc contre le Monde, en direct. Une source introuvable est
 * résolue « missing » — annoncée en édition, écartée de la page publique :
 * jamais un bloc cassé, jamais une valeur devinée.
 */
export function resolvePublicBlock(project: WorldProject, block: PublicPageBlock): ResolvedPublicBlock {
  const source = block.source;
  if (source.kind === "world") {
    const field = source.field;
    if (field === "title" || field === "subtitle") {
      const text = (project[field] ?? "").trim();
      return text
        ? { id: block.id, type: "text", field, text }
        : { id: block.id, type: "missing", reason: `world.${field}` };
    }
    const text = (project[field]?.value ?? "").trim();
    return text
      ? { id: block.id, type: "text", field, text }
      : { id: block.id, type: "missing", reason: `world.${field}` };
  }
  if (source.kind === "heroVisual") {
    return project.heroVisual
      ? { id: block.id, type: "visual", visual: project.heroVisual }
      : { id: block.id, type: "missing", reason: "heroVisual" };
  }
  if (source.kind === "document") {
    const document = project.documents.find((doc) => doc.id === source.documentId);
    return document?.url
      ? {
          id: block.id,
          type: "visual",
          visual: { kind: "image", url: document.url, ...(document.title ? { name: document.title } : {}) },
        }
      : { id: block.id, type: "missing", reason: `document:${source.documentId}` };
  }
  const moments = publicMoments(project.timeline);
  return moments.length
    ? { id: block.id, type: "moments", moments }
    : { id: block.id, type: "missing", reason: "timeline" };
}

/** La page publique projetée : blocs publics, sources résolues, blocs
 *  manquants écartés. C'est la fonction de la page servie. */
export function resolvePublicBlocks(project: WorldProject): ResolvedPublicBlock[] {
  return publicPageOf(project)
    .blocks.filter((block) => block.visibility === "public")
    .map((block) => resolvePublicBlock(project, block))
    .filter((block) => block.type !== "missing");
}

/** La page en mode Éditer : tout y est, y compris les blocs privés et les
 *  sources manquantes — on ne cache pas ce qu'on gouverne. */
export function resolvePublicBlocksForEdit(project: WorldProject): { block: PublicPageBlock; resolved: ResolvedPublicBlock }[] {
  return publicPageOf(project).blocks.map((block) => ({ block, resolved: resolvePublicBlock(project, block) }));
}
