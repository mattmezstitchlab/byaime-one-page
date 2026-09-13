import { describe, expect, it } from "vitest";
import { dispooComposerUrl, dispooProUrl, dispooSearchUrl, dispooUrl } from "./partner-links";

describe("partner links (byaime → dispoo)", () => {
  it("builds absolute dispoo links with stable UTM tags", () => {
    const link = new URL(dispooUrl("/recherche", { placement: "providers" }));
    expect(link.origin).toBe("https://dispoo.app");
    expect(link.pathname).toBe("/recherche");
    expect(link.searchParams.get("utm_source")).toBe("byaime");
    expect(link.searchParams.get("utm_medium")).toBe("providers");
    expect(link.searchParams.get("utm_campaign")).toBe("mariage");
  });

  it("prefills the trade and the city from the World", () => {
    const link = new URL(dispooSearchUrl("assistant", { query: "Photographe mariage", city: "Lille" }));
    expect(link.pathname).toBe("/recherche");
    expect(link.searchParams.get("q")).toBe("Photographe mariage");
    expect(link.searchParams.get("ville")).toBe("Lille");
    expect(link.searchParams.get("utm_medium")).toBe("assistant");
  });

  it("omits blank search terms and empty fields", () => {
    const link = new URL(dispooSearchUrl("footer", { query: "   " }));
    expect(link.searchParams.has("q")).toBe(false);
    expect(link.searchParams.has("ville")).toBe(false);
    expect(link.searchParams.get("utm_source")).toBe("byaime");
  });

  it("exposes the composer and pro entries", () => {
    expect(new URL(dispooComposerUrl("folders")).pathname).toBe("/composer");
    expect(new URL(dispooProUrl("footer")).pathname).toBe("/professionnels");
  });
});
