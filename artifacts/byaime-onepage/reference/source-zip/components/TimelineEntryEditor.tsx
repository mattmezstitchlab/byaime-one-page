import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { STATUS_LABEL, type TimelineStatus } from "@/components/aime/HeroTimeline";
import { UNIVERSE_TREE } from "@/lib/aime/universeTree";

/**
 * Modifier un moment de la ligne de temps, entièrement.
 *
 * Tout ce qui est réellement stocké sur le moment est modifiable ici, et
 * écrit dans la vraie source (`card_timeline_entries`) : rien n'est recopié
 * ailleurs. Les informations sans colonne dédiée (phase, lieu, budget,
 * étiquettes) vivent dans les métadonnées du même enregistrement, à côté
 * des personnes et des pièces jointes déjà posées par la bulle.
 */

const FIELD =
  "w-full rounded-xl bg-white/12 px-2.5 py-1.5 text-[12.5px] text-white placeholder:text-white/45 outline-none focus:bg-white/20";
const CHIP =
  "inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-white/22 disabled:opacity-50";
const LABEL = "block text-[10.5px] uppercase tracking-wide text-white/45";

export const ENTRY_KINDS: { key: string; label: string }[] = [
  { key: "jalon", label: "Jalon" },
  { key: "tache", label: "Tâche" },
  { key: "intention", label: "Intention" },
  { key: "souvenir", label: "Souvenir" },
  { key: "document", label: "Document" },
  { key: "devis", label: "Devis" },
  { key: "facture", label: "Facture" },
  { key: "paiement", label: "Paiement" },
  { key: "option", label: "Option" },
];

export const PHASES: { key: string; label: string }[] = [
  { key: "avant", label: "Avant" },
  { key: "pendant", label: "Pendant" },
  { key: "apres", label: "Après" },
];

const PRIORITIES: { value: number; label: string }[] = [
  { value: 0, label: "Normale" },
  { value: 1, label: "Importante" },
  { value: 2, label: "Critique" },
];

const STATUSES = Object.keys(STATUS_LABEL) as TimelineStatus[];

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function str(meta: Record<string, unknown>, key: string): string {
  const v = meta[key];
  return typeof v === "string" ? v : "";
}

type Draft = {
  title: string;
  description: string;
  kind: string;
  starts: string;
  ends: string;
  due: string;
  status: string;
  priority: number;
  isPublic: boolean;
  universe: string;
  phase: string;
  location: string;
  budget: string;
  tags: string;
};

