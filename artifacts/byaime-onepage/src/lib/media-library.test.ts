import { describe, expect, it } from "vitest";
import {
  AIME_MEDIA_BY_ID,
  AIME_MEDIA_CHOICES,
  AIME_MEDIA_LIBRARY,
  findAimeMediaForText,
  visualFromAimeMedia,
} from "./media-library";

describe("médiathèque éditoriale AIME", () => {
  it("conserve un catalogue distant dédupliqué et traçable", () => {
    expect(AIME_MEDIA_LIBRARY.length).toBeGreaterThanOrEqual(60);
    expect(new Set(AIME_MEDIA_LIBRARY.map(asset => asset.url)).size).toBe(AIME_MEDIA_LIBRARY.length);
    expect(new Set(AIME_MEDIA_LIBRARY.map(asset => asset.id)).size).toBe(AIME_MEDIA_LIBRARY.length);
    expect(AIME_MEDIA_LIBRARY.every(asset => asset.url.startsWith("https://cdn.jsdelivr.net/"))).toBe(true);
    expect(AIME_MEDIA_LIBRARY.every(asset => asset.tags.includes(asset.zone))).toBe(true);
    expect(AIME_MEDIA_LIBRARY.filter(asset => asset.source === "WEDDINGCITY").length).toBeGreaterThan(10);
    expect(AIME_MEDIA_BY_ID["one-etape-cockpit"]?.url).toContain("54-etape-cockpit-couple_1788873518925.png");
  });

  it("expose le même corpus aux sélecteurs et à la galerie", () => {
    expect(AIME_MEDIA_CHOICES).toHaveLength(AIME_MEDIA_LIBRARY.length);
    expect(AIME_MEDIA_CHOICES[0]).toMatchObject({ asset: AIME_MEDIA_LIBRARY[0].url, label: AIME_MEDIA_LIBRARY[0].label });
  });

  it("choisit un visuel selon le Moment, pas au hasard", () => {
    const ceremony = findAimeMediaForText("échange des vœux et cérémonie laïque", "ceremony");
    expect(ceremony?.id).toBe("city-moment-ceremonie");

    const flowers = findAimeMediaForText("bouquet et fleurs pour le cocktail", "flowers");
    expect(flowers?.zone).toBe("flowers");
    expect(flowers?.tags).toContain("fleurs");
  });

  it("convertit la référence du manifeste en visuel auditable", () => {
    const asset = AIME_MEDIA_BY_ID["one-detail-documents"]!;
    expect(visualFromAimeMedia(asset)).toMatchObject({
      kind: "image",
      url: asset.url,
      name: asset.label,
      provenance: { source: "manifest" },
    });
  });
});
