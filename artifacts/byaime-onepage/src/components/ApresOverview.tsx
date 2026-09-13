import { useEffect, useState } from "react";
import { Camera, Clapperboard, Heart } from "lucide-react";
import { useProject } from "@/store/project-store";
import { queueWorldFocus } from "@/lib/world-focus";
import { WorldClosure } from "./WorldClosure";

type OverviewMedia = {
  id: string;
  name: string;
  contentType: string;
  guestName?: string | null;
  caption?: string | null;
  moderationStatus: "pending" | "approved" | "rejected";
};

type OverviewSongRequest = {
  id: string;
  guestName?: string | null;
  title: string;
  artist: string;
  message?: string | null;
};

type OverviewFile = { id: string; contentType: string; guestId?: string | null };

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`/api${path}`);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/*
 * La tête du mode Après : trois cartes — Galerie, Mots doux, Film — qui
 * montrent les comptes réels et un aperçu du contenu, et ouvrent les bonnes
 * sections d'un clic. Sans photo ni mot ni vidéo, les cartes restent visibles
 * et disent d'où viendra le contenu : l'Après ne ressemble plus à une
 * timeline vide, même avant les premiers retours d'invités.
 */
export function ApresOverview() {
  const { project, currentRole, updateProject } = useProject();
  const [media, setMedia] = useState<OverviewMedia[]>([]);
  const [songs, setSongs] = useState<OverviewSongRequest[]>([]);
  const [files, setFiles] = useState<OverviewFile[]>([]);

  const canManage = currentRole === "owner" || currentRole === "planner";
  const projectId = project?.id;

  useEffect(() => {
    if (!projectId || !canManage) return;
    void fetchJson<OverviewMedia[]>(`/projects/${projectId}/participant-media`).then(rows => rows && setMedia(rows));
    void fetchJson<OverviewSongRequest[]>(`/projects/${projectId}/song-requests`).then(rows => rows && setSongs(rows));
    void fetchJson<OverviewFile[]>(`/projects/${projectId}/files`).then(rows => rows && setFiles(rows));
  }, [canManage, projectId]);

  if (!project) return null;

  const photos = media.filter(item => item.contentType.startsWith("image/") && item.moderationStatus === "approved");
  const videos = [
    ...files.filter(file => file.contentType.startsWith("video/") && !file.guestId),
    ...media.filter(item => item.contentType.startsWith("video/") && item.moderationStatus === "approved"),
  ];
  const dedications = songs.filter(song => song.message?.trim());
  const captions = media.filter(item => item.caption?.trim() && item.moderationStatus !== "rejected");
  const noted = project.memories.filter(item => item.kind === "message");
  const wordsCount = dedications.length + captions.length + noted.length;
  const latestWord =
    dedications[dedications.length - 1]?.message?.trim() ||
    captions[captions.length - 1]?.caption?.trim() ||
    noted[noted.length - 1]?.title;

  return (
    <section data-testid="apres-overview" aria-label="L'Après en trois gestes" className="mx-auto w-full max-w-4xl px-4 pt-8 sm:px-6">
      <p className="text-[10px] uppercase tracking-[.24em] text-foreground/40">Après le Jour J</p>
      <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Souvenirs, mots doux et film, au même endroit.</h3>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <article data-testid="apres-overview-gallery" className="flex flex-col rounded-3xl border border-foreground/10 bg-card p-5">
          {photos.length > 0 ? (
            <span className="flex h-12 items-center">
              {photos.slice(0, 3).map((photo, index) => (
                <img
                  key={photo.id}
                  src={`/api/storage/files/${photo.id}`}
                  alt=""
                  loading="lazy"
                  style={{ zIndex: 10 - index, marginLeft: index === 0 ? 0 : -12 }}
                  className="relative h-12 w-12 rounded-full border-2 border-card object-cover"
                />
              ))}
            </span>
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-foreground/10 bg-foreground/5 text-foreground/45">
              <Camera className="h-5 w-5" />
            </span>
          )}
          <h4 className="mt-4 text-sm font-medium">Galerie des invités</h4>
          <p className="mt-1 text-xs text-foreground/50">
            {photos.length === 0 ? "Aucune photo validée — elles arriveront depuis Contributions." : `${photos.length} photo${photos.length > 1 ? "s" : ""} validée${photos.length > 1 ? "s" : ""}.`}
          </p>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => queueWorldFocus({ panel: "memories" })}
            className="mt-4 w-fit rounded-full border border-foreground/15 px-4 py-1.5 text-xs transition hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          >
            Ouvrir la galerie
          </button>
        </article>

        <article data-testid="apres-overview-words" className="flex flex-col rounded-3xl border border-foreground/10 bg-card p-5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-foreground/10 bg-foreground/5 text-brand-accent/80">
            <Heart className="h-5 w-5" />
          </span>
          <h4 className="mt-4 text-sm font-medium">Mots doux</h4>
          {latestWord ? (
            <p className="mt-1 line-clamp-2 text-xs font-light italic leading-relaxed text-foreground/60">« {latestWord} »</p>
          ) : (
            <p className="mt-1 text-xs text-foreground/50">Dédicaces et légendes des invités, réunies ici.</p>
          )}
          <p className="mt-1 text-xs tabular-nums text-foreground/45">{wordsCount} mot{wordsCount > 1 ? "s" : ""} doux</p>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => queueWorldFocus({ panel: "thanks" })}
            className="mt-4 w-fit rounded-full border border-foreground/15 px-4 py-1.5 text-xs transition hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          >
            Lire et remercier
          </button>
        </article>

        <article data-testid="apres-overview-film" className="flex flex-col rounded-3xl border border-foreground/10 bg-card p-5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-foreground/10 bg-foreground/5 text-foreground/45">
            <Clapperboard className="h-5 w-5" />
          </span>
          <h4 className="mt-4 text-sm font-medium">Le film</h4>
          <p className="mt-1 text-xs text-foreground/50">
            {videos.length === 0 ? "Aucune vidéo livrée — déposez-la depuis Documents." : `${videos.length} vidéo${videos.length > 1 ? "s" : ""} à regarder.`}
          </p>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => queueWorldFocus({ panel: "film" })}
            className="mt-4 w-fit rounded-full border border-foreground/15 px-4 py-1.5 text-xs transition hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          >
            Regarder
          </button>
        </article>
      </div>

      <div className="mt-4">
        <WorldClosure
          closedAt={project.closure?.closedAt}
          canClose={currentRole === "owner"}
          onClose={() => updateProject({ closure: { closedAt: Date.now() } })}
          onReopen={() => updateProject({ closure: undefined })}
        />
      </div>
    </section>
  );
}
