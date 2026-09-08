import { describe, expect, it } from "vitest";
import { pendingSaveOutcomeNotice } from "./pending-save-notice";

describe("pending save notices", () => {
  it("only confirms an unpublish after persistence succeeds", () => {
    expect(
      pendingSaveOutcomeNotice("saved", "Profil masqué au public"),
    ).toBe("Profil masqué au public");
  });

  it("never reports a successful unpublish after an error or conflict", () => {
    expect(
      pendingSaveOutcomeNotice(
        "error",
        "Profil masqué au public",
        "Enregistrement impossible",
      ),
    ).toBe("Enregistrement impossible");
    expect(
      pendingSaveOutcomeNotice("conflict", "Profil masqué au public"),
    ).toContain("Modification non enregistrée");
  });
});