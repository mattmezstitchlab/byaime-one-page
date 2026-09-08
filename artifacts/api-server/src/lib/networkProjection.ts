import {
  evaluateCapability,
  mapLegacyProjectRole,
  type AuthorizedMapSubject,
  type Capability,
  type CapabilityContext,
  type LegacyProjectRole,
  type NetworkProjection,
  type UniversalReference,
  type UniversalRelation,
} from "@workspace/aime-domain";
import { projectDataForRole } from "./projectDataPolicy";

type ProjectRow = {
  id: string;
  title: string;
  data: unknown;
  role: LegacyProjectRole;
};

const CITY_COORDINATES: Record<string, [number, number]> = {
  paris: [48.8566, 2.3522],
  lille: [50.6292, 3.0573],
  lyon: [45.764, 4.8357],
  marseille: [43.2965, 5.3698],
  bordeaux: [44.8378, -0.5792],
  strasbourg: [48.5734, 7.7521],
  nantes: [47.2184, -1.5536],
  toulouse: [43.6047, 1.4442],
  nice: [43.7102, 7.262],
  rennes: [48.1173, -1.6778],
  bruxelles: [50.8503, 4.3517],
  london: [51.5074, -0.1278],
  londres: [51.5074, -0.1278],
  montreal: [45.5019, -73.5674],
  dakar: [14.7167, -17.4677],
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function factText(value: unknown): string | undefined {
  return text(record(value).value);
}

function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function projectionId(
  worldId: string,
  kind: "card" | "place" | "moment",
  legacyId: string,
): string {
  return `world-project:${worldId}:${kind}:${encodeURIComponent(legacyId)}`;
}

function approximateLocation(value: string | undefined) {
  if (!value) return undefined;
  const normalized = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  const match = Object.entries(CITY_COORDINATES).find(([city]) =>
    normalized.includes(city),
  );
  return match
    ? {
        city: match[0].replace(/^./, (letter) => letter.toUpperCase()),
        latitude: match[1][0],
        longitude: match[1][1],
      }
    : undefined;
}

function decisions(
  capabilities: Capability[],
  context: CapabilityContext,
): Partial<Record<Capability, ReturnType<typeof evaluateCapability>>> {
  return Object.fromEntries(
    capabilities.map((capability) => [
      capability,
      evaluateCapability(capability, context),
    ]),
  );
}

export function buildNetworkProjection(
  rows: ProjectRow[],
  generatedAt = new Date().toISOString(),
): NetworkProjection {
  const subjects: AuthorizedMapSubject[] = [];
  const relations: UniversalRelation[] = [];

  for (const row of rows) {
    // Reuse the established serialization boundary before reading any nested
    // subject. This keeps private, financial, and role-hidden records out of
    // both subjects and their relations.
    const data = record(projectDataForRole(row.data, row.role));
    const role = mapLegacyProjectRole(row.role);
    const worldRef: UniversalReference<"world"> = { kind: "world", id: row.id };
    const worldContext: CapabilityContext = {
      authenticated: true,
      worldRole: role,
    };
    const location = approximateLocation(factText(data.city));
    const venue = factText(data.venue);

    subjects.push({
      ref: worldRef,
      worldRef,
      label: row.title,
      summary: [text(data.universe), text(data.subtitle)]
        .filter(Boolean)
        .join(" · "),
      locationLevel: "world",
      city: location?.city,
      ...(!venue && location
        ? { latitude: location.latitude, longitude: location.longitude }
        : {}),
      primaryCapability: "world.view",
      capabilities: decisions(["world.view", "world.edit"], worldContext),
    });

    if (venue) {
      const legacyId = "venue";
      const ref: UniversalReference<"place"> = {
        kind: "place",
        id: projectionId(row.id, "place", legacyId),
      };
      subjects.push({
        ref,
        worldRef,
        label: venue,
        summary: location?.city
          ? `Lieu du Monde · ${location.city}`
          : "Lieu du Monde",
        locationLevel: "world",
        city: location?.city,
        ...(location
          ? { latitude: location.latitude, longitude: location.longitude }
          : {}),
        primaryCapability: "world.view",
        capabilities: decisions(["world.view"], worldContext),
        legacy: {
          source: "world_project_json",
          entityKind: "venue",
          legacyId,
        },
      });
      relations.push({
        id: `${ref.id}:in-world`,
        from: ref,
        to: worldRef,
        kind: "belongs_to",
        visibility: "world",
      });
    }

    for (const moment of list(data.timeline)) {
      const legacyId = text(moment.id);
      const label = text(moment.title);
      if (!legacyId || !label) continue;
      const ref: UniversalReference<"moment"> = {
        kind: "moment",
        id: projectionId(row.id, "moment", legacyId),
      };
      const momentLocation = approximateLocation(text(moment.location));
      subjects.push({
        ref,
        worldRef,
        label,
        summary: text(moment.detail) ?? text(moment.kind),
        locationLevel: "world",
        city: momentLocation?.city,
        ...(momentLocation
          ? {
              latitude: momentLocation.latitude,
              longitude: momentLocation.longitude,
            }
          : {}),
        primaryCapability: "world.view",
        capabilities: decisions(["world.view", "moment.edit"], {
          ...worldContext,
          // Historical owner ids are not Identity mappings. Do not infer
          // ownership until that mapping has been explicitly verified.
          ownsContribution: false,
        }),
        legacy: {
          source: "world_project_json",
          entityKind: "timeline_event",
          legacyId,
        },
      });
      relations.push({
        id: `${ref.id}:in-world`,
        from: ref,
        to: worldRef,
        kind: "belongs_to",
        visibility: "world",
      });
    }

    for (const provider of list(data.providers)) {
      const legacyId = text(provider.id);
      if (!legacyId) continue;
      const ref: UniversalReference<"card"> = {
        kind: "card",
        id: projectionId(row.id, "card", legacyId),
      };
      const cardContext: CapabilityContext = {
        ...worldContext,
        socialRelation: "connected",
        // A legacy contact value is not proof that the Card opted into
        // contact. Keep the action denied until preferences are canonical.
        contactAllowed: false,
      };
      subjects.push({
        ref,
        worldRef,
        label: text(provider.name) ?? text(provider.role) ?? "Professionnel",
        summary: text(provider.category),
        locationLevel: "world",
        primaryCapability: "card.view",
        capabilities: decisions(["card.view", "card.contact"], cardContext),
        legacy: {
          source: "world_project_json",
          entityKind: "provider",
          legacyId,
        },
      });
      relations.push({
        id: `${ref.id}:in-world`,
        from: ref,
        to: worldRef,
        kind: "participates_in",
        visibility: "world",
      });
    }
  }

  return { generatedAt, subjects, relations };
}