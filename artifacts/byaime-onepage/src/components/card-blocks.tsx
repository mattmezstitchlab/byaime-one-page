import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Image as ImageIcon, ImagePlus, Search, X } from "lucide-react";
import { PRESENCE_MOMENTS, ROLE_GROUPS, type CardMusic, type Participation, type UniversalCard } from "@workspace/aime-domain";
import { searchAppleMusic } from "@/lib/music-search";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { MusicSearchResult } from "@/lib/types";

/*
 * Les blocs métier de la carte, extraits de `UniversalCardForm`.
 *
 * Pourquoi un fichier à part : le Oneboarding (`components/oneboarding/`) pose
 * exactement les mêmes questions que `/ma-carte`. Recopier ces champs aurait
 * créé deux formulaires concurrents — deux endroits où une règle de validation
 * diverge. Ici, il n'y a qu'une implémentation, rendue par les deux parcours.
 *
 * Ces composants ne savent ni où ils sont, ni ce qui sera enregistré : ils
 * lisent et écrivent l'état qu'on leur passe.
 */

export const cardInputStyle =
  "mt-1 min-h-11 w-full rounded-xl border border-white/25 bg-[#262320] px-3 py-2 text-white";
export const cardButtonStyle =
  "min-h-11 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black disabled:opacity-40";

function localDate(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        className={cardInputStyle}
        type="datetime-local"
        value={localDate(value)}
        onChange={(e) =>
          onChange(e.target.value ? new Date(e.target.value).toISOString() : "")
        }
      />
    </label>
  );
}

/** Photo, prénom, nom, pseudo, ville — puis « Moi » : métier affiché et centres d'intérêt. */
export function IdentityFields({
  card,
  update,
  onError,
}: {
  card: UniversalCard;
  update: <K extends keyof UniversalCard>(key: K, value: UniversalCard[K]) => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <h3 className="text-lg">{t("cb.identity.title")}</h3>
      <p className="text-xs text-white/60">
        {t("cb.identity.hint")}
      </p>
      {/* La photo : un bouton clair et visible sur le fond noir (l'input de
          fichier brut s'y rendait invisible), aperçu rond, et « Retirer »
          au même niveau. */}
      <div>
        <p className="text-sm">{t("cb.identity.photoLabel")}</p>
        <div className="mt-2 flex items-center gap-4">
          {card.photoUrl ? (
            <img
              src={card.photoUrl}
              alt={t("cb.identity.photoAlt")}
              className="h-16 w-16 shrink-0 rounded-full border-2 border-white/25 object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-dashed border-white/30 text-white/40"
            >
              <ImageIcon className="h-6 w-6" />
            </span>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-white/25 bg-white/[0.06] px-4 text-[13px] font-medium text-white transition hover:border-white/50 hover:bg-white/10 focus-within:outline-none focus-within:ring-2 focus-within:ring-white/60">
              <ImagePlus className="h-4 w-4" aria-hidden />
              {card.photoUrl ? t("cb.identity.photoChange") : t("cb.identity.photoChoose")}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (
                    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
                    file.size > 500000
                  ) {
                    onError(t("cb.identity.photoError"));
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => update("photoUrl", String(reader.result));
                  reader.onerror = () => onError(t("cb.identity.photoReadError"));
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }}
              />
            </label>
            {card.photoUrl && (
              <button
                type="button"
                onClick={() => update("photoUrl", "")}
                className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-4 text-[13px] text-white/60 transition hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                {t("cb.identity.remove")}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["firstName", t("cb.field.firstName")],
            ["lastName", t("cb.field.lastName")],
            ["nickname", t("cb.field.nickname")],
            ["city", t("cb.field.city")],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-sm">
            {label}
            <input
              className={cardInputStyle}
              required={key === "firstName" || key === "lastName"}
              maxLength={100}
              value={card[key]}
              onChange={(e) => update(key, e.target.value)}
            />
          </label>
        ))}
      </div>
      <h3 className="border-t border-white/15 pt-5 text-lg">{t("cb.identity.me")}</h3>
      <label className="block text-sm">
        {t("cb.identity.profession")}
        <input
          className={cardInputStyle}
          maxLength={100}
          value={card.profession}
          onChange={(e) => update("profession", e.target.value)}
          placeholder={t("cb.identity.professionPlaceholder")}
        />
      </label>
      <p className="text-xs text-white/60">
        {t("cb.identity.interestsIntro")}
      </p>
      <label className="block text-sm">
        {t("cb.identity.interests")}
        <input
          className={cardInputStyle}
          value={card.interests.join(", ")}
          onChange={(e) =>
            update(
              "interests",
              e.target.value
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean),
            )
          }
          onBlur={() =>
            update(
              "interests",
              card.interests.map((v) => v.trim()).filter(Boolean),
            )
          }
        />
      </label>
    </>
  );
}

