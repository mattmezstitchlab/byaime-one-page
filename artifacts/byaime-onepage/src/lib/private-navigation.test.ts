import { describe, expect, it } from "vitest";
import {
  getPrivateDestinationId,
  PRIVATE_PRIMARY_NAVIGATION,
} from "./private-navigation";

describe("private navigation", () => {
  /* 14/09 : la page Profil est retirée de l'espace privé. Le Monde est la
     seule destination globale. */
  it("keeps the World as the only global destination", () => {
    expect(PRIVATE_PRIMARY_NAVIGATION.map(item => item.label)).toEqual(["Monde"]);
    expect(new Set(PRIVATE_PRIMARY_NAVIGATION.map(item => item.href)).size).toBe(1);
  });

  it("resolves every private path to the World", () => {
    expect(getPrivateDestinationId("/user-portal")).toBe("world");
    expect(getPrivateDestinationId("/profile")).toBe("world");
    expect(getPrivateDestinationId("/")).toBe("world");
  });

  it("exposes only the declared private routes from the orb panel", () => {
    expect(PRIVATE_PRIMARY_NAVIGATION.map(item => item.href)).toEqual([
      "/user-portal",
    ]);
    expect(PRIVATE_PRIMARY_NAVIGATION.some(item => item.href === "/budget")).toBe(
      false,
    );
    expect(
      PRIVATE_PRIMARY_NAVIGATION.some(item => item.href === "/prestataires"),
    ).toBe(false);
  });

});