import { useEffect, useRef, useState } from "react";
import {
  emptyFunctioning,
  professionalConfig,
  ROLE_GROUPS,
  PRESENCE_MOMENTS,
  type ProfessionalFunctioning,
  type ProfessionalParameters,
  type ProfessionalProfile,
  type ProfessionalAssignment,
  resolveProfessionalAssignment,
} from "@workspace/aime-domain";

const input =
  "mt-1 min-h-11 w-full rounded-xl border border-white/25 bg-[#262320] px-3 py-2 text-white";
const button =
  "min-h-11 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black disabled:opacity-40";
function local(iso: string) {
  const d = new Date(iso);
  return Number.isFinite(d.getTime())
    ? new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";
}
function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange(v: string): void;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        className={input}
        type="datetime-local"
        value={local(value)}
        onChange={(e) =>
          onChange(e.target.value ? new Date(e.target.value).toISOString() : "")
        }
      />
    </label>
  );
}
export function ProfessionalParametersEditor({
  profession,
  values,
  defaults = {},
  onChange,
}: {
  profession: string;
  values: ProfessionalParameters;
  defaults?: ProfessionalParameters;
  onChange(values: ProfessionalParameters): void;
}) {
  const fields = professionalConfig(profession).fields;
  const renderFields = (selected: typeof fields) =>
    selected.map((field) => (
      <label className="block text-sm" key={field.key}>
        {field.label}
        <input
          className={input}
          type={field.type === "text" ? "text" : "number"}
          min={0}
          max={field.max}
          maxLength={2000}
          placeholder={
            defaults[field.key] !== undefined
              ? `Habituel : ${defaults[field.key]}`
              : ""
          }
          value={values[field.key] ?? ""}
          onChange={(e) => {
            const next = { ...values };
            if (e.target.value === "") delete next[field.key];
            else
              next[field.key] =
                field.type === "text" ? e.target.value : Number(e.target.value);
            onChange(next);
          }}
        />
      </label>
    ));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {renderFields(fields.filter((f) => f.type !== "text"))}
      </div>
      {fields.some((f) => f.type === "text") && (
        <details>
          <summary className="min-h-11 cursor-pointer text-sm text-white/70">
            Précisions facultatives
          </summary>
          <div className="grid gap-4 sm:grid-cols-2">
            {renderFields(fields.filter((f) => f.type === "text"))}
          </div>
        </details>
      )}
    </div>
  );
}
/** This editor can save a profession without any membership or wedding context. */
export function ProfessionalProfileEditor({
  profiles,
  initialProfileId,
  onSaved,
  onClose,
}: {
  profiles: ProfessionalProfile[];
  initialProfileId?: string;
  onSaved(p: ProfessionalProfile): void;
  onClose(): void;
}) {
  const editorRef = useRef<HTMLElement>(null);
  useEffect(() => {
    editorRef.current?.scrollIntoView?.({ block: "start" });
  }, []);
  const initial = profiles.find((p) => p.id === initialProfileId);
  const [profession, setProfession] = useState(initial?.profession ?? "");
  const [data, setData] = useState<ProfessionalFunctioning>(
    () => initial?.data ?? emptyFunctioning(),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const current = profiles.find((p) => p.profession === profession);
  const baseline = useRef(JSON.stringify(data));
  const dirty =
    Boolean(profession) &&
    (!current || JSON.stringify(data) !== baseline.current);
  const discardAllowed = () =>
    !dirty ||
    window.confirm(
      "Ce profil contient des modifications non enregistrées. Les abandonner ?",
    );
  const changeAvailability = (
    patch: Partial<ProfessionalFunctioning["availability"]>,
  ) =>
    setData((d) => ({ ...d, availability: { ...d.availability, ...patch } }));
  const save = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/me/professional-profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profession,
          data,
          updatedAt: current?.updatedAt ?? null,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ||
            "Profil métier invalide. Vérifiez les champs et disponibilités.",
        );
      setData(result.data);
      baseline.current = JSON.stringify(result.data);
      onSaved(result);
      setNotice(
        "C’est enregistré. Vous retrouverez ces réglages dans vos mariages.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      ref={editorRef}
      data-testid="professional-profile-editor"
      className="rounded-[2rem] bg-[#171410] p-6 text-white sm:p-8"
    >
      <button
        type="button"
        className="min-h-11 text-sm"
        disabled={busy}
        onClick={() => {
          if (discardAllowed()) onClose();
        }}
      >
        ← Ma carte
      </button>
      <h2 className="mt-3 text-2xl">Comment je fonctionne</h2>
      <p className="mt-2 text-sm text-white/70">
        Vos habitudes de travail, à renseigner une seule fois. Vous pourrez les
        adapter à chaque mariage. Cette étape est facultative.
      </p>
      <p className="mt-2 text-xs text-white/60">
        Contraintes professionnelles : organisation et technique. Les allergènes
        et besoins personnels ne sont communiqués que dans le contexte d’un
        mariage.
      </p>
      <form
        className="mt-5 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label className="block text-sm">
          Activité à configurer
          <select
            className={input}
            value={profession}
            disabled={busy}
            onChange={(e) => {
              if (!discardAllowed()) return;
              const next =
                profiles.find((p) => p.profession === e.target.value)?.data ??
                emptyFunctioning();
              setProfession(e.target.value);
              setData(next);
              baseline.current = JSON.stringify(next);
              setNotice("");
              setError("");
            }}
          >
            <option value="" disabled>
              Choisir mon activité
            </option>
            {[
              ...new Set([
                ...ROLE_GROUPS.Professionnels,
                ...profiles.map((p) => p.profession),
              ]),
            ].map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>
        </label>
        <fieldset
          disabled={busy}
          hidden={!profession}
          className="min-w-0 space-y-5"
        >
          <ProfessionalParametersEditor
            profession={profession}
            values={data.parameters}
            onChange={(parameters) => setData((d) => ({ ...d, parameters }))}
          />
          <fieldset>
            <legend className="mb-2 text-sm">
              Types de moments habituellement couverts
            </legend>
            <div className="flex flex-wrap gap-3">
              {PRESENCE_MOMENTS.map((moment) => (
                <label
                  className="flex min-h-11 items-center gap-2 text-sm"
                  key={moment}
                >
                  <input
                    type="checkbox"
                    checked={data.coveredMoments.includes(moment)}
                    onChange={(e) =>
                      setData((d) => ({
                        ...d,
                        coveredMoments: e.target.checked
                          ? [...d.coveredMoments, moment]
                          : d.coveredMoments.filter((m) => m !== moment),
                      }))
                    }
                  />
                  {moment}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-3">
            <legend>Disponibilités habituelles</legend>
            <label className="block text-sm">
              Fuseau horaire
              <input
                className={input}
                value={data.availability.timezone}
                onChange={(e) =>
                  changeAvailability({ timezone: e.target.value })
                }
              />
            </label>
            {data.availability.weekly.map((w, i) => (
              <div
                key={i}
                className="space-y-3 rounded-xl border border-white/20 p-3"
              >
                <label className="block text-sm">
                  Jour
                  <select
                    className={input}
                    value={w.weekday}
                    onChange={(e) =>
                      changeAvailability({
                        weekly: data.availability.weekly.map((v, n) =>
                          n === i
                            ? { ...v, weekday: Number(e.target.value) }
                            : v,
                        ),
                      })
                    }
                  >
                    {[
                      "Dimanche",
                      "Lundi",
                      "Mardi",
                      "Mercredi",
                      "Jeudi",
                      "Vendredi",
                      "Samedi",
                    ].map((day, n) => (
                      <option value={n} key={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["start", "end"] as const).map((key) => (
                    <label key={key} className="text-sm">
                      {key === "start" ? "De" : "À"}
                      <input
                        required
                        className={input}
                        type="time"
                        value={w[key]}
                        onChange={(e) =>
                          changeAvailability({
                            weekly: data.availability.weekly.map((v, n) =>
                              n === i ? { ...v, [key]: e.target.value } : v,
                            ),
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={w.overnight}
                    onChange={(e) =>
                      changeAvailability({
                        weekly: data.availability.weekly.map((v, n) =>
                          n === i ? { ...v, overnight: e.target.checked } : v,
                        ),
                      })
                    }
                  />
                  Fin le lendemain
                </label>
                <button
                  type="button"
                  className="min-h-11 text-sm underline"
                  onClick={() =>
                    changeAvailability({
                      weekly: data.availability.weekly.filter(
                        (_, n) => n !== i,
                      ),
                    })
                  }
                >
                  Retirer ce créneau habituel
                </button>
              </div>
            ))}
            <button
              type="button"
              className="min-h-11 underline"
              onClick={() =>
                changeAvailability({
                  weekly: [
                    ...data.availability.weekly,
                    { weekday: 6, start: "", end: "", overnight: false },
                  ],
                })
              }
            >
              + Créneau hebdomadaire
            </button>
          </fieldset>
          <p className="text-xs text-white/60">
            Un empêchement à une date précise ? Ajoutez-le ci-dessous : BYAIME
            en tiendra compte, même sur un jour habituellement disponible.
          </p>
          <details>
            <summary className="min-h-11 cursor-pointer text-sm text-white/70">
              Dates particulières et indisponibilités
            </summary>
            {(["windows", "unavailable"] as const).map((key) => (
              <fieldset key={key} className="space-y-3">
                <legend>
                  {key === "windows"
                    ? "Disponibilités datées"
                    : "Indisponibilités / exceptions"}
                </legend>
                {data.availability[key].map((range, i) => (
                  <div
                    className="space-y-3 rounded-xl border border-white/20 p-3"
                    key={i}
                  >
                    <DateInput
                      label="Début de plage"
                      value={range.start}
                      onChange={(start) =>
                        changeAvailability({
                          [key]: data.availability[key].map((v, n) =>
                            n === i ? { ...v, start } : v,
                          ),
                        })
                      }
                    />
                    <DateInput
                      label="Fin de plage"
                      value={range.end}
                      onChange={(end) =>
                        changeAvailability({
                          [key]: data.availability[key].map((v, n) =>
                            n === i ? { ...v, end } : v,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      className="min-h-11 underline"
                      onClick={() =>
                        changeAvailability({
                          [key]: data.availability[key].filter(
                            (_, n) => n !== i,
                          ),
                        })
                      }
                    >
                      Retirer la plage
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="min-h-11 underline"
                  onClick={() =>
                    changeAvailability({
                      [key]: [
                        ...data.availability[key],
                        { start: "", end: "" },
                      ],
                    })
                  }
                >
                  +{" "}
                  {key === "windows"
                    ? "Disponibilité datée"
                    : "Indisponibilité"}
                </button>
              </fieldset>
            ))}
          </details>
          {Object.keys(data.legacyNotes).length > 0 && (
            <details>
              <summary className="min-h-11 cursor-pointer">
                Anciennes réponses conservées — à structurer
              </summary>
              <p className="text-xs text-white/70">
                Ces textes n’ont pas été convertis automatiquement en horaires.
              </p>
              {Object.entries(data.legacyNotes).map(([key, value]) => (
                <p key={key} className="text-sm">
                  {key} : {value}
                </p>
              ))}
            </details>
          )}
          {error && <p role="alert">{error}</p>}
        </fieldset>
        {notice && <p role="status">{notice}</p>}
        <button className={button} disabled={busy || !profession} type="submit">
          {busy ? "Enregistrement…" : "Enregistrer mon fonctionnement"}
        </button>
      </form>
    </section>
  );
}

/** References professional profiles. Only exceptions and the wedding anchor are stored here. */
export function ProfessionalAssignmentsEditor({
  profiles,
  roles,
  assignments,
  events,
  arrival,
  departure,
  onChange,
}: {
  profiles: ProfessionalProfile[];
  roles: string[];
  assignments: ProfessionalAssignment[];
  events: { id: string; title: string; time: number }[];
  arrival?: string;
  departure?: string;
  onChange(v: ProfessionalAssignment[]): void;
}) {
  const [profileId, setProfileId] = useState("");
  const available = profiles.filter((p) => roles.includes(p.profession));
  return (
    <fieldset className="space-y-4">
      <legend className="text-lg">Fonctionnement pour ce mariage</legend>
      <p className="text-sm text-white/70">
        Utilisez vos habitudes de travail sans les ressaisir. BYAIME calcule les
        horaires à partir de votre arrivée et de vos durées habituelles.
      </p>
      {!available.length && (
        <p className="text-sm">
          {roles.some((role) =>
            (ROLE_GROUPS.Professionnels as readonly string[]).includes(role),
          )
            ? "Vous n’avez pas encore enregistré vos habitudes pour cette activité. Vous pourrez les compléter depuis votre carte ; votre présence peut déjà être validée."
            : "Aucun réglage professionnel nécessaire pour le rôle choisi. Vous pouvez valider votre participation."}
        </p>
      )}
      {available
        .filter((p) => !assignments.some((a) => a.profileId === p.id))
        .map((p) => (
          <button
            key={p.id}
            type="button"
            className={button}
            onClick={() =>
              onChange([
                ...assignments,
                {
                  id: crypto.randomUUID(),
                  profileId: p.id,
                  anchor: arrival ? { presence: "arrival" } : { start: "" },
                  overrides: {},
                },
              ])
            }
          >
            Utiliser mes réglages {p.profession}
          </button>
        ))}
      {available.length > 0 && (
        <details>
          <summary className="min-h-11 cursor-pointer text-sm text-white/65">
            Ajouter une autre prestation
          </summary>

          <div>
            <label className="text-sm">
              Activité à utiliser
              <select
                className={input}
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
              >
                <option value="">Choisir une activité</option>
                {available.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.profession}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="mt-2 min-h-11 underline"
              type="button"
              disabled={!available.some((p) => p.id === profileId)}
              onClick={() =>
                onChange([
                  ...assignments,
                  {
                    id: crypto.randomUUID(),
                    profileId,
                    anchor: { start: "" },
                    overrides: {},
                  },
                ])
              }
            >
              + Ajouter cette prestation
            </button>
          </div>
        </details>
      )}
      {assignments.map((assignment, i) => {
        const profile = profiles.find((p) => p.id === assignment.profileId);
        if (!profile)
          return (
            <p key={assignment.id} role="alert">
              Activité indisponible — rechargez la page.
            </p>
          );
        const resolved = resolveProfessionalAssignment(
          profile,
          assignment,
          events,
          { arrival, departure },
        );
        const patch = (v: Partial<ProfessionalAssignment>) =>
          onChange(assignments.map((a, n) => (n === i ? { ...a, ...v } : a)));
        return (
          <div
            className="space-y-4 rounded-xl border border-white/20 p-4"
            key={assignment.id}
          >
            <h3>{profile.profession}</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {professionalConfig(profile.profession)
                .fields.filter(
                  (f) => profile.data.parameters[f.key] !== undefined,
                )
                .map((f) => (
                  <div key={f.key}>
                    <dt className="text-white/50">{f.label}</dt>
                    <dd>
                      {String(
                        resolved.parameters[f.key] ??
                          profile.data.parameters[f.key],
                      )}
                    </dd>
                  </div>
                ))}
            </dl>
            <p className="text-xs text-white/60">
              Moments habituellement couverts :{" "}
              {profile.data.coveredMoments.join(", ") || "Non renseignés"}
            </p>
            <label className="block text-sm">
              Quand commencez-vous ?
              <select
                className={input}
                value={
                  "eventId" in assignment.anchor
                    ? assignment.anchor.eventId
                    : "presence" in assignment.anchor
                      ? "__presence"
                      : ""
                }
                onChange={(e) =>
                  patch({
                    anchor:
                      e.target.value === "__presence"
                        ? { presence: "arrival" }
                        : e.target.value
                          ? { eventId: e.target.value }
                          : { start: "" },
                  })
                }
              >
                <option value="">Ou choisir un début spécifique</option>
                {arrival && (
                  <option value="__presence">
                    Mon arrivée déjà renseignée (installation comprise)
                  </option>
                )}
                {events
                  .filter((e) => !e.id.startsWith("card-presence:"))
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} — {new Date(e.time).toLocaleString()}
                    </option>
                  ))}
              </select>
            </label>
            {"start" in assignment.anchor && (
              <DateInput
                label="Début de l’intervention"
                value={assignment.anchor.start}
                onChange={(start) => patch({ anchor: { start } })}
              />
            )}
            <details>
              <summary className="min-h-11 cursor-pointer text-sm">
                Ce qui change pour ce mariage (facultatif)
              </summary>
              <ProfessionalParametersEditor
                profession={profile.profession}
                values={assignment.overrides}
                defaults={profile.data.parameters}
                onChange={(overrides) => patch({ overrides })}
              />
            </details>
            <div className="text-sm" role="status">
              {resolved.errors.length ? (
                resolved.errors.join(" · ")
              ) : (
                <>
                  {resolved.ranges.map((r) => (
                    <p key={r.key}>
                      {r.label} : {new Date(r.start).toLocaleString()} →{" "}
                      {new Date(r.end).toLocaleString()}
                    </p>
                  ))}
                  <p>
                    {resolved.availability === "available"
                      ? "Compatible avec vos disponibilités"
                      : resolved.availability === "unavailable"
                        ? "Ce créneau ne correspond pas à vos disponibilités. Vérifiez les horaires."
                        : "Disponibilité non renseignée — à confirmer"}
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              className="min-h-11 underline"
              onClick={() => onChange(assignments.filter((_, n) => n !== i))}
            >
              Retirer cette intervention
            </button>
          </div>
        );
      })}
    </fieldset>
  );
}
