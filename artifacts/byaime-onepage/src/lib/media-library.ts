import type { WorldVisual } from "./types";

/**
 * Editorial media supplied by the AIME / MINISITEWEDDING / WEDDINGCITY
 * repositories. They stay remote on purpose: the supplied CDN URLs are kept
 * as the source references and we do not duplicate a large media corpus in this repo.
 * Every item has semantic tags so AIME can recommend it from a Moment instead
 * of displaying a random decorative image.
 */
export type AimeMediaAsset = {
  id: string;
  label: string;
  url: string;
  tags: readonly string[];
  source: "MINISITEWEDDING" | "WEDDINGCITY" | "BYAIME" | "BYAIME_ONE_PAGE";
  zone: "ceremony" | "table" | "guests" | "prep" | "attire" | "music" | "flowers" | "portrait" | "film" | "transport" | "reception" | "venue" | "role" | "document";
};

const MINI = "https://cdn.jsdelivr.net/gh/mattmezstitchlab/MINISITEWEDDING@main/public/images";
const CITY = "https://cdn.jsdelivr.net/gh/mattmezstitchlab/WEDDINGCITY@main/public/editorial";
const CITY_PUBLIC = "https://cdn.jsdelivr.net/gh/mattmezstitchlab/WEDDINGCITY@main/public";
const BYAIME = "https://cdn.jsdelivr.net/gh/mattmezstitchlab/byaime@main";
const ONE_PAGE = "https://cdn.jsdelivr.net/gh/mattmezstitchlab/byaime-one-page@main/attached_assets";

const mini = (id: string, label: string, file: string, zone: AimeMediaAsset["zone"], ...tags: string[]): AimeMediaAsset => ({ id: `mini-${id}`, label, url: `${MINI}/${file}`, source: "MINISITEWEDDING", zone, tags: [zone, ...tags] });
const city = (id: string, label: string, file: string, zone: AimeMediaAsset["zone"], ...tags: string[]): AimeMediaAsset => ({ id: `city-${id}`, label, url: `${CITY}/${file}`, source: "WEDDINGCITY", zone, tags: [zone, ...tags] });
const cityPublic = (id: string, label: string, file: string, zone: AimeMediaAsset["zone"], ...tags: string[]): AimeMediaAsset => ({ id: `city-${id}`, label, url: `${CITY_PUBLIC}/${file}`, source: "WEDDINGCITY", zone, tags: [zone, ...tags] });
const byAime = (id: string, label: string, file: string, zone: AimeMediaAsset["zone"], ...tags: string[]): AimeMediaAsset => ({ id: `aime-${id}`, label, url: `${BYAIME}/${file}`, source: "BYAIME", zone, tags: [zone, ...tags] });
const onePage = (id: string, label: string, file: string, zone: AimeMediaAsset["zone"], ...tags: string[]): AimeMediaAsset => ({ id: `one-${id}`, label, url: `${ONE_PAGE}/${file}`, source: "BYAIME_ONE_PAGE", zone, tags: [zone, ...tags] });

