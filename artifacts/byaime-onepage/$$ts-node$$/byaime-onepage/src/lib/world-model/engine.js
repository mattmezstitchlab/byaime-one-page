export class WorldEngine {
    providers = [];
    register(provider) {
        this.providers.push(provider);
    }
    async fetchEvents(timeRange, filter) {
        const results = await Promise.allSettled(this.providers.map(provider => provider.fetchEvents(timeRange, filter)));
        const successful = results
            .filter((result) => result.status === "fulfilled")
            .flatMap(result => result.value);
        if (results.length > 0 && successful.length === 0 && results.every(result => result.status === "rejected")) {
            throw new Error("Tous les fournisseurs de données sont indisponibles.");
        }
        return successful.sort((a, b) => a.timestamp - b.timestamp);
    }
    subscribe(callback, options) {
        const unsubs = this.providers.map(p => {
            try {
                return p.subscribe(callback, options);
            }
            catch (err) {
                console.error(`Provider ${p.id} subscribe failed:`, err);
                return () => { };
            }
        });
        return () => unsubs.forEach(fn => fn());
    }
}
//# sourceMappingURL=engine.js.map