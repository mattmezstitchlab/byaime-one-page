/** Stable field identifiers, shared by the editor, validation and time resolver. */
export type ProfessionalField = {
  key: string;
  label: string;
  type: "text" | "minutes" | "integer";
  max?: number;
};
const minutes = (key: string, label: string): ProfessionalField => ({
  key,
  label,
  type: "minutes",
  max: 2880,
});
const text = (key: string, label: string): ProfessionalField => ({
  key,
  label,
  type: "text",
});
const common = [
  minutes("setupMinutes", "Installation (minutes)"),
  minutes("teardownMinutes", "Démontage (minutes)"),
];
export const PROFESSIONAL_CONFIG: Record<
  string,
  { timing: "duration" | "sets"; fields: ProfessionalField[] }
> = {
  Photographe: {
    timing: "duration",
    fields: [
      minutes("durationMinutes", "Durée habituelle (minutes)"),
      ...common,
      text("method", "Méthode de travail"),
      text("delivery", "Livraison"),
      text("travel", "Déplacement"),
    ],
  },
  Saxophoniste: {
    timing: "sets",
    fields: [
      { key: "setCount", label: "Nombre de sets", type: "integer", max: 50 },
      minutes("setMinutes", "Durée des sets (minutes)"),
      minutes("breakMinutes", "Pause entre les sets (minutes)"),
      ...common,
      minutes("soundcheckMinutes", "Soundcheck (minutes)"),
      text("technicalNeeds", "Besoins techniques"),
      text("method", "Fonctionnement musical"),
    ],
  },
  Traiteur: {
    timing: "duration",
    fields: [
      minutes("durationMinutes", "Durée du service (minutes)"),
      ...common,
      {
        key: "staffCount",
        label: "Nombre de personnes nécessaires",
        type: "integer",
        max: 500,
      },
      text("preparation", "Préparation"),
      text("technicalNeeds", "Contraintes techniques"),
    ],
  },
  "Wedding planner": {
    timing: "duration",
    fields: [
      minutes("durationMinutes", "Durée habituelle (minutes)"),
      ...common,
      text("coordination", "Coordination des prestataires"),
      text("preparation", "Préparation / rendez-vous"),
      text("method", "Régie"),
    ],
  },
};
export const professionalConfig = (profession: string) =>
  PROFESSIONAL_CONFIG[profession] ?? {
    timing: "duration" as const,
    fields: [
      minutes("durationMinutes", "Durée habituelle (minutes)"),
      ...common,
      text("method", "Méthode de travail"),
      text("technicalNeeds", "Contraintes professionnelles"),
    ],
  };
