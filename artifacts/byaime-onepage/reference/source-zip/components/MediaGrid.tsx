import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Grid2x2, LayoutGrid, Plus, Rows3 } from "lucide-react";

type MediaView = "mur" | "mosaique" | "chrono";
const VIEW_KEY = "aime.media.view";
const VIEWS: { key: MediaView; label: string; icon: typeof LayoutGrid }[] = [
  { key: "mur", label: "Mur", icon: LayoutGrid },
  { key: "mosaique", label: "Mosaïque", icon: Grid2x2 },
  { key: "chrono", label: "Ligne de temps", icon: Rows3 },
];
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  addMedia,
  mediaQuery,
  removeMedia,
  swapMedia,
  updateMedia,
  mediaLabel,
  mediaThumb,
  type MediaItem,
  type NewMedia,
} from "@/lib/aime/media";
import { addPost } from "@/lib/aime/feed";
import { MediaTile } from "@/components/aime/media/MediaTile";
import { MediaViewer } from "@/components/aime/media/MediaViewer";
import { AddMediaDialog } from "@/components/aime/media/AddMediaDialog";

/**
 * La grille média publique d'AIME : la même surface pour une personne, un lieu,
 * une structure, un projet ou un événement. Publique en lecture, éditable par
 * le propriétaire seul.
 */
