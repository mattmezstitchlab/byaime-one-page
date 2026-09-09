import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildLocalIdentifier,
  classifyDocumentType,
  classifyFileType,
  extractLightEntities,
  fingerprintFile,
  normalizeRelativePath,
  suggestForProject,
} from "./aimeLocalScan";

describe("aimeLocalScan", () => {
  it("classifies known extensions", () => {
    expect(classifyFileType("devis-traiteur.pdf")).toBe("pdf");
    expect(classifyFileType("photo-jour-j.jpg")).toBe("image");
    expect(classifyFileType("playlist.mp3")).toBe("audio");
  });

  it("normalizes and secures relative paths", () => {
    expect(normalizeRelativePath("..\\secret\\x.pdf")).toBe("secret/x.pdf");
    expect(normalizeRelativePath("./docs/../docs/devis.pdf")).toBe("docs/devis.pdf");
  });

  it("detects document type and entities", () => {
    expect(classifyDocumentType("devis-traiteur-lille.pdf")).toBe("devis");
    const entities = extractLightEntities("Contrat Mairie Lille 18/06/2027 4500€");
    expect(entities.places).toContain("Lille");
    expect(entities.dates.length).toBeGreaterThan(0);
    expect(entities.amounts.length).toBeGreaterThan(0);
  });

  it("produces a stable local identifier", () => {
    const id1 = buildLocalIdentifier({
      sourceFolder: "Documents",
      relativePath: "mariage/devis.pdf",
      size: 1200,
      modifiedAt: "2027-06-18T10:00:00.000Z",
    });
    const id2 = buildLocalIdentifier({
      sourceFolder: "Documents",
      relativePath: "mariage/devis.pdf",
      size: 1200,
      modifiedAt: "2027-06-18T10:00:00.000Z",
    });
    expect(id1).toBe(id2);
  });

  it("builds file fingerprint from metadata and bytes", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "aime-local-"));
    const file = path.join(dir, "devis.txt");
    await writeFile(file, "devis traiteur mariage");
    const a = await fingerprintFile(file);
    const b = await fingerprintFile(file);
    expect(a).toBe(b);
    expect(a.length).toBe(64);
  });

  it("returns suggestion when file matches project context", () => {
    const suggestion = suggestForProject(
      {
        name: "devis-traiteur-mariage-lille.pdf",
        documentType: "devis",
        entities: {
          people: [],
          places: ["Lille"],
          dates: [],
          amounts: [],
          events: ["mariage"],
          resources: ["traiteur"],
          organizations: [],
        },
      },
      { title: "Mariage de Sarah & Hugo", universe: "mariage", city: { value: "Lille" }, providers: [{ name: "Traiteur du Nord" }] },
    );
    expect(suggestion).not.toBeNull();
    expect(suggestion?.actions).toContain("import");
  });
});
