import { describe, expect, it } from "vitest";
import {
  getDesktopRailReservedWidth,
  getPrivateDestinationId,
  PRIVATE_PRIMARY_NAVIGATION,
} from "./private-navigation";

describe("private navigation", () => {
  it("keeps the three global destinations distinct", () => {
    expect(PRIVATE_PRIMARY_NAVIGATION.map(item => item.label)).toEqual([
      "Profil",
      "Monde",
      "Carte",
    ]);
    expect(new Set(PRIVATE_PRIMARY_NAVIGATION.map(item => item.href)).size).toBe(3);
  });

  it("uses the Profile as the safe private home", () => {
    expect(getPrivateDestinationId("/profile")).toBe("profile");
    expect(getPrivateDestinationId("/user-portal")).toBe("world");
    expect(getPrivateDestinationId("/network")).toBe("network");
    expect(getPrivateDestinationId("/")).toBe("profile");
  });

  it("reserves the expanded rail width only when pinned", () => {
    expect(getDesktopRailReservedWidth(false)).toBe(64);
    expect(getDesktopRailReservedWidth(true)).toBe(260);
  });
});