import { describe, expect, it } from "vitest";
import {
  getDesktopRailReservedWidth,
  getPrivateDestinationId,
  PRIVATE_PRIMARY_NAVIGATION,
} from "./private-navigation";

describe("private navigation", () => {
  it("keeps the global destinations distinct", () => {
    expect(PRIVATE_PRIMARY_NAVIGATION.map(item => item.label)).toEqual([
      "Profil",
      "Monde",
      "Carte",
      "Laboratoire",
    ]);
    expect(new Set(PRIVATE_PRIMARY_NAVIGATION.map(item => item.href)).size).toBe(4);
  });

  it("uses the Profile as the safe private home", () => {
    expect(getPrivateDestinationId("/profile")).toBe("profile");
    expect(getPrivateDestinationId("/user-portal")).toBe("world");
    expect(getPrivateDestinationId("/network")).toBe("network");
    expect(getPrivateDestinationId("/laboratoire")).toBe("laboratory");
    expect(getPrivateDestinationId("/")).toBe("profile");
  });

  it("exposes only the declared private routes in the main rail", () => {
    expect(PRIVATE_PRIMARY_NAVIGATION.map(item => item.href)).toEqual([
      "/profile",
      "/user-portal",
      "/network",
      "/laboratoire",
    ]);
    expect(PRIVATE_PRIMARY_NAVIGATION.some(item => item.href === "/budget")).toBe(
      false,
    );
    expect(
      PRIVATE_PRIMARY_NAVIGATION.some(item => item.href === "/prestataires"),
    ).toBe(false);
  });

  it("reserves the expanded rail width only when pinned", () => {
    expect(getDesktopRailReservedWidth(false)).toBe(80);
    expect(getDesktopRailReservedWidth(true)).toBe(276);
  });
});