export const AIME_MEDIA_LIBRARY: readonly AimeMediaAsset[] = [
  mini("alliances", "Les alliances", "alliances.jpg", "attire", "alliances", "engagement", "details"),
  mini("bouquet", "Le bouquet", "bouquet.jpg", "flowers", "fleurs", "bouquet", "ceremonie"),
  mini("brocante", "Brocante éditoriale", "brocante.jpg", "venue", "matiere", "vintage", "decor"),
  mini("brutal", "Brutal", "brutal.jpg", "reception", "architecture", "editorial"),
  mini("champagne", "Champagne", "champagne.jpg", "table", "cocktail", "toast", "fete"),
  mini("chateau", "Le château", "chateau.jpg", "venue", "lieu", "patrimoine", "architecture"),
  mini("cinema", "Cinéma", "cinema.jpg", "film", "film", "projection", "souvenir"),
  mini("club-amour", "Club amour", "club-amour.jpg", "music", "danse", "soiree", "bal"),
  mini("cosmic", "Cosmic", "cosmic.jpg", "reception", "nuit", "editorial"),
  mini("couple-paris", "Couple à Paris", "couple-paris.jpg", "portrait", "couple", "portrait", "ville"),
  mini("danse", "La danse", "danse.jpg", "music", "danse", "ouverture du bal", "soiree"),
  mini("desert-motel", "Desert motel", "desert-motel.jpg", "venue", "voyage", "lieu", "roadtrip"),
  mini("foret-noire", "Forêt noire", "foret-noire.jpg", "venue", "nature", "foret", "ceremonie"),
  mini("garden", "Garden", "garden.jpg", "flowers", "jardin", "nature", "cocktail"),
  mini("hero-wedding", "Hero wedding", "hero-wedding.jpg", "reception", "hero", "couple"),
  mini("laverie", "Laverie", "laverie.jpg", "reception", "editorial", "ville"),
  mini("noir-blanc", "Noir et blanc", "noir-blanc.jpg", "portrait", "photo", "documentaire"),
  mini("punk-papier", "Punk papier", "punk-papier.jpg", "document", "papeterie", "invitation"),
  mini("supermarche", "Supermarché", "supermarche.jpg", "reception", "editorial", "ville"),
  mini("table-noir", "Table noire", "table-noir.jpg", "table", "repas", "diner", "design"),
  mini("terrasse", "Terrasse", "terrasse.jpg", "venue", "lieu", "cocktail", "exterieur"),

  city("canvas", "Canvas", "canvas.jpg", "document", "moodboard", "composition"),
  city("cover-01", "Couverture 01", "covers/cover-01.jpg", "reception", "hero", "editorial"),
  city("cover-02", "Couverture 02", "covers/cover-02.jpg", "ceremony", "hero", "ceremonie"),
  city("cover-03", "Couverture 03", "covers/cover-03.jpg", "table", "hero", "repas"),
  city("grandjour", "Le grand jour", "grandjour-hero.jpg", "reception", "hero", "jour j"),
  city("hero", "Hero éditorial", "hero.jpg", "reception", "hero", "couple"),
  city("immersive", "Immersive", "immersive.jpg", "reception", "hero", "immersif"),
  city("matter", "Matter", "matter.jpg", "venue", "matiere", "decor"),
  city("mirror", "Mirror", "mirror.jpg", "portrait", "portrait", "reflet"),
  city("moment-after", "Après", "moments/after.jpg", "film", "apres", "souvenir"),
  city("moment-bal", "Bal", "moments/bal.jpg", "music", "bal", "danse", "soirée"),
  city("moment-ceremonie", "Cérémonie", "moments/ceremonie.jpg", "ceremony", "ceremonie", "vœux"),
  city("moment-cocktail", "Cocktail", "moments/cocktail.jpg", "table", "cocktail", "invites"),
  city("moment-dejeuner", "Déjeuner", "moments/dejeuner.jpg", "table", "dejeuner", "repas"),
  city("moment-diner", "Dîner", "moments/diner.jpg", "table", "diner", "repas"),
  city("moment-discours", "Discours", "moments/discours.jpg", "guests", "discours", "temoins"),
  city("moment", "Moment", "moments/moment.jpg", "portrait", "moment", "emotion"),
  city("moment-preparatifs", "Préparatifs", "moments/preparatifs.jpg", "prep", "preparatifs", "avant"),
  city("moment-soiree", "Soirée", "moments/soiree.jpg", "reception", "soiree", "fete"),
  city("people-mariee", "La mariée", "people/mariee.jpg", "portrait", "mariee", "tenue"),
  city("people-photographe", "Le photographe", "people/photographe.jpg", "portrait", "photographe", "prestataire"),
  city("people-temoin", "Le témoin", "people/temoin.jpg", "guests", "temoin", "role"),
  city("spectacle-coulisses", "Coulisses", "spectacle/coulisses.jpg", "prep", "regie", "coulisses"),
  city("spectacle-danseuse", "Danseuse", "spectacle/danseuse.jpg", "music", "danse", "spectacle"),
  city("spectacle-musicien", "Musicien", "spectacle/musicien.jpg", "music", "musique", "live"),
  city("spectacle-regie", "Régie", "spectacle/regie.jpg", "transport", "regie", "coordination"),
  city("world", "Le Monde", "world.jpg", "reception", "world", "hero"),
  cityPublic("thumbnail", "Miniature", "thumbnail.png", "reception", "thumbnail"),

  byAime("territory", "Territoire", "img/territory-landscape.jpg", "venue", "territoire", "paysage", "lieu"),
  byAime("transmission", "Transmission", "img/transmission-hands.webp", "guests", "mains", "transmission", "famille"),
  byAime("ecosystem", "Réseau", "public/img/ecosystem-network.jpg", "transport", "reseau", "relations", "ecosysteme"),

  onePage("role-temoin", "Rôle témoin", "13-hero-role-temoin-temoin_1788873454328.png", "role", "temoin", "responsabilite"),
  onePage("role-famille", "Rôle famille", "14-hero-role-famille-famille_1788873454327.png", "role", "famille", "responsabilite"),
  onePage("role-invite", "Rôle invité", "15-hero-role-invite-invite_1788873454327.png", "role", "invite", "responsabilite"),
  onePage("role-coordinateur", "Rôle coordinateur", "16-hero-role-coordinateur-coordinateur_1788873454327.png", "role", "coordinateur", "regie"),
  onePage("role-prestataire", "Rôle prestataire", "17-hero-role-prestataire-prestataire_1788873454327.png", "role", "prestataire", "brief"),
  onePage("role-lieu", "Rôle lieu", "18-hero-role-lieu-lieu_1788873454327.png", "role", "lieu", "venue"),
  onePage("detail-documents", "Documents couple", "23-detail-documents-couple_1788873469158.png", "document", "documents", "contrat"),
  onePage("detail-moodboard", "Moodboard couple", "30-detail-moodboard-couple_1788873454326.png", "document", "moodboard", "style"),
  onePage("detail-fleurs", "Fleurs couple", "31-detail-fleurs-couple_1788873454327.png", "flowers", "fleurs", "bouquet"),
  onePage("detail-inspirations", "Inspirations couple", "32-detail-inspirations-couple_1788873454326.png", "document", "inspiration", "moodboard"),
  onePage("etape-prestataires", "Étape prestataires", "33-etape-prestataires-couple_1788873454326.png", "portrait", "prestataires", "devis"),
  onePage("detail-hebergement", "Hébergement couple", "49-detail-hebergement-couple_1788873518927.png", "transport", "hebergement", "invites"),
  onePage("etape-cadeaux", "Cadeaux couple", "51-etape-cadeaux-couple_1788873518926.png", "guests", "cadeaux", "invites"),
  onePage("etape-cockpit", "Cockpit couple", "54-etape-cockpit-couple_1788873518925.png", "transport", "cockpit", "regie"),
] as const;

