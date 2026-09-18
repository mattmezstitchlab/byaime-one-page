import { describe, expect, it } from "vitest";
import { resolveRequestId } from "./requestId";

const generate = () => "generated-id";

describe("resolveRequestId", () => {
  it("reprend l'identifiant transmis par le client quand il est exploitable", () => {
    expect(resolveRequestId("req-1", generate)).toBe("req-1");
    expect(resolveRequestId("  0f8fad5b-d9cb-469f-a165-70867728950e ", generate)).toBe(
      "0f8fad5b-d9cb-469f-a165-70867728950e",
    );
  });

  it("génère toujours un identifiant quand l'en-tête est absent ou vide", () => {
    expect(resolveRequestId(undefined, generate)).toBe("generated-id");
    expect(resolveRequestId("", generate)).toBe("generated-id");
    expect(resolveRequestId("   ", generate)).toBe("generated-id");
  });

  it("ne garde que le premier en-tête quand il est répété", () => {
    expect(resolveRequestId(["req-a", "req-b"], generate)).toBe("req-a");
    expect(resolveRequestId([], generate)).toBe("generated-id");
  });

  it("refuse une valeur hors format (injection de journal, taille) et en génère une", () => {
    expect(resolveRequestId("abc\ndef", generate)).toBe("generated-id");
    expect(resolveRequestId("<script>", generate)).toBe("generated-id");
    expect(resolveRequestId("x".repeat(129), generate)).toBe("generated-id");
  });

  it("produit par défaut un UUID", () => {
    expect(resolveRequestId(undefined)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
