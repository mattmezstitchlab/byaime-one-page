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
    id: "network",
    label: "Carte",
    description: "Les personnes et les Mondes reliés.",
    href: "/network",
  },
] as const;

export type PrivateDestinationId =
  (typeof PRIVATE_PRIMARY_NAVIGATION)[number]["id"];

export function getPrivateDestinationId(pathname: string): PrivateDestinationId {
  if (pathname.startsWith("/user-portal")) return "world";
  if (pathname.startsWith("/network")) return "network";
  return "profile";
}
