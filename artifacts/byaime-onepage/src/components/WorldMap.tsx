import { useEffect, useRef, useState } from 'react';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { WorldEvent } from '@/lib/world-model/types';

const MAP_STYLE = {
  version: 8 as const,
  sources: {
    carto: {
      type: 'raster' as const,
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [
    { id: 'carto-background', type: 'background' as const, paint: { 'background-color': '#020202' } },
    { id: 'carto-tiles', type: 'raster' as const, source: 'carto', minzoom: 0, maxzoom: 20 },
  ],
};

// Pulse colors by dimension
const DIMENSION_COLORS: Record<string, string> = {
  "Humanité": "#ff5b79",
  "Finance": "#ffb44a",
  "Économie": "#f6f06a",
  "Fiscalité": "#50e3a4",
  "Argent public": "#4cc9ff",
  "Précarité": "#8b7cff",
  "Mobilité": "#e26cff",
  "Environnement": "#ffffff",
};

type WorldMapProps = {
  events: WorldEvent[];
  activeId?: string | null;
  onSelect: (id: string) => void;
};

function toGeoJson(events: WorldEvent[], activeId?: string | null) {
  return {
    type: 'FeatureCollection' as const,
    features: events
      .filter(e => e.coordinates !== undefined)
      .map(e => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: e.coordinates!,
        },
        properties: {
          id: e.id,
          title: e.title,
          dimension: e.dimension,
          color: DIMENSION_COLORS[e.dimension] || "#ffffff",
          active: e.id === activeId ? 1 : 0,
        },
      })),
  };
}

export function WorldMap({ events, activeId, onSelect }: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const readyRef = useRef(false);
  const [useFallback, setUseFallback] = useState(false);
  const stateRef = useRef({ events, activeId, onSelect });
  stateRef.current = { events, activeId, onSelect };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const probeCanvas = document.createElement('canvas');
        if (!probeCanvas.getContext('webgl2')) {
          setUseFallback(true);
          return;
        }

        const gl: any = await import('maplibre-gl');
        if (cancelled || !containerRef.current || mapRef.current) return;
        try {
          const worker = new URL(mapWorkerUrl, window.location.href);
          gl.setWorkerUrl?.(`${worker.pathname}${worker.search}`);
        } catch {}

        const map = new gl.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: [0, 20],
          zoom: 1.5,
          attributionControl: false,
        });
        mapRef.current = map;

        const activateFallback = () => {
          if (cancelled) return;
          readyRef.current = false;
          mapRef.current?.remove();
          mapRef.current = null;
          setUseFallback(true);
        };

        map.getCanvas().addEventListener('webglcontextlost', activateFallback, { once: true });
        map.on('error', (event: { error?: Error }) => {
          const message = event.error?.message ?? "";
          if (/webgl|context lost|gpu/i.test(message)) activateFallback();
        });

        map.addControl(new gl.NavigationControl({ showCompass: false }), 'bottom-right');

        map.on('style.load', () => {
          if (cancelled) return;
          map.addSource('events', {
            type: 'geojson',
            data: toGeoJson(stateRef.current.events, stateRef.current.activeId),
          });

          map.addLayer({
            id: 'events-pulse',
            type: 'circle',
            source: 'events',
            paint: {
              'circle-color': ['get', 'color'],
              'circle-opacity': 0.15,
              'circle-radius': ['case', ['==', ['get', 'active'], 1], 40, 20],
              'circle-blur': 0.5,
            },
          });

          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            let t = 0;
            function animate() {
              if (!mapRef.current || !mapRef.current.getLayer('events-pulse')) return;
              t += 0.05;
              const scale = 1 + Math.sin(t) * 0.2;
              mapRef.current.setPaintProperty('events-pulse', 'circle-radius', [
                '*',
                scale,
                ['case', ['==', ['get', 'active'], 1], 40, 20]
              ]);
              mapRef.current.setPaintProperty('events-pulse', 'circle-opacity', [
                '*',
                1.2 - scale * 0.2,
                0.15
              ]);
              if (!cancelled) requestAnimationFrame(animate);
            }
            animate();
          }

          map.addLayer({
            id: 'events-core',
            type: 'circle',
            source: 'events',
            paint: {
              'circle-color': ['get', 'color'],
              'circle-opacity': 0.9,
              'circle-radius': ['case', ['==', ['get', 'active'], 1], 6, 3],
              'circle-stroke-color': '#000000',
              'circle-stroke-width': 1,
            },
          });

          map.on('click', 'events-core', (event: any) => {
            const id = event.features?.[0]?.properties?.id;
            if (id) stateRef.current.onSelect(id);
          });

          for (const layer of ['events-core', 'events-pulse']) {
            map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
            map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
          }

          readyRef.current = true;
        });
      } catch (error) {
        if (!cancelled) {
          console.warn('MapLibre indisponible, activation de la projection de secours.', error);
          setUseFallback(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    map.getSource('events')?.setData(toGeoJson(events, activeId));
  }, [events, activeId]);

  if (useFallback) {
    return (
      <div
        className="absolute inset-0 overflow-hidden bg-[#020202]"
        role="region"
        aria-label="Projection mondiale de secours des événements simulés"
      >
        <div className="absolute inset-[8%_4%_12%] rounded-[50%] border border-foreground/10 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),transparent_68%),repeating-linear-gradient(0deg,transparent_0,transparent_calc(12.5%_-_1px),rgba(255,255,255,0.035)_12.5%),repeating-linear-gradient(90deg,transparent_0,transparent_calc(12.5%_-_1px),rgba(255,255,255,0.035)_12.5%)] shadow-[inset_0_0_100px_rgba(255,255,255,0.035)]" />
        <div className="absolute left-1/2 top-[8%] bottom-[12%] w-px bg-foreground/[0.035]" />
        <div className="absolute top-1/2 left-[4%] right-[4%] h-px bg-foreground/[0.035]" />
        {events
          .filter(event => event.coordinates)
          .slice(-500)
          .map(event => {
            const [longitude, latitude] = event.coordinates!;
            const left = 4 + ((longitude + 180) / 360) * 92;
            const top = 8 + ((90 - latitude) / 180) * 80;
            const isActive = event.id === activeId;
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelect(event.id)}
                aria-label={`${event.title}, ${event.location ?? event.country ?? "Monde"}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                <span
                  className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 animate-ping motion-reduce:animate-none"
                  style={{
                    width: isActive ? 32 : 18,
                    height: isActive ? 32 : 18,
                    backgroundColor: DIMENSION_COLORS[event.dimension] || "#ffffff",
                  }}
                />
                <span
                  className="relative block rounded-full border border-black"
                  style={{
                    width: isActive ? 9 : 5,
                    height: isActive ? 9 : 5,
                    backgroundColor: DIMENSION_COLORS[event.dimension] || "#ffffff",
                  }}
                />
              </button>
            );
          })}
        <p className="absolute bottom-4 right-6 text-[9px] uppercase tracking-[.22em] text-foreground/25">
          Projection 2D de secours
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 bg-[#020202]"
      role="region"
      aria-label="Carte mondiale interactive des événements simulés"
    />
  );
}