export function MediaGrid({
  cardId,
  eventId,
  canEdit,
  userId,
  emptyHint,
}: {
  cardId?: string | null;
  eventId?: string | null;
  canEdit: boolean;
  userId: string | null;
  emptyHint?: string;
}) {
  const target = useMemo(
    () => ({ cardId: cardId ?? null, eventId: eventId ?? null }),
    [cardId, eventId],
  );
  const qc = useQueryClient();
  const { data: items = [] } = useQuery(mediaQuery(target));
  const [viewer, setViewer] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [limit, setLimit] = useState(40);
  const [view, setView] = useState<MediaView>("mur");

  // Le regard choisi est retenu d'une visite à l'autre.
  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_KEY);
    if (saved === "mur" || saved === "mosaique" || saved === "chrono") setView(saved);
  }, []);
  const pickView = (v: MediaView) => {
    setView(v);
    window.localStorage.setItem(VIEW_KEY, v);
  };

  const refresh = () => qc.invalidateQueries({ queryKey: ["media-items", target.cardId, target.eventId] });

  const add = useMutation({
    mutationFn: async (media: NewMedia) => {
      const next = (items.at(-1)?.position ?? -1) + 1;
      await addMedia(target, media, userId, next);
    },
    onSuccess: () => {
      refresh();
      toast("Média ajouté");
    },
    onError: (e) => toast((e as Error).message),
  });

  const act = useMutation({
    mutationFn: async (fn: () => Promise<void>) => fn(),
    onSuccess: () => refresh(),
    onError: (e) => toast((e as Error).message),
  });

  const move = (item: MediaItem, dir: -1 | 1) => {
    const i = items.findIndex((m) => m.id === item.id);
    const other = items[i + dir];
    if (!other) return;
    act.mutate(() => swapMedia(item, other));
  };

  const feature = (item: MediaItem) => {
    if (!cardId) return;
    act.mutate(async () => {
      const { error } = await supabase
        .from("cards")
        .update({ image_url: item.url } as never)
        .eq("id", cardId);
      if (error) throw error;
      toast("Visuel principal mis à jour");
    });
  };

  const rename = (item: MediaItem) => {
    const title = window.prompt("Titre du média", item.title ?? "");
    if (title === null) return;
    act.mutate(() => updateMedia(item.id, { title: title.trim() || null }));
  };

  const ordered = useMemo(() => {
    if (view !== "chrono") return items;
    return [...items].sort(
      (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime(),
    );
  }, [items, view]);
  const shown = ordered.slice(0, limit);

  const copyLink = (item: MediaItem) => {
    void navigator.clipboard.writeText(item.url).then(
      () => toast("Lien copié"),
      () => toast("Copie impossible"),
    );
  };

  const publish = (item: MediaItem) => {
    if (!cardId || !userId) return;
    act.mutate(async () => {
      await addPost({
        cardId,
        authorId: userId,
        body: item.title ?? null,
        mediaUrl: item.url,
        mediaKind: item.kind === "youtube" ? "lien" : item.kind,
      });
      toast("Publié dans le fil");
    });
  };

  const toTimeline = (item: MediaItem) => {
    if (!cardId) return;
    act.mutate(async () => {
      const { error } = await supabase.from("card_timeline_entries").insert({
        card_id: cardId,
        title: item.title ?? mediaLabel(item),
        kind: "souvenir",
        starts_at: item.created_at ?? new Date().toISOString(),
        status: "a_valider",
        metadata: {
          mediaUrl: item.url,
          thumbUrl: mediaThumb(item),
          media: item.kind,
          origine: { mediaItemId: item.id },
        },
      } as never);
      if (error) throw error;
      toast("Posé sur la ligne de temps — la date reste à confirmer");
    });
  };

  const tiles = (list: MediaItem[]) =>
    list.map((item) => (
      <MediaTile
        key={item.id}
        item={item}
        canEdit={canEdit}
        onOpen={() => setViewer(ordered.findIndex((m) => m.id === item.id))}
        onRemove={() => act.mutate(() => removeMedia(item.id))}
        onMove={(dir) => move(item, dir)}
        onFeature={() => feature(item)}
        onRename={() => rename(item)}
        onCopyLink={() => copyLink(item)}
        {...(cardId && userId ? { onPublish: () => publish(item) } : {})}
        {...(cardId ? { onToTimeline: () => toTimeline(item) } : {})}
      />
    ));

  const gridClass =
    view === "mosaique"
      ? "grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-8"
      : "grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4";

  const byYear = new Map<string, MediaItem[]>();
  if (view === "chrono") {
    for (const m of shown) {
      const y = new Date(m.created_at ?? Date.now()).getFullYear().toString();
      byYear.set(y, [...(byYear.get(y) ?? []), m]);
    }
  }

  if (items.length === 0 && !canEdit) {
    return emptyHint ? <p className="text-[15px] text-muted-foreground">{emptyHint}</p> : null;
  }

  const addTile = canEdit ? (
    <button
      type="button"
      onClick={() => setAdding(true)}
      className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-hairline bg-secondary/50 text-muted-foreground transition-colors hover:bg-secondary"
    >
      <Plus className="h-5 w-5" strokeWidth={1.75} />
      <span className="text-[12.5px]">Ajouter</span>
    </button>
  ) : null;

  return (
    <div>
      {items.length > 1 && (
        <div className="mb-3 flex justify-end gap-1">
          {VIEWS.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => pickView(v.key)}
                aria-pressed={view === v.key}
                aria-label={v.label}
                title={v.label}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  view === v.key
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </button>
            );
          })}
        </div>
      )}

      {view === "chrono" ? (
        <div className="space-y-6">
          {[...byYear.entries()].map(([year, list]) => (
            <div key={year}>
              <p className="mb-2 text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                {year}
              </p>
              <div className={gridClass}>{tiles(list)}</div>
            </div>
          ))}
          {addTile && <div className={gridClass}>{addTile}</div>}
        </div>
      ) : (
        <div className={gridClass}>
          {tiles(shown)}
          {addTile}
        </div>
      )}

      {items.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + 40)}
          className="mt-4 rounded-full hairline bg-card px-4 py-2 text-[13px]"
        >
          Voir plus de médias
        </button>
      )}

      {viewer !== null && (
        <MediaViewer
          items={ordered}
          index={viewer}
          onIndex={setViewer}
          onClose={() => setViewer(null)}
        />
      )}

      {adding && (
        <AddMediaDialog
          userId={userId}
          cardId={cardId ?? null}
          onClose={() => setAdding(false)}
          onAdd={async (media) => {
            await add.mutateAsync(media);
          }}
        />
      )}
    </div>
  );
}
