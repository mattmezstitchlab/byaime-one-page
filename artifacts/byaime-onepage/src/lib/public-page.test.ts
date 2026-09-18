import { describe, expect, it } from "vitest";
import { createInitialProject, parseIntention } from "./parser";
import { normalizeProject } from "./project-migration";
import {
  DEFAULT_PUBLIC_PAGE,
  defaultPublicPage,
  normalizePublicPage,
  publicMoments,
  publicPageOf,
  resolvePublicBlock,
  resolvePublicBlocks,
  resolvePublicBlocksForEdit,
  withBlockVisibility,
} from "./public-page";

const project = () => createInitialProject(parseIntention("Mariage le 14 août 2027 à Lille"), "Mariage le 14 août 2027 à Lille");

/*
 * Pont AIME-COMPOSER, tranche 1 — les tests qui verrouillent le modèle :
 * un bloc ne stocke qu'une liaison, la projection relit le Monde en
 * direct (Ripple), et rien ne devient public par héritage.
 */

describe("public page — composition déclarative", () => {
  it("la composition du kit ne stocke que des liaisons, jamais de valeurs", () => {
    const page = defaultPublicPage();
    const serialized = JSON.stringify(page);
    const world = project();
    expect(serialized).not.toContain(world.title);
    expect(serialized).not.toContain("data:");
    expect(serialized).not.toContain("http");
    expect(page.blocks.every((block) => !("text" in block) && !("visual" in block) && !("moments" in block))).toBe(true);
    expect(DEFAULT_PUBLIC_PAGE.blocks.map((block) => block.id)).toEqual(["pp-hero", "pp-title", "pp-subtitle", "pp-moments"]);
  });

  it("tout projet initial naît avec la page composée du kit", () => {
    const world = project();
    expect(publicPageOf(world).blocks).toHaveLength(4);
  });

  it("Ripple : changer la source change la page, sans toucher aux blocs", () => {
    const before = project();
    const renamed = { ...before, title: "Mariage Camille & Léo" };
    const resolvedText = resolvePublicBlocks(renamed)
      .filter((block) => block.type === "text" && block.field === "title") as Extract<ReturnType<typeof resolvePublicBlocks>[number], { type: "text" }>[];
    expect(resolvedText[0]?.text).toBe("Mariage Camille & Léo");
    /* Les blocs stockés n'ont pas bougé : ils ne contiennent toujours
       aucune copie de la valeur. */
    expect(renamed.publicPage).toEqual(before.publicPage);
    expect(JSON.stringify(renamed.publicPage)).not.toContain("Mariage Camille & Léo");
  });

  it("Ripple : le bloc visuel suit le visuel du Monde en direct", () => {
    const world = project();
    /* Le kit livre un visuel par défaut : le bloc héros le résout déjà. */
    const before = resolvePublicBlocks(world).find((block) => block.type === "visual");
    expect(before).toBeDefined();
    const withVisual = {
      ...world,
      heroVisual: { kind: "image" as const, url: "data:image/png;base64,abc" },
    };
    const visual = resolvePublicBlocks(withVisual).find((block) => block.type === "visual") as Extract<ReturnType<typeof resolvePublicBlocks>[number], { type: "visual" }> | undefined;
    expect(visual?.visual.url).toBe("data:image/png;base64,abc");
  });

  it("rien ne devient public par héritage : seuls les Moments « audience » sortent", () => {
    const world = project();
    const events = [
      { ...world.timeline[0], id: "m-public", title: "Cérémonie", time: 200, visibility: "audience" as const, location: "La chapelle" },
      { ...world.timeline[0], id: "m-equipe", title: "Brief équipe", time: 100, visibility: "equipe" as const },
      { ...world.timeline[0], id: "m-prive", title: "Sans-faute", time: 300, visibility: "prive" as const },
    ];
    const moments = publicMoments(events);
    expect(moments.map((moment) => moment.id)).toEqual(["m-public"]);
    expect(moments[0]).toMatchObject({ title: "Cérémonie", location: "La chapelle" });
  });

  it("un bloc privé n'atteint jamais la page servie, mais reste gouvernable en édition", () => {
    const world = project();
    const page = withBlockVisibility(publicPageOf(world), "pp-title", "prive");
    const gated = { ...world, publicPage: page };
    expect(resolvePublicBlocks(gated).some((block) => block.type === "text" && block.field === "title")).toBe(false);
    const editRows = resolvePublicBlocksForEdit(gated);
    const titleRow = editRows.find((row) => row.block.id === "pp-title");
    expect(titleRow?.block.visibility).toBe("prive");
    expect(titleRow?.resolved.type).toBe("text");
  });

  it("une source introuvable est écartée de la page et annoncée en édition", () => {
    /* Un Monde sans visuel (créé avant le réglage, ou importé) : le bloc
       héros n'a plus sa source — il est écarté, annoncé, jamais simulé. */
    const world = { ...project(), heroVisual: null };
    expect(resolvePublicBlocks(world).some((block) => block.id === "pp-hero")).toBe(false);
    const heroRow = resolvePublicBlocksForEdit(world).find((row) => row.block.id === "pp-hero");
    expect(heroRow?.resolved).toMatchObject({ type: "missing", reason: "heroVisual" });
  });

  it("un bloc visuel peut lier un document du Monde, et le suivre", () => {
    const world = project();
    const composed = {
      ...world,
      documents: [...world.documents, { id: "doc-menu", title: "Le menu", kind: "autre" as const, at: 0, url: "data:image/png;base64,menu" }],
      publicPage: {
        blocks: [
          { id: "pp-menu", type: "visual" as const, source: { kind: "document" as const, documentId: "doc-menu" }, visibility: "public" as const },
        ],
      },
    };
    const visual = resolvePublicBlocks(composed).find((block) => block.type === "visual") as Extract<ReturnType<typeof resolvePublicBlocks>[number], { type: "visual" }> | undefined;
    expect(visual?.visual.url).toBe("data:image/png;base64,menu");
    expect(resolvePublicBlock({ ...composed, documents: [] }, composed.publicPage.blocks[0])).toMatchObject({ type: "missing" });
  });

  it("la normalisation écarte les blocs invalides et ne devine jamais", () => {
    expect(normalizePublicPage(undefined)).toEqual(defaultPublicPage());
    expect(normalizePublicPage({ blocks: [] })).toEqual(defaultPublicPage());
    const page = normalizePublicPage({
      blocks: [
        { id: "ok", type: "text", source: { kind: "world", field: "title" }, visibility: "public" },
        { id: "bad-kind", type: "text", source: { kind: "inconnu" }, visibility: "public" },
        { id: "bad-type", type: "visual", source: { kind: "world", field: "title" }, visibility: "public" },
        { id: "", type: "text", source: { kind: "world", field: "title" }, visibility: "public" },
        { id: "bad-field", type: "text", source: { kind: "world", field: "budget" }, visibility: "public" },
        { id: "no-source", type: "text", visibility: "public" },
        { id: "visibilite-inconnue", type: "text", source: { kind: "world", field: "city" }, visibility: "nimporte" },
      ],
    });
    expect(page.blocks.map((block) => block.id)).toEqual(["ok", "visibilite-inconnue"]);
    expect(page.blocks[1].visibility).toBe("public"); // inconnu → public, jamais une valeur devinée
  });

  it("un Monde légué (avant la tranche) repart avec la page du kit, déterministe", () => {
    const legacy = { ...project(), publicPage: undefined } as never as ReturnType<typeof project>;
    const migrated = normalizeProject(legacy);
    expect(migrated.publicPage).toEqual(defaultPublicPage());
    expect(normalizeProject(legacy).publicPage).toEqual(migrated.publicPage);
  });
});
