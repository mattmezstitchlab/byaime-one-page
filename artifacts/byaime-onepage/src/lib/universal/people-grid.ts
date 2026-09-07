import type { WorldProject } from '@/lib/types';

export type PersonNode = {
  id: string;
  name: string;
  role: string;
  contact?: string | null;
  status?: string;
  type: 'me' | 'guest' | 'provider';
  zLayer: number;
  imageUrl?: string | null;
};

export type CurrentPersonIdentity = {
  name?: string | null;
  imageUrl?: string | null;
};

export function buildUniversalPeople(
  project: WorldProject,
  currentPerson: CurrentPersonIdentity,
): PersonNode[] {
  return [
    {
      id: 'me:center',
      name: currentPerson.name?.trim() || 'Vous',
      role: 'Point zéro des vivants',
      type: 'me',
      zLayer: 0,
      imageUrl: currentPerson.imageUrl,
    },
    ...project.guests.map((guest) => ({
      id: `guest:${guest.id}`,
      name: guest.name,
      role: guest.role,
      contact: guest.contact,
      status: guest.rsvp,
      type: 'guest' as const,
      zLayer: 1,
    })),
    ...project.providers.map((provider) => ({
      id: `provider:${provider.id}`,
      name: provider.name || provider.category,
      role: provider.role || provider.category,
      contact: provider.contact,
      status: provider.status,
      type: 'provider' as const,
      zLayer: 2,
    })),
  ];
}