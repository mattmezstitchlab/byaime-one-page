import type { MapSubject } from '@workspace/aime-domain';
import type { WorldProject } from '@/lib/types';

const CITY_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  paris: { latitude: 48.8566, longitude: 2.3522 },
  lille: { latitude: 50.6292, longitude: 3.0573 },
  lyon: { latitude: 45.764, longitude: 4.8357 },
  marseille: { latitude: 43.2965, longitude: 5.3698 },
  bordeaux: { latitude: 44.8378, longitude: -0.5792 },
  strasbourg: { latitude: 48.5734, longitude: 7.7521 },
  nantes: { latitude: 47.2184, longitude: -1.5536 },
  toulouse: { latitude: 43.6047, longitude: 1.4442 },
  nice: { latitude: 43.7102, longitude: 7.262 },
  rennes: { latitude: 48.1173, longitude: -1.6778 },
};

function normalizeLocation(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function findApproximateCityCoordinates(
  value: string | null | undefined,
): { latitude: number; longitude: number } | undefined {
  if (!value) return undefined;
  const normalized = normalizeLocation(value);
  const city = Object.keys(CITY_COORDINATES).find((name) =>
    normalized.includes(name),
  );
  return city ? CITY_COORDINATES[city] : undefined;
}

export function mapSubjectKey(subject: MapSubject): string {
  return `${subject.ref.kind}:${subject.ref.id}`;
}

export function buildMapSubjects(project: WorldProject): MapSubject[] {
  const city = project.city.value ?? undefined;
  const cityCoordinates = findApproximateCityCoordinates(city);
  const venue = project.venue.value?.trim();
  const subjects: MapSubject[] = [
    {
      ref: { kind: 'world', id: project.id },
      label: project.title,
      summary: [project.universe, project.subtitle].filter(Boolean).join(' · '),
      locationLevel: 'world',
      city,
      ...(!venue ? cityCoordinates : undefined),
      primaryCapability: 'world.view',
    },
  ];

  if (venue) {
    subjects.push({
      ref: { kind: 'place', id: `${project.id}:venue` },
      label: venue,
      summary: city ? `Lieu du Monde · ${city}` : 'Lieu du Monde',
      locationLevel: 'world',
      city,
      ...cityCoordinates,
      primaryCapability: 'world.view',
    });
  }

  for (const event of project.timeline) {
    subjects.push({
      ref: { kind: 'moment', id: event.id },
      label: event.title,
      summary: event.detail || event.kind,
      locationLevel: 'world',
      city: event.location,
      primaryCapability: 'world.view',
    });
  }

  for (const provider of project.providers) {
    subjects.push({
      ref: { kind: 'card', id: provider.id },
      label: provider.name || provider.role,
      summary: provider.category,
      locationLevel: 'world',
      primaryCapability: 'world.view',
    });
  }

  return subjects;
}