export type ProfessionalParameters = Record<string, string | number>;
export type Availability = {
  timezone: string;
  weekly: { weekday: number; start: string; end: string; overnight: boolean }[];
  windows: { start: string; end: string }[];
  unavailable: { start: string; end: string }[];
};
export type ProfessionalFunctioning = {
  parameters: ProfessionalParameters;
  availability: Availability;
  coveredMoments: string[];
  /** Previous free-text values retained verbatim; never parsed as times. */
  legacyNotes: Record<string, string>;
};
export type ProfessionalProfile = {
  id: string;
  cardUserId: string;
  profession: string;
  data: ProfessionalFunctioning;
  updatedAt: string;
};
export type ProfessionalAssignment = {
  id: string;
  profileId: string;
  anchor: { eventId: string } | { start: string } | { presence: "arrival" };
  overrides: ProfessionalParameters;
};
export const emptyFunctioning = (): ProfessionalFunctioning => ({
  parameters: {},
  availability: {
    timezone: "Europe/Paris",
    weekly: [],
    windows: [],
    unavailable: [],
  },
  coveredMoments: [],
  legacyNotes: {},
});
export function parameterErrors(
  profession: string,
  values: ProfessionalParameters,
): string[] {
  const config = professionalConfig(profession);
  return Object.entries(values).flatMap(([key, value]) => {
    const field = config.fields.find((f) => f.key === key);
    if (!field) return [`Paramètre inconnu : ${key}`];
    return field.type === "text"
      ? typeof value === "string" && value.length <= 2000
        ? []
        : [`${field.label} : texte requis`]
      : typeof value === "number" &&
          Number.isInteger(value) &&
          value >= 0 &&
          value <= (field.max ?? 2880)
        ? []
        : [`${field.label} : entier hors limites`];
  });
}
const clock = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
/** Local wall time for recurring rules, independent of the server/browser timezone. */
function localStamp(time: number, timezone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(time))
      .map((p) => [p.type, p.value]),
  );
  const day = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
  );
  return {
    day,
    weekday: new Date(day).getUTCDay(),
    minute:
      Number(parts.hour) * 60 +
      Number(parts.minute) +
      Number(parts.second) / 60 +
      (((time % 1000) + 1000) % 1000) / 60000,
  };
}
export function availabilityForRange(
  availability: Availability,
  start: number,
  end: number,
): "available" | "unavailable" | "unknown" {
  if (
    availability.unavailable.some(
      (w) => Date.parse(w.start) < end && Date.parse(w.end) > start,
    )
  )
    return "unavailable";
  if (!availability.windows.length && !availability.weekly.length)
    return "unknown";
  if (
    availability.windows.some(
      (w) => Date.parse(w.start) <= start && Date.parse(w.end) >= end,
    )
  )
    return "available";
  const a = localStamp(start, availability.timezone),
    b = localStamp(end, availability.timezone);
  const inWeekly = availability.weekly.some((w) => {
    // A weekly overnight interval may have begun on the previous day.
    return [0, -1].some((offset) => {
      const day = a.day + offset * 86400000;
      if (new Date(day).getUTCDay() !== w.weekday) return false;
      const low = day + clock(w.start) * 60000;
      const high = day + (clock(w.end) + (w.overnight ? 1440 : 0)) * 60000;
      return (
        low <= a.day + a.minute * 60000 && high >= b.day + b.minute * 60000
      );
    });
  });
  return inWeekly ? "available" : "unavailable";
}
export type TemporalAnchor = { id: string; time: number; endTime?: number };
export function resolveProfessionalAssignment(
  profile: ProfessionalProfile,
  assignment: ProfessionalAssignment,
  events: TemporalAnchor[],
  presence: { arrival?: string; departure?: string } = {},
) {
  const parameters = { ...profile.data.parameters, ...assignment.overrides };
  const errors = parameterErrors(profile.profession, parameters);
  const number = (key: string) =>
    typeof parameters[key] === "number" ? (parameters[key] as number) : 0;
  const preparation =
    (number("setupMinutes") + number("soundcheckMinutes")) * 60000;
  const anchor =
    "eventId" in assignment.anchor
      ? events.find(
          (e) => e.id === (assignment.anchor as { eventId: string }).eventId,
        )?.time
      : "start" in assignment.anchor
        ? Date.parse(assignment.anchor.start)
        : presence.arrival
          ? Date.parse(presence.arrival) + preparation
          : undefined;
  const duration =
    professionalConfig(profile.profession).timing === "sets"
      ? number("setCount") * number("setMinutes") +
        Math.max(0, number("setCount") - 1) * number("breakMinutes")
      : number("durationMinutes");
  if (!duration) errors.push("Durée professionnelle à renseigner");
  if (
    professionalConfig(profile.profession).timing === "sets" &&
    (!number("setCount") || !number("setMinutes"))
  )
    errors.push("Nombre et durée des sets requis");
  if (duration > 2880) errors.push("Durée totale supérieure à 48 heures");
  if (!Number.isFinite(anchor))
    errors.push("Moment de mariage introuvable ou début manquant");
  if (errors.length)
    return { parameters, errors, availability: "unknown" as const, ranges: [] };
  const start = anchor!,
    end = start + duration * 60000;
  const teardown = number("teardownMinutes") * 60000;
  if (presence.arrival && start - preparation < Date.parse(presence.arrival))
    errors.push("Installation avant votre arrivée au mariage");
  if (presence.departure && end + teardown > Date.parse(presence.departure))
    errors.push("Intervention après votre départ du mariage");
  const availability = availabilityForRange(
    profile.data.availability,
    start - preparation,
    end + teardown,
  );
  return {
    parameters,
    errors,
    availability,
    ranges: [
      ...(preparation
        ? [
            {
              key: "setup",
              label: "Installation / préparation",
              start: start - preparation,
              end: start,
            },
          ]
        : []),
      { key: "service", label: profile.profession, start, end },
      ...(teardown
        ? [
            {
              key: "teardown",
              label: "Démontage",
              start: end,
              end: end + teardown,
            },
          ]
        : []),
    ],
  };
}
