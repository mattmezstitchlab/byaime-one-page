import { describe, expect, it } from "vitest";
import { assertProviderAccepted } from "./providerResponse";

describe("assertProviderAccepted", () => {
  it("accepte uniquement une réponse HTTP réussie", () => {
    expect(() => assertProviderAccepted({ ok: true, status: 202 }, "le message")).not.toThrow();
  });

  it("transforme un refus HTTP sans exception réseau en échec métier", () => {
    expect(() => assertProviderAccepted({ ok: false, status: 429 }, "le message"))
      .toThrow("Resend a refusé le message (429)");
  });
});