import { DataProvider, WorldEvent, WorldEventFilter } from "./types";

export class WorldEngine {
  private providers: DataProvider[] = [];

  register(provider: DataProvider) {
    this.providers.push(provider);
  }

  async fetchEvents(timeRange: [number, number], filter?: WorldEventFilter): Promise<WorldEvent[]> {
    const results = await Promise.allSettled(
      this.providers.map(provider => provider.fetchEvents(timeRange, filter))
    );
    const successful = results
      .filter((result): result is PromiseFulfilledResult<WorldEvent[]> => result.status === "fulfilled")
      .flatMap(result => result.value);

    if (results.length > 0 && successful.length === 0 && results.every(result => result.status === "rejected")) {
      throw new Error("Tous les fournisseurs de données sont indisponibles.");
    }

    return successful.sort((a, b) => a.timestamp - b.timestamp);
  }

  subscribe(callback: (event: WorldEvent) => void, options?: { range?: [number, number], filter?: WorldEventFilter }): () => void {
    const unsubs = this.providers.map(p => {
      try {
        return p.subscribe(callback, options);
      } catch (err) {
        console.error(`Provider ${p.id} subscribe failed:`, err);
        return () => {};
      }
    });
    return () => unsubs.forEach(fn => fn());
  }
}
