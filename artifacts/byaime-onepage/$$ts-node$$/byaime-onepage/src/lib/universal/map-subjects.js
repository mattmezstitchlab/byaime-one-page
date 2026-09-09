const CITY_COORDINATES = {
    paris: { latitude: 48.8566, longitude: 2.3522 },
    lille: { latitude: 50.6292, longitude: 3.0573 },
    lyon: { latitude: 45.764, longitude: 4.8357 },
    marseille: { latitude: 43.2965, longitude: 5.3698 },
    bordeaux: { latitude: 44.8378, longitude: -0.5792 },
    strasbourg: { latitude: 48.5734, longitude: 7.7521 },
    nantes: { latitude: 47.2184, longitude: -1.5536 },
    toulouse: { latitude: 43.6047, longitude: 1.4442 },
    nice: { latitude: 43.7102, longitude: 7.262 },
    rennes: { latitude: 48.1173, longitude: -1.6778 },
    roubaix: { latitude: 50.6942, longitude: 3.1746 },
    tourcoing: { latitude: 50.7236, longitude: 3.1611 },
    villeneuvedascq: { latitude: 50.6221, longitude: 3.1301 },
    arras: { latitude: 50.291, longitude: 2.7778 },
    lens: { latitude: 50.4292, longitude: 2.8318 },
    amiens: { latitude: 49.8941, longitude: 2.2958 },
    dunkerque: { latitude: 51.0344, longitude: 2.3768 },
    calais: { latitude: 50.9513, longitude: 1.8587 },
    bruxelles: { latitude: 50.8503, longitude: 4.3517 },
    londres: { latitude: 51.5074, longitude: -0.1278 },
    london: { latitude: 51.5074, longitude: -0.1278 },
    berlin: { latitude: 52.52, longitude: 13.405 },
    madrid: { latitude: 40.4168, longitude: -3.7038 },
    barcelone: { latitude: 41.3874, longitude: 2.1686 },
    lisbonne: { latitude: 38.7223, longitude: -9.1393 },
    rome: { latitude: 41.9028, longitude: 12.4964 },
    milan: { latitude: 45.4642, longitude: 9.19 },
    amsterdam: { latitude: 52.3676, longitude: 4.9041 },
    copenhague: { latitude: 55.6761, longitude: 12.5683 },
    stockholm: { latitude: 59.3293, longitude: 18.0686 },
    montreal: { latitude: 45.5019, longitude: -73.5674 },
    newyork: { latitude: 40.7128, longitude: -74.006 },
    losangeles: { latitude: 34.0522, longitude: -118.2437 },
    tokyo: { latitude: 35.6762, longitude: 139.6503 },
    sydney: { latitude: -33.8688, longitude: 151.2093 },
    dubai: { latitude: 25.2048, longitude: 55.2708 },
    casablanca: { latitude: 33.5731, longitude: -7.5898 },
    marrakech: { latitude: 31.6295, longitude: -7.9811 },
    dakar: { latitude: 14.7167, longitude: -17.4677 },
};
function normalizeLocation(value) {
    return value
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
}
export function findApproximateCityCoordinates(value) {
    if (!value)
        return undefined;
    const normalized = normalizeLocation(value);
    const city = Object.keys(CITY_COORDINATES).find((name) => normalized.includes(name));
    return city ? CITY_COORDINATES[city] : undefined;
}
export function mapSubjectKey(subject) {
    return `${subject.ref.kind}:${subject.ref.id}`;
}
export function buildMapSubjects(project) {
    const city = project.city.value ?? undefined;
    const cityCoordinates = findApproximateCityCoordinates(city);
    const venue = project.venue.value?.trim();
    const subjects = [
        {
            ref: { kind: 'world', id: project.id },
            label: project.title,
            summary: [project.universe, project.subtitle].filter(Boolean).join(' · '),
            locationLevel: 'world',
            city,
            ...(!venue ? cityCoordinates : undefined),
            primaryCapability: 'world.view',
        },
    ];
    if (venue) {
        subjects.push({
            ref: { kind: 'place', id: `${project.id}:venue` },
            label: venue,
            summary: city ? `Lieu du Monde · ${city}` : 'Lieu du Monde',
            locationLevel: 'world',
            city,
            ...cityCoordinates,
            primaryCapability: 'world.view',
        });
    }
    for (const event of project.timeline) {
        const eventCoordinates = findApproximateCityCoordinates(event.location);
        subjects.push({
            ref: { kind: 'moment', id: event.id },
            label: event.title,
            summary: event.detail || event.kind,
            locationLevel: 'world',
            city: event.location,
            ...eventCoordinates,
            primaryCapability: 'world.view',
        });
    }
    for (const provider of project.providers) {
        subjects.push({
            ref: { kind: 'card', id: provider.id },
            label: provider.name || provider.role,
            summary: provider.category,
            locationLevel: 'world',
            primaryCapability: 'world.view',
        });
    }
    return subjects;
}
//# sourceMappingURL=map-subjects.js.map