export const AIME_MEDIA_BY_ID = Object.fromEntries(AIME_MEDIA_LIBRARY.map(asset => [asset.id, asset]));

/** Choices expose the complete editorial corpus to the visual picker. */
export const AIME_MEDIA_CHOICES = AIME_MEDIA_LIBRARY.map(asset => ({
  zone: asset.zone,
  asset: asset.url,
  label: asset.label,
}));

const normalize = (value: string) => value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Score semantic relevance rather than choosing a random image. A tie prefers
 * editorial city assets, then the stable order of the user-provided corpus.
 */
export function findAimeMediaForText(text: string, preferredZone?: AimeMediaAsset["zone"]): AimeMediaAsset | null {
  const tokens = normalize(text).split(/[^a-z0-9]+/).filter(Boolean);
  let best: { asset: AimeMediaAsset; score: number } | null = null;
  for (const asset of AIME_MEDIA_LIBRARY) {
    const score = asset.tags.reduce((sum, tag) => sum + (tokens.includes(normalize(tag)) ? 4 : tokens.some(token => normalize(tag).includes(token) || token.includes(normalize(tag))) ? 1 : 0), 0)
      + (preferredZone && asset.zone === preferredZone ? 3 : 0)
      + (asset.source === "WEDDINGCITY" ? 0.2 : 0);
    if (score <= 0) continue;
    if (!best || score > best.score) best = { asset, score };
  }
  return best?.asset ?? null;
}

export function visualFromAimeMedia(asset: AimeMediaAsset): WorldVisual {
  return {
    kind: "image",
    url: asset.url,
    name: asset.label,
    overlay: 60,
    provenance: { source: "manifest", license: `Provided editorial asset · ${asset.source}` },
  };
}
