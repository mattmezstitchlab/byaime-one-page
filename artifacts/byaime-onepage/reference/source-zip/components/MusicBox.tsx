import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { bindAudioElement } from "@/lib/aime/audioBus";
import { Check, Music, Plus, Radio, Trash2, Upload, X } from "lucide-react";
import { MonthCalendar } from "@/components/aime/MonthCalendar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { musicboxQuery } from "@/lib/aime/queries";
import { formatDay, toDayKey } from "@/lib/aime/calendar";
import {
  KIND_DOT,
  KIND_LABEL,
  MUSICBOX_KINDS,
  VISIBILITY,
  embedInfo,
  entryStart,
  formatSlot,
  signedAudioUrl,
  type MusicboxEntry,
} from "@/lib/aime/musicbox";
import { cn } from "@/lib/utils";
import { useRadio } from "@/components/aime/RadioProvider";

type Props = {
  cardId?: string | null;
  eventId?: string | null;
  canManage?: boolean;
  collaborative?: boolean;
  city?: string | null;
  title?: string;
  intro?: string;
  /** Jour piloté par un calendrier externe (format YYYY-MM-DD). */
  day?: string | null;
  /** Masque le calendrier interne (quand la page en fournit déjà un). */
  hideCalendar?: boolean;
  /** Retire le cadre et l'introduction (usage en feuille latérale). */
  bare?: boolean;
  /** Incrémenter pour ouvrir le formulaire depuis l'extérieur (bouton cœur radio). */
  openSignal?: number;
  /** Type pré-sélectionné à l'ouverture externe. */
  presetKind?: string;
};

const EMPTY = {
  kind: "musique" as string,
  title: "",
  note: "",
  start_time: "20:00",
  duration_min: 4,
  source_type: "link" as "link" | "upload",
  source_url: "",
  dedicated_name: "",
  visibility: "public" as string,
};