/**
 * La musique personnelle : rechercher → choisir → pochette → PLAY.
 *
 * Facultative, et le parcours doit pouvoir se terminer sans elle : un catalogue
 * injoignable propose « Réessayer » et « Continuer sans musique », jamais un
 * blocage.
 */
export function MusicPicker({
  music,
  onSelect,
  onClear,
  onSkipped,
  showTitle = true,
}: {
  /** Le morceau déjà sur la carte, quel que soit son fournisseur. */
  music?: CardMusic;
  onSelect: (result: MusicSearchResult) => void;
  onClear: () => void;
  onSkipped?: () => void;
  /** À false quand un cadre parent fournit déjà le titre (Oneboarding). */
  showTitle?: boolean;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MusicSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [musicError, setMusicError] = useState("");
  const searchController = useRef<AbortController | null>(null);
  /* Une recherche en vol est annulée au démontage : jamais de résultat qui
     arrive sur une étape déjà quittée. */
  useEffect(
    () => () => {
      searchController.current?.abort();
    },
    [],
  );

  const search = async () => {
    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    setSearching(true);
    setMusicError("");
    setResults([]);
    setSearched(false);
    try {
      const found = await searchAppleMusic(query, controller.signal);
      if (!controller.signal.aborted) {
        setResults(found);
        setSearched(true);
      }
    } catch {
      if (!controller.signal.aborted)
        setMusicError(t("cb.music.error"));
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  };

  return (
    <>
      {showTitle && (
        <h3 className="border-t border-white/15 pt-5 text-lg">{t("cb.music.title")}</h3>
      )}
      <p className="text-xs text-white/60">
        {t("cb.music.hint")}
      </p>
      <div>
        <label className="block text-sm">
          {t("cb.music.label")}
          <input
            className={cardInputStyle}
            value={query}
            placeholder={t("cb.music.placeholder")}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void search();
              }
            }}
          />
        </label>
        <button
          className={`${cardButtonStyle} mt-3`}
          type="button"
          disabled={searching || query.trim().length < 2}
          onClick={() => void search()}
        >
          {searching ? t("cb.music.searching") : t("cb.music.search")}
        </button>
        {musicError && (
          <div className="mt-3 rounded-xl border border-amber-200/30 p-4">
            <p role="alert" className="text-sm text-amber-100">
              {musicError}{t("cb.music.errorSuffix")}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                className={cardButtonStyle}
                disabled={searching || query.trim().length < 2}
                onClick={() => void search()}
              >
                {t("cb.music.retry")}
              </button>
              <button
                type="button"
                className="min-h-11 text-sm underline"
                onClick={() => {
                  searchController.current?.abort();
                  setSearching(false);
                  setMusicError("");
                  setResults([]);
                  setSearched(false);
                  onClear();
                  onSkipped?.();
                }}
              >
                {t("cb.music.skip")}
              </button>
            </div>
          </div>
        )}
        {searched && !musicError && !searching && !results.length && (
          <p role="status" className="mt-2 text-sm text-white/60">
            {t("cb.music.noResults")}
          </p>
        )}
        {results.length > 0 && (
          <ul className="mt-3 max-h-64 overflow-auto">
            {results.map((result) => (
              <li key={result.externalId}>
                <button
                  type="button"
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/10"
                  onClick={() => {
                    onSelect(result);
                    setResults([]);
                    setSearched(false);
                    setMusicError("");
                  }}
                >
                  {result.artworkUrl && (
                    <img
                      className="h-10 w-10 rounded"
                      src={result.artworkUrl}
                      alt=""
                    />
                  )}
                  <span>
                    {result.title}
                    <small className="block text-white/60">
                      {result.artist}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {music && (
        <div className="rounded-2xl border border-white/20 p-4">
          {music.artworkUrl && (
            <img
              src={music.artworkUrl}
              alt={t("cb.music.artworkAlt")}
              className="mb-3 h-20 w-20 rounded-lg"
            />
          )}
          <p>
            {music.title} · {music.artist}
          </p>
          {music.previewUrl ? (
            <>
              <span className="mt-2 block text-xs text-white/60">
                {t("cb.music.play")}
              </span>
              <audio
                aria-label={t("cb.music.listen", { title: music.title })}
                className="mt-2 w-full"
                controls
                preload="none"
                src={music.previewUrl}
              />
            </>
          ) : (
            <p className="text-sm text-white/60">{t("cb.music.noPreview")}</p>
          )}
          {music.trackUrl && (
            <a
              className="mt-2 block text-sm underline"
              href={music.trackUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t("cb.music.openApple")}
            </a>
          )}
          <button
            type="button"
            className="mt-3 text-sm underline"
            onClick={onClear}
          >
            {t("cb.music.remove")}
          </button>
        </div>
      )}
    </>
  );
}

/** Le morceau choisi, en lecture seule — pochette et extrait. */
export function MusicCard({ music }: { music: CardMusic }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-white/20 p-4">
      {music.artworkUrl && (
        <img
          src={music.artworkUrl}
          alt={t("cb.music.artworkAlt")}
          className="mb-3 h-20 w-20 rounded-lg"
        />
      )}
      <p>
        {music.title} · {music.artist}
      </p>
      {music.previewUrl ? (
        <>
          <span className="mt-2 block text-xs text-white/60">
            {t("cb.music.play")}
          </span>
          <audio
            aria-label={t("cb.music.listen", { title: music.title })}
            className="mt-2 w-full"
            controls
            preload="none"
            src={music.previewUrl}
          />
        </>
      ) : (
        <p className="text-sm text-white/60">{t("cb.music.noPreview")}</p>
      )}
      {music.trackUrl && (
        <a
          className="mt-2 block text-sm underline"
          href={music.trackUrl}
          target="_blank"
          rel="noreferrer"
        >
          {t("cb.music.openApple")}
        </a>
      )}
    </div>
  );
}

/**
 * Les rôles pour CE mariage — les 25 valeurs du modèle, en quatre groupes.
 * Multi-choix : une personne peut être à la fois photographe et saxophoniste.
 *
 * Présentation : un **menu dépliant**, pas un bloc vertical de cases à cocher.
 * Le bouton affiche la sélection (pastilles retirables) ; le panneau déroule
 * la liste groupée, avec une recherche. Noir comme le reste du Oneboarding.
 *
 * Le composant reste la seule implémentation du choix des rôles : le
 * Oneboarding et `/ma-carte` le partagent, et les deux écrans restent
 * cohérents d'eux-mêmes.
 */
export function RolesPicker({
  roles,
  onChange,
  groups = Object.entries(ROLE_GROUPS) as [string, readonly string[]][],
  /** Libellé du bouton fermé ; par défaut « Choisir un rôle ». */
  placeholder,
  /** Préfixe des `data-testid` (`roles-picker` par défaut). */
  testIdPrefix = "roles-picker",
}: {
  roles: string[];
  onChange: (roles: string[]) => void;
  groups?: [string | null, readonly string[]][];
  placeholder?: string;
  testIdPrefix?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /* Fermeture au clavier (Échap, retour du focus sur le bouton) et au clic
     hors du composant ; le panneau reste ouvert pendant le multi-choix. */
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node))
        setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    searchRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const toggle = (role: string) =>
    onChange(
      roles.includes(role)
        ? roles.filter((r) => r !== role)
        : [...roles, role],
    );

  const term = query.trim().toLocaleLowerCase("fr-FR");
  const visibleGroups = useMemo(
    () =>
      groups
        .map(([group, options]) => [
          group,
          options.filter(
            (option) => !term || option.toLocaleLowerCase("fr-FR").includes(term),
          ),
        ] as const)
        .filter(([, options]) => options.length > 0),
    [groups, term],
  );

  return (
    <div ref={rootRef} className="relative">
      {roles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5" data-testid={`${testIdPrefix}-selected`}>
          {roles.map((role) => (
            <span
              key={role}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/25 bg-white/10 py-1 pl-3 pr-1.5 text-[13px] text-white/90"
            >
              {role}
              <button
                type="button"
                data-testid={`${testIdPrefix}-remove-${role}`}
                aria-label={t("cb.roles.remove", { role })}
                onClick={() => toggle(role)}
                className="grid h-6 w-6 place-items-center rounded-full text-white/55 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        ref={triggerRef}
        data-testid={`${testIdPrefix}-trigger`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
          open
            ? "border-white/50 bg-[#262320]"
            : "border-white/25 bg-[#262320] hover:border-white/45",
        )}
      >
        <span className={cn(!roles.length && "text-white/50")}>
          {roles.length
            ? t("cb.roles.modify", { n: roles.length })
            : placeholder ?? t("cb.roles.placeholder")}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "h-4 w-4 shrink-0 text-white/55 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          data-testid={`${testIdPrefix}-panel`}
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-white/20 bg-[#171410] shadow-[0_24px_48px_-16px_rgba(0,0,0,0.8)]"
        >
          <div className="relative border-b border-white/10">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
            />
            <input
              ref={searchRef}
              data-testid={`${testIdPrefix}-search`}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("cb.roles.searchPlaceholder")}
              aria-label={t("cb.roles.searchAria")}
              className="min-h-11 w-full bg-transparent pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus-visible:outline-none"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {visibleGroups.length ? (
              visibleGroups.map(([group, options]) => (
                <fieldset key={group ?? "options"} className="mb-2 last:mb-0">
                  {group ? (
                    <legend className="mb-1 px-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                      {group}
                    </legend>
                  ) : null}
                  <div className="grid gap-0.5 sm:grid-cols-2">
                    {options.map((role) => {
                      const checked = roles.includes(role);
                      return (
                        <label
                          key={role}
                          data-testid={`${testIdPrefix}-option-${role}`}
                          className={cn(
                            "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-[13.5px] transition",
                            checked
                              ? "bg-white/12 text-white"
                              : "text-white/75 hover:bg-white/[0.07]",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(role)}
                            className="h-4 w-4 shrink-0 accent-white"
                          />
                          {role}
                          {checked ? (
                            <Check aria-hidden className="ml-auto h-3.5 w-3.5 text-white/60" />
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))
            ) : (
              <p className="px-3 py-4 text-[13px] text-white/50">
                {t("cb.roles.noResults", { query: query.trim() })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Ce qui concerne uniquement ce mariage : RSVP, accompagnants, moments,
 * arrivée/départ, besoins. Un RSVP déjà donné par le lien d'invitation est
 * repris tel quel et n'est jamais recopié.
 */
export function PresenceFields({
  presence,
  contextual,
  linkedRsvp,
}: {
  presence: Participation;
  contextual: <K extends keyof Participation>(key: K, value: Participation[K]) => void;
  linkedRsvp: { token: string; revoked: boolean } | null;
}) {
  const { t } = useI18n();
  return (
    <>
      {linkedRsvp && (
        <div className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm">
          <strong>{t("cb.presence.rsvpLink.title")}</strong>
          <p className="mt-2 text-white/70">
            {t("cb.presence.rsvpLink.text")}
          </p>
          {linkedRsvp.revoked ? (
            <p className="mt-2">
              {t("cb.presence.rsvpLink.revoked")}
            </p>
          ) : (
            <a
              className="mt-2 inline-block min-h-11 py-3 underline"
              href={`/rsvp/${linkedRsvp.token}`}
            >
              {t("cb.presence.rsvpLink.edit")}
            </a>
          )}
        </div>
      )}
      <label className="block text-sm">
        {t("cb.presence.rsvp")}
        <select
          className={cardInputStyle}
          disabled={Boolean(linkedRsvp)}
          value={presence.rsvp}
          onChange={(e) =>
            contextual("rsvp", e.target.value as Participation["rsvp"])
          }
        >
          <option value="en_attente">{t("cb.presence.toConfirm")}</option>
          <option value="present">{t("cb.presence.present")}</option>
          <option value="absent">{t("cb.presence.absent")}</option>
          <option value="peut_etre">{t("cb.presence.maybe")}</option>
        </select>
      </label>
      <label className="block text-sm">
        {t("cb.presence.companions")}
        <input
          className={cardInputStyle}
          type="number"
          min="0"
          max="50"
          disabled={Boolean(linkedRsvp)}
          value={presence.companions}
          onChange={(e) => contextual("companions", Number(e.target.value))}
        />
      </label>
      <fieldset>
        <legend className="mb-2 text-sm">{t("cb.presence.moments")}</legend>
        <div className="flex flex-wrap gap-3">
          {PRESENCE_MOMENTS.map((moment) => (
            <label
              key={moment}
              className="flex min-h-11 items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                disabled={
                  Boolean(linkedRsvp) &&
                  ["Cérémonie", "Cocktail", "Dîner", "Brunch"].includes(moment)
                }
                checked={presence.moments.includes(moment)}
                onChange={(e) =>
                  contextual(
                    "moments",
                    e.target.checked
                      ? [...presence.moments, moment]
                      : presence.moments.filter((m) => m !== moment),
                  )
                }
              />
              {moment}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-white/60">
        {t("cb.presence.datesHint")}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          label={t("cb.presence.arrival")}
          value={presence.arrival}
          onChange={(v) => contextual("arrival", v)}
        />
        <DateField
          label={t("cb.presence.departure")}
          value={presence.departure}
          onChange={(v) => contextual("departure", v)}
        />
      </div>
      {(
        [
          ["allergens", t("cb.presence.allergens")],
          ["dietary", t("cb.presence.dietary")],
          ["needs", t("cb.presence.needs")],
          ["notes", t("cb.presence.notes")],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="block text-sm">
          {label}
          <textarea
            className={cardInputStyle}
            maxLength={2000}
            disabled={Boolean(linkedRsvp) && (key === "dietary" || key === "notes")}
            value={presence[key]}
            onChange={(e) => contextual(key, e.target.value)}
          />
        </label>
      ))}
    </>
  );
}

/** Créneaux libres pour ce mariage — la même Timeline, aucune seconde source. */
export function SlotsEditor({
  slots,
  onChange,
}: {
  slots: Participation["slots"];
  onChange: (slots: Participation["slots"]) => void;
}) {
  const { t } = useI18n();
  return (
    <details>
      <summary className="min-h-11 cursor-pointer text-sm">
        {t("cb.slots.summary")}
      </summary>
      <fieldset>
        <legend className="sr-only">{t("cb.slots.legend")}</legend>
        {slots.map((slot, i) => (
          <div className="mt-3 space-y-3 rounded-xl border border-white/20 p-3" key={i}>
            <label className="text-sm">
              {t("cb.slots.moment")}
              <input
                required
                className={cardInputStyle}
                value={slot.label}
                placeholder={t("cb.slots.momentPlaceholder")}
                onChange={(e) =>
                  onChange(
                    slots.map((s, n) => (n === i ? { ...s, label: e.target.value } : s)),
                  )
                }
              />
            </label>
            <DateField
              label={t("cb.slots.start")}
              value={slot.start}
              onChange={(v) =>
                onChange(slots.map((s, n) => (n === i ? { ...s, start: v } : s)))
              }
            />
            <DateField
              label={t("cb.slots.end")}
              value={slot.end}
              onChange={(v) =>
                onChange(slots.map((s, n) => (n === i ? { ...s, end: v } : s)))
              }
            />
            <button
              type="button"
              onClick={() => onChange(slots.filter((_, n) => n !== i))}
            >
              {t("cb.slots.remove")}
            </button>
          </div>
        ))}
        <button
          className="mt-3 min-h-11 text-sm underline"
          type="button"
          onClick={() => onChange([...slots, { label: "", start: "", end: "" }])}
        >
          {t("cb.slots.add")}
        </button>
      </fieldset>
    </details>
  );
}
