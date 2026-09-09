import { useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, ExternalLink, LocateFixed, Map, Rows3 } from 'lucide-react';
import { useListNetworkSubjects, type NetworkSubject } from '@workspace/api-client-react';
import type { MapSubject } from '@workspace/aime-domain';
import { UniversalMap } from '@/components/UniversalMap';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { mapSubjectKey } from '@/lib/universal/map-subjects';
import { openSelectedWorld } from '@/lib/universal/network-navigation';
import { cn } from '@/lib/utils';
import { useProject } from '@/store/project-store';

const KIND_LABELS: Record<string, string> = {
  card: 'Cartes',
  world: 'Mondes',
  place: 'Lieux',
  moment: 'Moments',
  resource: 'Ressources',
};

function asMapSubject(subject: NetworkSubject): MapSubject {
  return {
    ref: subject.ref as MapSubject['ref'],
    label: subject.label,
    summary: subject.summary,
    imageUrl: subject.imageUrl,
    locationLevel: subject.locationLevel,
    latitude: subject.latitude,
    longitude: subject.longitude,
    city: subject.city,
    primaryCapability: subject.primaryCapability as MapSubject['primaryCapability'],
  };
}

export function NetworkPage() {
  const query = useListNetworkSubjects();
  const { selectProject } = useProject();
  const [, navigate] = useLocation();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [kind, setKind] = useState<string>('all');
  const [openingWorldId, setOpeningWorldId] = useState<string | null>(null);
  const [openError, setOpenError] = useState('');
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const mapRegionRef = useRef<HTMLElement | null>(null);

  const authorized = query.data?.subjects ?? [];
  const visibleAuthorized = useMemo(
    () => authorized.filter(subject => kind === 'all' || subject.ref.kind === kind),
    [authorized, kind],
  );
  const subjects = useMemo(() => visibleAuthorized.map(asMapSubject), [visibleAuthorized]);
  const active = visibleAuthorized.find(subject => `${subject.ref.kind}:${subject.ref.id}` === activeKey);
  const onMap = subjects.filter(subject => subject.latitude !== undefined && subject.longitude !== undefined);
  const offMap = subjects.filter(subject => subject.latitude === undefined || subject.longitude === undefined);

  function select(key: string, origin?: HTMLElement) {
    if (origin) returnFocusRef.current = origin;
    setOpenError('');
    setActiveKey(key);
  }

  function closeDetail() {
    setActiveKey(null);
    setOpenError('');
  }

  async function openWorld(worldId: string) {
    setOpeningWorldId(worldId);
    setOpenError('');
    const opened = await openSelectedWorld(worldId, selectProject, navigate);
    if (!opened) setOpenError("Ce Monde n’a pas pu être ouvert. Réessayez.");
    setOpeningWorldId(null);
  }

  return (
    <main data-testid="network-page" className="relative flex h-[100dvh] overflow-hidden bg-background text-foreground">
      <div className="sr-only" aria-live="polite">
        {query.isLoading
          ? 'Chargement du réseau'
          : `${subjects.length} résultats. ${active ? `Sélectionné : ${active.label}` : 'Aucune sélection'}`}
      </div>

      <aside className={cn(
        'relative z-20 flex w-full shrink-0 flex-col border-r border-border bg-card/95 backdrop-blur-xl md:w-[390px]',
        view === 'map' && 'hidden md:flex',
      )}>
        <header className="border-b border-border px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[.25em] text-foreground/45">Réseau AIME</p>
              <h1 className="mt-1 font-display text-2xl">Carte universelle</h1>
            </div>
            <Link href="/user-portal" aria-label="Retour au Monde" className="grid h-10 w-10 place-items-center rounded-full border border-border">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto" aria-label="Filtrer les résultats">
            {['all', 'world', 'card', 'place', 'moment'].map(value => (
              <button
                key={value}
                aria-pressed={kind === value}
                onClick={() => {
                  setKind(value);
                  setActiveKey(null);
                }}
                className={cn('whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px]', kind === value ? 'border-foreground bg-foreground text-background' : 'border-border bg-background/60')}
              >
                {value === 'all' ? 'Tout' : KIND_LABELS[value]}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4" role="list" aria-label="Résultats du réseau">
          {query.isError && (
            <div role="alert" className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
              Le réseau n’a pas pu être chargé.
              <button className="mt-2 block underline" onClick={() => void query.refetch()}>Réessayer</button>
            </div>
          )}
          {!query.isLoading && !query.isError && subjects.length === 0 && (
            <p className="p-4 text-sm text-foreground/55">Aucun sujet autorisé dans ce filtre.</p>
          )}
          {subjects.map(subject => {
            const key = mapSubjectKey(subject);
            return (
              <button
                key={key}
                role="listitem"
                aria-current={activeKey === key}
                onClick={event => select(key, event.currentTarget)}
                className={cn('mb-2 w-full rounded-2xl border p-4 text-left transition', activeKey === key ? 'border-foreground bg-foreground text-background' : 'border-border bg-background/40 hover:border-foreground/30')}
              >
                <span className="text-[9px] uppercase tracking-[.2em] opacity-55">{KIND_LABELS[subject.ref.kind] ?? subject.ref.kind}</span>
                <span className="mt-1 block text-sm font-medium">{subject.label}</span>
                <span className="mt-1 block truncate text-xs opacity-60">{subject.city ?? subject.summary ?? 'Hors carte'}</span>
              </button>
            );
          })}
          {offMap.length > 0 && (
            <p className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-xs text-foreground/50">
              <LocateFixed className="h-3.5 w-3.5" /> {offMap.length} résultat{offMap.length > 1 ? 's' : ''} hors carte
            </p>
          )}
        </div>
      </aside>

      <section
        ref={mapRegionRef}
        tabIndex={-1}
        className={cn('relative flex-1', view === 'list' && 'hidden md:block')}
        aria-label="Carte du réseau"
      >
        <UniversalMap subjects={onMap} activeId={activeKey} focusId={activeKey} onSelect={select} />
        {onMap.length === 0 && !query.isLoading && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-background text-sm text-foreground/55">
            Ces résultats sont disponibles dans la Liste, sans coordonnées autorisées.
          </div>
        )}
      </section>

      <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 rounded-full border border-border bg-card/95 p-1 shadow-lg md:hidden">
        <button aria-pressed={view === 'map'} onClick={() => setView('map')} className={cn('flex items-center gap-2 rounded-full px-4 py-2 text-xs', view === 'map' && 'bg-foreground text-background')}><Map className="h-3.5 w-3.5" /> Carte</button>
        <button aria-pressed={view === 'list'} onClick={() => setView('list')} className={cn('flex items-center gap-2 rounded-full px-4 py-2 text-xs', view === 'list' && 'bg-foreground text-background')}><Rows3 className="h-3.5 w-3.5" /> Liste</button>
      </div>

      <Dialog open={Boolean(active)} onOpenChange={open => !open && closeDetail()}>
        {active && (
          <DialogContent
            onCloseAutoFocus={event => {
              event.preventDefault();
              (returnFocusRef.current ?? mapRegionRef.current)?.focus();
              returnFocusRef.current = null;
            }}
            className="left-4 right-4 top-auto bottom-20 w-auto max-w-none translate-x-0 translate-y-0 rounded-3xl border-border bg-card p-5 text-foreground shadow-2xl md:left-auto md:right-6 md:bottom-6 md:w-[360px]"
          >
            <p className="text-[9px] uppercase tracking-[.22em] text-foreground/45">{KIND_LABELS[active.ref.kind] ?? active.ref.kind}</p>
            <DialogTitle className="pr-10 font-display text-2xl font-normal">{active.label}</DialogTitle>
            <DialogDescription className="text-sm text-foreground/60">{active.summary ?? active.city ?? 'Sujet du réseau'}</DialogDescription>
            {openError && <p role="alert" className="text-sm text-destructive">{openError}</p>}
            {active.ref.kind === 'world' && active.capabilities['world.view']?.allowed && (
              <button
                type="button"
                disabled={openingWorldId === active.ref.id}
                onClick={() => void openWorld(active.ref.id)}
                className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-xs font-semibold text-background disabled:opacity-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {openingWorldId === active.ref.id ? 'Ouverture…' : 'Ouvrir le Monde'}
              </button>
            )}
          </DialogContent>
        )}
      </Dialog>
    </main>
  );
}