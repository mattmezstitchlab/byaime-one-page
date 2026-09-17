import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Image as ImageIcon, ImagePlus, Search, X } from "lucide-react";
import { PRESENCE_MOMENTS, ROLE_GROUPS, type CardMusic, type Participation, type UniversalCard } from "@workspace/aime-domain";
import { searchAppleMusic } from "@/lib/music-search";
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
  return (
    <>
      <h3 className="text-lg">Identité</h3>
      <p className="text-xs text-white/60">
        Photo, pseudo et ville sont facultatifs.
      </p>
      {/* La photo : un bouton clair et visible sur le fond noir (l'input de
          fichier brut s'y rendait invisible), aperçu rond, et « Retirer »
          au même niveau. */}
      <div>
        <p className="text-sm">Photo de profil</p>
        <div className="mt-2 flex items-center gap-4">
          {card.photoUrl ? (
            <img
              src={card.photoUrl}
              alt="Votre photo de profil"
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
              {card.photoUrl ? "Changer la photo" : "Choisir une photo"}
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
                    onError("Choisissez une photo JPEG, PNG ou WebP de moins de 500 Ko.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => update("photoUrl", String(reader.result));
                  reader.onerror = () => onError("Lecture de photo impossible");
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
                Retirer
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["firstName", "Prénom"],
            ["lastName", "Nom"],
            ["nickname", "Pseudo"],
            ["city", "Ville"],
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
      <h3 className="border-t border-white/15 pt-5 text-lg">Moi</h3>
      <label className="block text-sm">
        Métier
        <input
          className={cardInputStyle}
          maxLength={100}
          value={card.profession}
          onChange={(e) => update("profession", e.target.value)}
          placeholder="Photographe, DJ… (facultatif)"
        />
      </label>
      <p className="text-xs text-white/60">
        Quelques mots pour vous présenter. Vous pourrez préciser votre façon de
        travailler ensuite, si vous le souhaitez.
      </p>
      <label className="block text-sm">
        Centres d’intérêt (séparés par des virgules)
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
        setMusicError("La recherche musicale est momentanément indisponible.");
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  };

  return (
    <>
      {showTitle && (
        <h3 className="border-t border-white/15 pt-5 text-lg">Ma musique</h3>
      )}
      <p className="text-xs text-white/60">
        Le morceau qui vous ressemble, directement sur votre carte.
      </p>
      <div>
        <label className="block text-sm">
          Votre musique
          <input
            className={cardInputStyle}
            value={query}
            placeholder="Titre ou artiste"
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
          {searching ? "Recherche…" : "Rechercher un morceau"}
        </button>
        {musicError && (
          <div className="mt-3 rounded-xl border border-amber-200/30 p-4">
            <p role="alert" className="text-sm text-amber-100">
              {musicError} Vous pouvez réessayer ou continuer sans musique.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                className={cardButtonStyle}
                disabled={searching || query.trim().length < 2}
                onClick={() => void search()}
              >
                Réessayer
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
                Continuer sans musique
              </button>
            </div>
          </div>
        )}
        {searched && !musicError && !searching && !results.length && (
          <p role="status" className="mt-2 text-sm text-white/60">
            Aucun résultat affiché. Essayez une autre recherche.
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
              alt="Pochette du morceau"
              className="mb-3 h-20 w-20 rounded-lg"
            />
          )}
          <p>
            {music.title} · {music.artist}
          </p>
          {music.previewUrl ? (
            <>
              <span className="mt-2 block text-xs text-white/60">
                ▶ PLAY — extrait du catalogue
              </span>
              <audio
                aria-label={`Écouter ${music.title}`}
                className="mt-2 w-full"
                controls
                preload="none"
                src={music.previewUrl}
              />
            </>
          ) : (
            <p className="text-sm text-white/60">Aucun extrait disponible.</p>
          )}
          {music.trackUrl && (
            <a
              className="mt-2 block text-sm underline"
              href={music.trackUrl}
              target="_blank"
              rel="noreferrer"
            >
              Ouvrir dans Apple Music
            </a>
          )}
          <button
            type="button"
            className="mt-3 text-sm underline"
            onClick={onClear}
          >
            Retirer ce morceau
          </button>
        </div>
      )}
    </>
  );
}

