import type { MusicSearchResult } from "./types";

export async function searchAppleMusic(term: string, signal: AbortSignal): Promise<MusicSearchResult[]> {
  const params = new URLSearchParams({ term, country: "fr", media: "music", entity: "song", limit: "12" });
  const response = await fetch(`https://itunes.apple.com/search?${params.toString()}`, { signal });
  if (!response.ok) throw new Error("Le catalogue musical n’est pas disponible pour le moment.");
  const body = (await response.json()) as { results?: Array<Record<string, unknown>> };
  return (body.results || [])
    .filter(
      (result) =>
        typeof result.trackId === "number" &&
        typeof result.trackName === "string" &&
        typeof result.artistName === "string",
    )
    .map((result) => ({
      provider: "apple_music" as const,
      externalId: String(result.trackId),
      title: String(result.trackName),
      artist: String(result.artistName),
      collectionName: typeof result.collectionName === "string" ? result.collectionName : undefined,
      artworkUrl:
        typeof result.artworkUrl100 === "string"
          ? result.artworkUrl100.replace("100x100", "300x300")
          : undefined,
      durationMs: typeof result.trackTimeMillis === "number" ? result.trackTimeMillis : undefined,
      previewUrl: typeof result.previewUrl === "string" ? result.previewUrl : undefined,
      trackUrl: typeof result.trackViewUrl === "string" ? result.trackViewUrl : undefined,
    }));
}