export function MusicBox({
  cardId = null,
  eventId = null,
  canManage = false,
  collaborative = false,
  city = null,
  title = "MusicBox",
  intro,
  day: dayProp = null,
  hideCalendar = false,
  bare = false,
  openSignal = 0,
  presetKind,
}: Props) {
  const qc = useQueryClient();
  const { userId } = useAuth();
  const { current } = useRadio();
  const { data: entries = [] } = useQuery(musicboxQuery({ cardId, eventId }));
  const [month, setMonth] = useState(() => new Date());
  const [innerDay, setDay] = useState<string>(() => toDayKey(new Date()));
  const day = dayProp ?? innerDay;
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  /** Ouverture pilotée depuis le bouton cœur du mode Radio. */
  useEffect(() => {
    if (!openSignal) return;
    setForm((f) => ({ ...f, kind: presetKind ?? f.kind }));
    setOpen(true);
  }, [openSignal, presetKind]);

  const byDay = useMemo(() => {
    const m = new Map<string, MusicboxEntry[]>();
    for (const e of entries) {
      const list = m.get(e.day) ?? [];
      list.push(e);
      m.set(e.day, list);
    }
    return m;
  }, [entries]);

  const statusByDay = useMemo(() => {
    const m = new Map<string, string>();
    for (const [d, list] of byDay) m.set(d, list[0]!.kind);
    return m;
  }, [byDay]);

  const countByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const [d, list] of byDay) m.set(d, list.length);
    return m;
  }, [byDay]);

  const dayEntries = byDay.get(day) ?? [];
  const canPropose = !!userId && (canManage || collaborative);

  const save = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Connectez-vous pour programmer.");
      if (!form.title.trim()) throw new Error("Donnez un titre.");
      let audio_path: string | null = null;
      if (form.source_type === "upload") {
        if (!file) throw new Error("Choisissez un fichier audio.");
        const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("musicbox").upload(path, file);
        if (error) throw error;
        audio_path = path;
      }
      const { error } = await supabase.from("musicbox_entries").insert({
        owner_id: userId,
        card_id: cardId,
        event_id: eventId,
        day,
        start_time: form.start_time,
        duration_min: Number(form.duration_min) || 4,
        kind: form.kind,
        title: form.title.trim(),
        note: form.note.trim() || null,
        source_type: form.source_type,
        source_url: form.source_type === "link" ? form.source_url.trim() || null : null,
        audio_path,
        dedicated_name: form.dedicated_name.trim() || null,
        visibility: form.visibility,
        status: canManage ? "valide" : "propose",
        city,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["musicbox"] });
      qc.invalidateQueries({ queryKey: ["radio-program"] });
      setForm(EMPTY);
      setFile(null);
      setOpen(false);
      toast(canManage ? "Programmé" : "Proposition envoyée");
    },
    onError: (e: Error) => toast(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("musicbox_entries").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["musicbox"] });
      qc.invalidateQueries({ queryKey: ["radio-program"] });
    },
    onError: (e: Error) => toast(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("musicbox_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["musicbox"] });
      qc.invalidateQueries({ queryKey: ["radio-program"] });
      toast("Supprimé");
    },
    onError: (e: Error) => toast(e.message),
  });

  async function play(entry: MusicboxEntry) {
    if (entry.audio_path) {
      setBusy(true);
      const url = await signedAudioUrl(entry.audio_path);
      setBusy(false);
      if (url) {
        const el = new Audio(url);
        bindAudioElement("musicbox", el);
        el.play().catch(() => toast("Lecture impossible"));
      }
      return;
    }
    if (entry.source_url) window.open(entry.source_url, "_blank", "noopener");
  }

  const Wrapper = bare ? "div" : "section";

  return (
    <Wrapper className={bare ? "" : "rounded-3xl hairline bg-card p-5 shadow-soft"}>
      {!bare && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{title}</p>
            <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-muted-foreground">
              {intro ??
                "Chaque date devient une programmation : un morceau, un message, un récit, une tâche ou un rendez-vous, avec son créneau horaire."}
            </p>
          </div>
          <Music className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        </div>
      )}

      <div
        className={cn(
          "grid gap-6",
          bare ? "" : "mt-5",
          hideCalendar ? "" : "lg:grid-cols-[300px_1fr]",
        )}
      >
        {!hideCalendar && (
          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            statusByDay={statusByDay}
            dotClasses={KIND_DOT}
            countByDay={countByDay}
            selectedDay={day}
            onSelectDay={setDay}
            liveDay={current ? current.day : null}
            compact
          />
        )}

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[16px] font-medium first-letter:uppercase">{formatDay(day)}</h3>
            {canPropose && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[13px] text-primary-foreground"
              >
                {open ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {open ? "Fermer" : canManage ? "Programmer" : "Proposer"}
              </button>
            )}
          </div>

          {open && canPropose && (
            <div className="mt-4 space-y-3 rounded-2xl bg-secondary p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-[13px]">
                  Type
                  <select
                    value={form.kind}
                    onChange={(e) => setForm({ ...form, kind: e.target.value })}
                    className="mt-1 w-full rounded-xl hairline bg-background px-3 py-2 text-[14px]"
                  >
                    {MUSICBOX_KINDS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[13px]">
                  Titre
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="La Vie en rose"
                    className="mt-1 w-full rounded-xl hairline bg-background px-3 py-2 text-[14px]"
                  />
                </label>
                <label className="text-[13px]">
                  Heure
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="mt-1 w-full rounded-xl hairline bg-background px-3 py-2 text-[14px]"
                  />
                </label>
                <label className="text-[13px]">
                  Durée (min)
                  <input
                    type="number"
                    min={1}
                    value={form.duration_min}
                    onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl hairline bg-background px-3 py-2 text-[14px]"
                  />
                </label>
              </div>

              <div className="flex gap-2">
                {(["link", "upload"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, source_type: t })}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-[13px]",
                      form.source_type === t
                        ? "bg-primary text-primary-foreground"
                        : "hairline bg-background text-muted-foreground",
                    )}
                  >
                    {t === "link" ? "Lien externe" : "Fichier audio"}
                  </button>
                ))}
              </div>

              {form.source_type === "link" ? (
                <input
                  value={form.source_url}
                  onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                  placeholder="https://youtube.com/… ou Spotify, SoundCloud"
                  className="w-full rounded-xl hairline bg-background px-3 py-2 text-[14px]"
                />
              ) : (
                <label className="flex cursor-pointer items-center gap-2 rounded-xl hairline bg-background px-3 py-2 text-[14px] text-muted-foreground">
                  <Upload className="h-4 w-4" strokeWidth={1.75} />
                  {file ? file.name : "Choisir un fichier audio"}
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={form.dedicated_name}
                  onChange={(e) => setForm({ ...form, dedicated_name: e.target.value })}
                  placeholder="Dédicace à… (facultatif)"
                  className="w-full rounded-xl hairline bg-background px-3 py-2 text-[14px]"
                />
                <select
                  value={form.visibility}
                  onChange={(e) => setForm({ ...form, visibility: e.target.value })}
                  className="w-full rounded-xl hairline bg-background px-3 py-2 text-[14px]"
                >
                  {VISIBILITY.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Un mot, une annonce, le texte du récit…"
                rows={2}
                className="w-full rounded-xl hairline bg-background px-3 py-2 text-[14px]"
              />

              <button
                type="button"
                disabled={save.isPending}
                onClick={() => save.mutate()}
                className="rounded-full bg-primary px-4 py-2 text-[13px] text-primary-foreground disabled:opacity-50"
              >
                {save.isPending ? "Enregistrement…" : "Ajouter à la MusicBox"}
              </button>
            </div>
          )}

          <ul className="mt-4 space-y-2">
            {dayEntries.length === 0 && (
              <li className="text-[14px] text-muted-foreground">Rien de programmé ce jour-là.</li>
            )}
            {dayEntries
              .slice()
              .sort((a, b) => entryStart(a).getTime() - entryStart(b).getTime())
              .map((e) => {
                const live = current?.id === e.id;
                const embed = embedInfo(e.source_url);
                return (
                  <li
                    key={e.id}
                    className={cn(
                      "rounded-2xl bg-secondary px-3.5 py-3",
                      live && "ring-2 ring-rose-400",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            KIND_DOT[e.kind],
                            live && "animate-pulse",
                          )}
                        />
                        <div>
                          <p className="text-[14px] font-medium">{e.title}</p>
                          <p className="text-[12px] text-muted-foreground">
                            {formatSlot(e)} · {KIND_LABEL[e.kind] ?? e.kind}
                            {e.dedicated_name ? ` · pour ${e.dedicated_name}` : ""}
                            {e.status === "propose" ? " · proposition" : ""}
                            {e.visibility === "public" ? "" : " · privé"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {live && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-600">
                            <Radio className="h-3 w-3" strokeWidth={2} /> à l'antenne
                          </span>
                        )}
                        {(e.source_url || e.audio_path) && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => play(e)}
                            className="rounded-full hairline bg-background px-3 py-1 text-[12px]"
                          >
                            Écouter
                          </button>
                        )}
                        {canManage && e.status === "propose" && (
                          <button
                            type="button"
                            onClick={() => setStatus.mutate({ id: e.id, status: "valide" })}
                            className="grid h-7 w-7 place-items-center rounded-full hairline bg-background"
                            aria-label="Valider"
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </button>
                        )}
                        {(canManage || e.owner_id === userId) && (
                          <button
                            type="button"
                            onClick={() => remove.mutate(e.id)}
                            className="grid h-7 w-7 place-items-center rounded-full hairline bg-background text-muted-foreground"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </button>
                        )}
                      </div>
                    </div>
                    {e.note && (
                      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                        {e.note}
                      </p>
                    )}
                    {embed && embed.kind !== "link" && embed.kind !== "audio" && (
                      <iframe
                        src={embed.src}
                        title={e.title}
                        loading="lazy"
                        allow="autoplay; encrypted-media"
                        className="mt-3 h-[152px] w-full rounded-xl"
                      />
                    )}
                  </li>
                );
              })}
          </ul>
        </div>
      </div>
    </Wrapper>
  );
}
