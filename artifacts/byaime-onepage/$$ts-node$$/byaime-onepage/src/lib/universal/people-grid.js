export function buildUniversalPeople(project, currentPerson) {
    return [
        {
            id: 'me:center',
            name: currentPerson.name?.trim() || 'Vous',
            role: 'Point zéro des vivants',
            type: 'me',
            zLayer: 0,
            imageUrl: currentPerson.imageUrl,
        },
        ...project.guests.map((guest) => ({
            id: `guest:${guest.id}`,
            name: guest.name,
            role: guest.role,
            contact: guest.contact,
            status: guest.rsvp,
            type: 'guest',
            zLayer: 1,
        })),
        ...project.providers.map((provider) => ({
            id: `provider:${provider.id}`,
            name: provider.name || provider.category,
            role: provider.role || provider.category,
            contact: provider.contact,
            status: provider.status,
            type: 'provider',
            zLayer: 2,
        })),
    ];
}
//# sourceMappingURL=people-grid.js.map