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
    {
        id: "laboratory",
        label: "Laboratoire",
        description: "Vos retours et leur contexte.",
        href: "/laboratoire",
    },
];
export function getDesktopRailReservedWidth(isPinned) {
    return isPinned ? 276 : 80;
}
export function getPrivateDestinationId(pathname) {
    if (pathname.startsWith("/user-portal"))
        return "world";
    if (pathname.startsWith("/network"))
        return "network";
    if (pathname.startsWith("/laboratoire"))
        return "laboratory";
    return "profile";
}
//# sourceMappingURL=private-navigation.js.map