export function TimelineEntryEditor({
  entryId,
  onCancel,
  onSaved,
  onRemoved,
}: {
  entryId: string;
  onCancel: () => void;
  onSaved: () => void;
  onRemoved: () => void;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const row = useQuery({
    queryKey: ["timeline-entry", entryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_timeline_entries")
        .select("*")
        .eq("id", entryId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const r = row.data;
    if (!r) return;
    const meta = (r.metadata ?? {}) as Record<string, unknown>;
    const cents = typeof meta["amountCents"] === "number" ? (meta["amountCents"] as number) : null;
    const tags = Array.isArray(meta["tags"]) ? (meta["tags"] as unknown[]).filter((t) => typeof t === "string") : [];
    setDraft({
      title: r.title,
      description: r.description ?? "",
      kind: r.kind,
      starts: toLocalInput(r.starts_at),
      ends: toLocalInput(r.ends_at),
      due: toLocalInput(r.due_at),
      status: r.status,
      priority: r.priority ?? 0,
      isPublic: r.is_public,
      universe: r.universe_slug ?? "",
      phase: str(meta, "phase"),
      location: str(meta, "location"),
      budget: cents === null ? "" : String(cents / 100),
      tags: (tags as string[]).join(", "),
    });
  }, [row.data]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const save = useMutation({
    mutationFn: async () => {
      if (!draft || !row.data) throw new Error("Moment introuvable.");
      if (!draft.title.trim()) throw new Error("Donnez un titre à ce moment.");
      const startsAt = fromLocalInput(draft.starts);
      if (!startsAt) throw new Error("Indiquez une date de début.");
      const endsAt = fromLocalInput(draft.ends);
      if (endsAt && new Date(endsAt) < new Date(startsAt))
        throw new Error("La fin ne peut pas précéder le début.");
      const meta = { ...((row.data.metadata ?? {}) as Record<string, unknown>) };
      const setMeta = (key: string, value: unknown) => {
        if (value === null || value === "" || value === undefined) delete meta[key];
        else meta[key] = value;
      };
      setMeta("phase", draft.phase);
      setMeta("location", draft.location.trim());
      const euros = draft.budget.trim() === "" ? null : Number(draft.budget.replace(",", "."));
      setMeta("amountCents", euros === null || Number.isNaN(euros) ? null : Math.round(euros * 100));
      const tags = draft.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      setMeta("tags", tags.length ? tags : null);

      const { error } = await supabase
        .from("card_timeline_entries")
        .update({
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          kind: draft.kind,
          starts_at: startsAt,
          ends_at: endsAt,
          due_at: fromLocalInput(draft.due),
          status: draft.status,
          priority: draft.priority,
          is_public: draft.isPublic,
          universe_slug: draft.universe || null,
          metadata: meta as Json,
        })
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timeline-entry", entryId] });
      toast("Moment mis à jour");
      onSaved();
    },
    onError: (e: Error) => toast(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("card_timeline_entries").delete().eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast("Moment supprimé");
      onRemoved();
    },
    onError: (e: Error) => toast(e.message),
  });

  if (!draft) return <p className="text-[12px] text-white/60">Chargement du moment…</p>;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="max-h-[52vh] space-y-2 overflow-y-auto pr-0.5"
    >
      <div>
        <label className={LABEL} htmlFor={`t-${entryId}`}>
          Titre
        </label>
        <input
          id={`t-${entryId}`}
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Titre du moment"
          className={FIELD}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor={`d-${entryId}`}>
          Description
        </label>
        <textarea
          id={`d-${entryId}`}
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          placeholder="Ce qu'il faut savoir…"
          className={FIELD}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={LABEL} htmlFor={`s-${entryId}`}>
            Début
          </label>
          <input
            id={`s-${entryId}`}
            type="datetime-local"
            value={draft.starts}
            onChange={(e) => set("starts", e.target.value)}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor={`e-${entryId}`}>
            Fin
          </label>
          <input
            id={`e-${entryId}`}
            type="datetime-local"
            value={draft.ends}
            onChange={(e) => set("ends", e.target.value)}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor={`due-${entryId}`}>
            Échéance
          </label>
          <input
            id={`due-${entryId}`}
            type="datetime-local"
            value={draft.due}
            onChange={(e) => set("due", e.target.value)}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor={`k-${entryId}`}>
            Nature
          </label>
          <select
            id={`k-${entryId}`}
            value={draft.kind}
            onChange={(e) => set("kind", e.target.value)}
            className={FIELD}
          >
            {ENTRY_KINDS.map((k) => (
              <option key={k.key} value={k.key} className="text-black">
                {k.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor={`st-${entryId}`}>
            Statut
          </label>
          <select
            id={`st-${entryId}`}
            value={draft.status}
            onChange={(e) => set("status", e.target.value)}
            className={FIELD}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s} className="text-black">
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor={`p-${entryId}`}>
            Urgence
          </label>
          <select
            id={`p-${entryId}`}
            value={draft.priority}
            onChange={(e) => set("priority", Number(e.target.value))}
            className={FIELD}
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value} className="text-black">
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor={`ph-${entryId}`}>
            Moment du projet
          </label>
          <select
            id={`ph-${entryId}`}
            value={draft.phase}
            onChange={(e) => set("phase", e.target.value)}
            className={FIELD}
          >
            <option value="" className="text-black">
              Non précisé
            </option>
            {PHASES.map((p) => (
              <option key={p.key} value={p.key} className="text-black">
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor={`u-${entryId}`}>
            Univers
          </label>
          <select
            id={`u-${entryId}`}
            value={draft.universe}
            onChange={(e) => set("universe", e.target.value)}
            className={FIELD}
          >
            <option value="" className="text-black">
              Aucun
            </option>
            {UNIVERSE_TREE.map((u) => (
              <option key={u.slug} value={u.slug} className="text-black">
                {u.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL} htmlFor={`l-${entryId}`}>
            Lieu
          </label>
          <input
            id={`l-${entryId}`}
            value={draft.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Adresse, salle, ville…"
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor={`b-${entryId}`}>
            Budget (€)
          </label>
          <input
            id={`b-${entryId}`}
            inputMode="decimal"
            value={draft.budget}
            onChange={(e) => set("budget", e.target.value)}
            placeholder="0"
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <label className={LABEL} htmlFor={`tag-${entryId}`}>
          Étiquettes
        </label>
        <input
          id={`tag-${entryId}`}
          value={draft.tags}
          onChange={(e) => set("tags", e.target.value)}
          placeholder="séparées par des virgules"
          className={FIELD}
        />
      </div>

      <label className="flex items-center gap-2 text-[12px] text-white/80">
        <input
          type="checkbox"
          checked={draft.isPublic}
          onChange={(e) => set("isPublic", e.target.checked)}
          className="h-3.5 w-3.5"
        />
        Visible par les visiteurs de la page
      </label>

      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <button type="submit" disabled={save.isPending} className={CHIP}>
          <Check className="h-3.5 w-3.5" strokeWidth={2} />
          Enregistrer
        </button>
        <button type="button" onClick={onCancel} className={CHIP}>
          Annuler
        </button>
        <button
          type="button"
          disabled={remove.isPending}
          onClick={() => remove.mutate()}
          className={`${CHIP} ml-auto text-rose-200 hover:bg-rose-500/25`}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          Supprimer
        </button>
      </div>
    </form>
  );
}
