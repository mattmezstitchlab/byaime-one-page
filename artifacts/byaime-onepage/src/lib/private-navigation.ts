export const PRIVATE_PRIMARY_NAVIGATION = [
  {
    id: "profile",
    label: "Profil",
    description: "Votre identité, votre Timeline et Le Fil.",
    href: "/profile",
  },
  {
    id: "world",
    label: "Monde",
    description: "Le projet actif et ses outils.",
    href: "/user-portal",
  },
  {
    id: "laboratory",
    label: "Laboratoire",
    description: "Vos retours et leur contexte.",
    href: "/laboratoire",
  },
] as const;

export type PrivateDestinationId =
  (typeof PRIVATE_PRIMARY_NAVIGATION)[number]["id"];

export function getDesktopRailReservedWidth(isPinned: boolean): 80 | 276 {
  return isPinned ? 276 : 80;
}

export function getPrivateDestinationId(pathname: string): PrivateDestinationId {
  if (pathname.startsWith("/user-portal")) return "world";
  if (pathname.startsWith("/laboratoire")) return "laboratory";
  return "profile";
}
