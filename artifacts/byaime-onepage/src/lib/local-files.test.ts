import { describe, expect, it } from "vitest";
import {
  LOCAL_IMPORT_POLICY,
  guessMimeType,
  isAcceptedLocally,
  planLocalImports,
  readableLocalPath,
} from "./local-files";

const pick = (path: string, size = 120_000, type = "") => ({
  name: path.split("/").pop() as string,
  path,
  size,
  type,
});

describe("import de fichiers depuis l'ordinateur", () => {
  it("garde ce que le Monde sait lire", () => {
    const plan = planLocalImports([
      pick("Devis traiteur.pdf"),
      pick("Photos/cérémonie.jpeg"),
      pick("Plans/salle.png"),
      pick("Playlist.txt"),
    ]);
    expect(plan.accepted.map(item => item.path)).toEqual([
      "Devis traiteur.pdf",
      "Photos/cérémonie.jpeg",
      "Plans/salle.png",
      "Playlist.txt",
    ]);
    expect(plan.skipped).toHaveLength(0);
  });

  it("écarte les fichiers système de Mac et de Windows", () => {
    const plan = planLocalImports([
      pick(".DS_Store"),
      pick("Photos/.DS_Store"),
      pick("__MACOSX/._devis.pdf"),
      pick("Thumbs.db"),
      pick("Documents/desktop.ini"),
      pick("Devis.pdf"),
    ]);
    expect(plan.accepted.map(item => item.name)).toEqual(["Devis.pdf"]);
    expect(plan.skipped.every(entry => entry.reason === "fichier système ignoré")).toBe(true);
  });

  it("plafonne la taille, le nombre et la profondeur", () => {
    const huge = planLocalImports([pick("film-mariage.mp4", 80_000_000)]);
    expect(huge.accepted).toHaveLength(0);
    expect(huge.skipped[0].reason).toContain("Mo");

    const many = planLocalImports(
      Array.from({ length: LOCAL_IMPORT_POLICY.maxFiles + 3 }, (_, index) => pick(`devis-${index}.pdf`)),
    );
    expect(many.accepted).toHaveLength(LOCAL_IMPORT_POLICY.maxFiles);
    expect(many.skipped[0].reason).toContain(`${LOCAL_IMPORT_POLICY.maxFiles} fichiers`);

    const deep = planLocalImports([pick("a/b/c/d/e/f/devis.pdf")]);
    expect(deep.skipped[0].reason).toContain("trop profond");
  });

  it("se fie au type MIME quand l'extension manque", () => {
    const item = { name: "scan-2027", path: "scan-2027", size: 4000, type: "application/pdf" };
    expect(isAcceptedLocally(item)).toBe(true);
    expect(planLocalImports([item]).accepted).toHaveLength(1);
    expect(planLocalImports([{ name: "calendrier.ics", path: "calendrier.ics", size: 4000, type: "text/calendar" }]).skipped[0].reason)
      .toBe("format non accepté par ce Monde");
    expect(planLocalImports([pick("devis-0-octet.pdf", 0)]).skipped[0].reason).toBe("fichier vide");
  });

  it("raccourcit un long chemin par la fin, pour rester lisible", () => {
    const long = "Documents/Mariage 2027/Fournisseurs/Château de la Tour/devis-traiteur-final-v3.pdf";
    const short = readableLocalPath(long, 24);
    expect(short.length).toBeLessThanOrEqual(25);
    expect(short.startsWith("…")).toBe(true);
    expect(short.endsWith("final-v3.pdf")).toBe(true);
    expect(readableLocalPath("devis.pdf")).toBe("devis.pdf");
  });

  it("devine le type MIME à partir du nom", () => {
    expect(guessMimeType("Devis Traiteur.PDF")).toBe("application/pdf");
    expect(guessMimeType("photo-02.JPG")).toBe("image/jpeg");
    expect(guessMimeType("sortie.mp4")).toBe("video/mp4");
    expect(guessMimeType("notes-terrain")).toBe("application/octet-stream");
  });
});
