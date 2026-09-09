import { DIMENSIONS } from "./types";
export const CITIES = [
    { name: "Paris", country: "France", continent: "Europe", coords: [2.3522, 48.8566] },
    { name: "New York", country: "États-Unis", continent: "Amérique du Nord", coords: [-74.006, 40.7128] },
    { name: "Tokyo", country: "Japon", continent: "Asie", coords: [139.6917, 35.6895] },
    { name: "Londres", country: "Royaume-Uni", continent: "Europe", coords: [-0.1276, 51.5072] },
    { name: "Singapour", country: "Singapour", continent: "Asie", coords: [103.8198, 1.3521] },
    { name: "Berlin", country: "Allemagne", continent: "Europe", coords: [13.405, 52.52] },
    { name: "Sydney", country: "Australie", continent: "Océanie", coords: [151.2093, -33.8688] },
    { name: "Dubaï", country: "Émirats Arabes Unis", continent: "Moyen-Orient", coords: [55.2708, 25.2048] },
    { name: "Shanghai", country: "Chine", continent: "Asie", coords: [121.4737, 31.2304] },
    { name: "São Paulo", country: "Brésil", continent: "Amérique du Sud", coords: [-46.6333, -23.5505] },
    { name: "Lagos", country: "Nigeria", continent: "Afrique", coords: [3.3792, 6.5244] },
    { name: "Mumbai", country: "Inde", continent: "Asie", coords: [72.8777, 19.076] },
];
export const CONTINENTS = Array.from(new Set(CITIES.map(c => c.continent)));
export const COUNTRIES = Array.from(new Set(CITIES.map(c => c.country)));
function sfc32(a, b, c, d) {
    return function () {
        a >>>= 0;
        b >>>= 0;
        c >>>= 0;
        d >>>= 0;
        let t = (a + b) | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        d = d + 1 | 0;
        t = t + d | 0;
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    };
}
export function generateDemoEvents(count, baseTime) {
    const seed = Math.floor(baseTime);
    const rand = sfc32(seed, seed ^ 0xDEADBEEF, seed ^ 0xCAFEBABE, seed ^ 0x8BADF00D);
    const events = [];
    const dimensionKeys = DIMENSIONS;
    for (let i = 0; i < count; i++) {
        const city = CITIES[Math.floor(rand() * CITIES.length)];
        const dim = dimensionKeys[Math.floor(rand() * dimensionKeys.length)];
        // Spread: 70% within a month, 30% within 2 years
        const isRecent = rand() > 0.3;
        const timeSpread = isRecent ? (86400000 * 30) : (86400000 * 700);
        const offset = (rand() - 0.5) * timeSpread * 2;
        let title = "";
        let category = "";
        let type = "";
        let unit = undefined;
        let value = undefined;
        switch (dim) {
            case "Humanité":
                title = rand() > 0.5 ? "Naissance simulée" : "Mariage simulé";
                category = "Démographie";
                type = "human_event";
                break;
            case "Finance":
                title = "Transaction simulée";
                category = "Marchés";
                type = "financial_transaction";
                value = Math.floor(rand() * 10000000);
                unit = "USD";
                break;
            case "Économie":
                title = "Activité commerciale simulée";
                category = "Commerce";
                type = "trade_activity";
                break;
            case "Fiscalité":
                title = "Prélèvement simulé";
                category = "Taxes";
                type = "tax_event";
                break;
            case "Argent public":
                title = "Investissement public simulé";
                category = "Budget";
                type = "public_spending";
                value = Math.floor(rand() * 5000000);
                unit = "EUR";
                break;
            case "Précarité":
                title = "Demande d'hébergement simulée";
                category = "Social";
                type = "social_need";
                break;
            case "Mobilité":
                title = "Décollage simulé";
                category = "Transport aérien";
                type = "flight_departure";
                break;
            case "Environnement":
                title = "Mesure qualité de l'air simulée";
                category = "Qualité de l'air";
                type = "air_quality_reading";
                value = Math.floor(45 + rand() * 100);
                unit = "AQI";
                break;
        }
        events.push({
            id: `evt-${baseTime}-${i}`,
            type,
            dimension: dim,
            category,
            timestamp: baseTime + offset,
            location: city.name,
            country: city.country,
            continent: city.continent,
            coordinates: city.coords,
            value,
            unit,
            source: "AIME Global Simulation Engine",
            reliability: "simulation",
            updatedAt: Date.now(),
            title,
            description: `Donnée de simulation générée pour représenter une activité de type ${category}. Ne correspond à aucun événement réel.`,
            relations: [
                { id: `rel-${i}-1`, label: city.country }
            ]
        });
    }
    return events;
}
export class DemoProvider {
    id = "demo-provider";
    name = "AIME Simulation Engine";
    dimension = "all";
    applyFilter(events, filter) {
        if (!filter)
            return events;
        return events.filter(e => {
            if (filter.dimension && filter.dimension.length > 0 && !filter.dimension.includes(e.dimension))
                return false;
            if (filter.continent && e.continent !== filter.continent)
                return false;
            if (filter.country && e.country !== filter.country)
                return false;
            if (filter.location && e.location !== filter.location)
                return false;
            return true;
        });
    }
    async fetchEvents(timeRange, filter) {
        const baseTime = (timeRange[0] + timeRange[1]) / 2;
        const events = generateDemoEvents(2000, baseTime);
        const inRange = events.filter(e => e.timestamp >= timeRange[0] && e.timestamp <= timeRange[1]);
        return this.applyFilter(inRange, filter);
    }
    subscribe(callback, options) {
        const interval = setInterval(() => {
            const now = Date.now();
            const evts = generateDemoEvents(1, now);
            evts[0].timestamp = now; // Make it exactly now
            const filtered = this.applyFilter(evts, options?.filter);
            const inRange = !options?.range || (filtered[0] &&
                filtered[0].timestamp >= options.range[0] &&
                filtered[0].timestamp <= options.range[1]);
            if (filtered.length > 0 && inRange) {
                callback(filtered[0]);
            }
        }, 4000);
        return () => clearInterval(interval);
    }
}
//# sourceMappingURL=demo-provider.js.map