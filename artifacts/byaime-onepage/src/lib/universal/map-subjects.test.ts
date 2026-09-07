import { describe, expect, it } from 'vitest';
import { buildMapSubjects, findApproximateCityCoordinates } from './map-subjects';
import { createInitialProject } from '@/lib/parser';
import { fact } from '@/lib/types';

describe('universal map subject projection', () => {
  it('maps known cities approximately and tolerates accents', () => {
    expect(findApproximateCityCoordinates('Nantes métropole')).toEqual({
      latitude: 47.2184,
      longitude: -1.5536,
    });
    expect(findApproximateCityCoordinates('Ville inconnue')).toBeUndefined();
  });

  it('keeps unverified providers and moments off the geographic map', () => {
    const project = createInitialProject({
      title: 'Notre mariage',
      universe: 'Mariage',
      city: fact('Paris'),
      venue: fact('Maison des arts'),
    }, '');
    const subjects = buildMapSubjects(project);

    const place = subjects.find((subject) => subject.ref.kind === 'place');
    const world = subjects.find((subject) => subject.ref.kind === 'world');
    const moment = subjects.find((subject) => subject.ref.kind === 'moment');
    const provider = subjects.find((subject) => subject.ref.kind === 'card');

    expect(place).toMatchObject({
      label: 'Maison des arts',
      latitude: 48.8566,
      longitude: 2.3522,
    });
    expect(world?.latitude).toBeUndefined();
    expect(moment?.latitude).toBeUndefined();
    expect(provider?.latitude).toBeUndefined();
  });

  it('never manufactures coordinates for an unknown place', () => {
    const project = createInitialProject({
      title: 'Notre mariage',
      universe: 'Mariage',
      city: fact('Une ville non répertoriée'),
      venue: fact('Lieu secret'),
    }, '');

    const place = buildMapSubjects(project).find(
      (subject) => subject.ref.kind === 'place',
    );
    expect(place?.latitude).toBeUndefined();
    expect(place?.longitude).toBeUndefined();
  });
});