/** Le morceau choisi, en lecture seule — pochette et extrait. */
export function MusicCard({ music }: { music: CardMusic }) {
  return (
    <div className="rounded-2xl border border-white/20 p-4">
      {music.artworkUrl && (
        <img
          src={music.artworkUrl}
          alt="Pochette du morceau"
          className="mb-3 h-20 w-20 rounded-lg"
        />
      )}
      <p>
        {music.title} · {music.artist}
      </p>
      {music.previewUrl ? (
        <>
          <span className="mt-2 block text-xs text-white/60">
            ▶ PLAY — extrait du catalogue
          </span>
          <audio
            aria-label={`Écouter ${music.title}`}
            className="mt-2 w-full"
            controls
            preload="none"
            src={music.previewUrl}
          />
        </>
      ) : (
        <p className="text-sm text-white/60">Aucun extrait disponible.</p>
      )}
      {music.trackUrl && (
        <a
          className="mt-2 block text-sm underline"
          href={music.trackUrl}
          target="_blank"
          rel="noreferrer"
        >
          Ouvrir dans Apple Music
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
  placeholder = "Choisir un rôle",
  /** Préfixe des `data-testid` (`roles-picker` par défaut). */
  testIdPrefix = "roles-picker",
}: {
  roles: string[];
  onChange: (roles: string[]) => void;
  groups?: [string | null, readonly string[]][];
  placeholder?: string;
  testIdPrefix?: string;
}) {
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
                aria-label={`Retirer ${role}`}
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
            ? `Modifier la sélection (${roles.length})`
            : placeholder}
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
              placeholder="Rechercher…"
              aria-label="Rechercher dans la liste"
              className="min-h-11 w-full bg-transparent pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
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
                Aucun résultat pour « {query.trim()} ».
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
  return (
    <>
      {linkedRsvp && (
        <div className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm">
          <strong>Vos réponses viennent de votre invitation RSVP.</strong>
          <p className="mt-2 text-white/70">
            Vous avez déjà répondu à l’invitation. Retrouvez votre réponse
            ci-dessous ; utilisez le lien pour la modifier. Vos autres
            informations concernent uniquement ce mariage.
          </p>
          {linkedRsvp.revoked ? (
            <p className="mt-2">
              Lien révoqué : contactez l’organisateur pour le réémettre.
            </p>
          ) : (
            <a
              className="mt-2 inline-block min-h-11 py-3 underline"
              href={`/rsvp/${linkedRsvp.token}`}
            >
              Modifier mes réponses RSVP
            </a>
          )}
        </div>
      )}
      <label className="block text-sm">
        RSVP
        <select
          className={cardInputStyle}
          disabled={Boolean(linkedRsvp)}
          value={presence.rsvp}
          onChange={(e) =>
            contextual("rsvp", e.target.value as Participation["rsvp"])
          }
        >
          <option value="en_attente">À confirmer</option>
          <option value="present">Présent</option>
          <option value="absent">Absent</option>
          <option value="peut_etre">Peut-être</option>
        </select>
      </label>
      <label className="block text-sm">
        Nombre d’accompagnants
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
        <legend className="mb-2 text-sm">Moments de présence</legend>
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
        Dates et heures dans votre fuseau local. Pour une fin après minuit,
        choisissez le lendemain.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          label="Arrivée"
          value={presence.arrival}
          onChange={(v) => contextual("arrival", v)}
        />
        <DateField
          label="Départ"
          value={presence.departure}
          onChange={(v) => contextual("departure", v)}
        />
      </div>
      {(
        [
          ["allergens", "Allergènes"],
          ["dietary", "Contraintes alimentaires"],
          ["needs", "Besoins particuliers"],
          ["notes", "Informations utiles"],
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
  return (
    <details>
      <summary className="min-h-11 cursor-pointer text-sm">
        Ajouter des horaires particuliers (facultatif)
      </summary>
      <fieldset>
        <legend className="sr-only">Créneaux pour ce mariage (facultatifs)</legend>
        {slots.map((slot, i) => (
          <div className="mt-3 space-y-3 rounded-xl border border-white/20 p-3" key={i}>
            <label className="text-sm">
              Moment
              <input
                required
                className={cardInputStyle}
                value={slot.label}
                placeholder="Cocktail, cérémonie…"
                onChange={(e) =>
                  onChange(
                    slots.map((s, n) => (n === i ? { ...s, label: e.target.value } : s)),
                  )
                }
              />
            </label>
            <DateField
              label="Début"
              value={slot.start}
              onChange={(v) =>
                onChange(slots.map((s, n) => (n === i ? { ...s, start: v } : s)))
              }
            />
            <DateField
              label="Fin"
              value={slot.end}
              onChange={(v) =>
                onChange(slots.map((s, n) => (n === i ? { ...s, end: v } : s)))
              }
            />
            <button
              type="button"
              onClick={() => onChange(slots.filter((_, n) => n !== i))}
            >
              Retirer
            </button>
          </div>
        ))}
        <button
          className="mt-3 min-h-11 text-sm underline"
          type="button"
          onClick={() => onChange([...slots, { label: "", start: "", end: "" }])}
        >
          + Ajouter un créneau
        </button>
      </fieldset>
    </details>
  );
}
