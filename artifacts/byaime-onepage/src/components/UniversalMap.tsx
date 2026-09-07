import { useEffect, useRef } from 'react';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapSubject } from '@workspace/aime-domain';
import { mapSubjectKey } from '@/lib/universal/map-subjects';

const STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const IVORY = '#fbf8f4';
const WATER = '#e9e2d8';
const LINE = '#eae3d9';
const INK = '#79736b';

type UniversalMapProps = {
  subjects: MapSubject[];
  activeId?: string | null;
  focusId?: string | null;
  reduceMotion?: boolean | null;
  onSelect: (id: string) => void;
  onReady?: () => void;
  onError?: () => void;
};

function toGeoJson(subjects: MapSubject[], activeId?: string | null) {
  return {
    type: 'FeatureCollection' as const,
    features: subjects
      .filter(subject => subject.latitude !== undefined && subject.longitude !== undefined)
      .map(subject => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [subject.longitude!, subject.latitude!],
        },
        properties: {
          id: mapSubjectKey(subject),
          label: subject.label,
          active: mapSubjectKey(subject) === activeId ? 1 : 0,
        },
      })),
  };
}

export function UniversalMap({ subjects, activeId, focusId, reduceMotion, onSelect, onReady, onError }: UniversalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const readyRef = useRef(false);
  const fittedRef = useRef(false);
  const stateRef = useRef({ subjects, activeId, onSelect, onReady, onError });
  stateRef.current = { subjects, activeId, onSelect, onReady, onError };

  useEffect(() => {
    let cancelled = false;
    let timeout: number | undefined;
    void (async () => {
      const gl: any = await import('maplibre-gl');
      if (cancelled || !containerRef.current || mapRef.current) return;
      try {
        const worker = new URL(mapWorkerUrl, window.location.href);
        gl.setWorkerUrl?.(`${worker.pathname}${worker.search}`);
      } catch {
        // MapLibre keeps its built-in worker fallback.
      }

      const map = new gl.Map({
        container: containerRef.current,
        style: STYLE_URL,
        center: [2.3522, 48.8566],
        zoom: 4,
        attributionControl: false,
      });
      mapRef.current = map;
      map.on('error', () => {
        if (!readyRef.current) stateRef.current.onError?.();
      });
      map.addControl(new gl.NavigationControl({ showCompass: false }), 'bottom-right');
      map.addControl(new gl.AttributionControl({ compact: true, customAttribution: '© OpenStreetMap © CARTO' }), 'bottom-left');

      timeout = window.setTimeout(() => {
        if (!readyRef.current) stateRef.current.onError?.();
      }, 12000);

      map.on('style.load', () => {
        if (cancelled) return;
        for (const layer of map.getStyle().layers ?? []) {
          try {
            if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', IVORY);
            if (layer.type === 'fill') map.setPaintProperty(layer.id, 'fill-color', /water|ocean|sea/i.test(layer.id) ? WATER : IVORY);
            if (layer.type === 'line') {
              map.setPaintProperty(layer.id, 'line-color', LINE);
              map.setPaintProperty(layer.id, 'line-opacity', 0.9);
            }
            if (layer.type === 'symbol') {
              map.setPaintProperty(layer.id, 'text-color', INK);
              map.setPaintProperty(layer.id, 'text-halo-color', IVORY);
            }
          } catch {
            // Some vendor layers do not expose every paint property.
          }
        }

        map.addSource('subjects', {
          type: 'geojson',
          data: toGeoJson(stateRef.current.subjects, stateRef.current.activeId),
          cluster: true,
          clusterRadius: 62,
          clusterMaxZoom: 11,
        });
        map.addLayer({
          id: 'cluster-halo',
          type: 'circle',
          source: 'subjects',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#111111',
            'circle-opacity': 0.08,
            'circle-radius': ['+', 22, ['*', 3, ['sqrt', ['get', 'point_count']]]],
          },
        });
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'subjects',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#111111',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
            'circle-radius': ['+', 18, ['*', 2.6, ['sqrt', ['get', 'point_count']]]],
          },
        });
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'subjects',
          filter: ['has', 'point_count'],
          layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13 },
          paint: { 'text-color': '#ffffff' },
        });
        map.addLayer({
          id: 'points',
          type: 'circle',
          source: 'subjects',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': ['case', ['==', ['get', 'active'], 1], '#ffffff', '#111111'],
            'circle-stroke-color': ['case', ['==', ['get', 'active'], 1], '#111111', '#ffffff'],
            'circle-stroke-width': ['case', ['==', ['get', 'active'], 1], 4, 2],
            'circle-radius': ['case', ['==', ['get', 'active'], 1], 10, 8],
          },
        });

        map.on('click', 'points', (event: any) => {
          const id = event.features?.[0]?.properties?.id;
          if (id) stateRef.current.onSelect(id);
        });
        map.on('click', 'clusters', async (event: any) => {
          const feature = event.features?.[0];
          const clusterId = Number(feature?.properties?.cluster_id);
          const source = map.getSource('subjects');
          if (!feature || !Number.isFinite(clusterId) || !source?.getClusterExpansionZoom) return;
          const zoom = await source.getClusterExpansionZoom(clusterId);
          map.easeTo({ center: feature.geometry.coordinates, zoom, duration: reduceMotion ? 0 : 650 });
        });
        for (const layer of ['points', 'clusters']) {
          map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
        }

        readyRef.current = true;
        if (timeout) window.clearTimeout(timeout);
        const points = stateRef.current.subjects.filter(subject => subject.latitude !== undefined && subject.longitude !== undefined);
        if (points.length === 1) {
          map.jumpTo({ center: [points[0].longitude!, points[0].latitude!], zoom: 8 });
          fittedRef.current = true;
        } else if (points.length > 1) {
          const bounds = points.reduce(
            (value, subject) => value.extend([subject.longitude!, subject.latitude!]),
            new gl.LngLatBounds([points[0].longitude!, points[0].latitude!], [points[0].longitude!, points[0].latitude!]),
          );
          map.fitBounds(bounds, { padding: 90, duration: 0, maxZoom: 11 });
          fittedRef.current = true;
        }
        stateRef.current.onReady?.();
      });
    })();

    return () => {
      cancelled = true;
      if (timeout) window.clearTimeout(timeout);
      readyRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [reduceMotion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    map.getSource('subjects')?.setData(toGeoJson(subjects, activeId));
    if (!fittedRef.current) {
      const points = subjects.filter(subject => subject.latitude !== undefined && subject.longitude !== undefined);
      if (points.length === 1) {
        map.jumpTo({ center: [points[0].longitude!, points[0].latitude!], zoom: 8 });
        fittedRef.current = true;
      } else if (points.length > 1) {
        void import('maplibre-gl').then(gl => {
          const bounds = points.reduce(
            (value, subject) => value.extend([subject.longitude!, subject.latitude!]),
            new gl.LngLatBounds([points[0].longitude!, points[0].latitude!], [points[0].longitude!, points[0].latitude!]),
          );
          map.fitBounds(bounds, { padding: 90, duration: 0, maxZoom: 11 });
          fittedRef.current = true;
        });
      }
    }
  }, [subjects, activeId]);

  useEffect(() => {
    if (!focusId || !mapRef.current) return;
    const subject = subjects.find(item => mapSubjectKey(item) === focusId);
    if (subject?.longitude !== undefined && subject.latitude !== undefined) {
      mapRef.current.flyTo({
        center: [subject.longitude, subject.latitude],
        zoom: Math.max(mapRef.current.getZoom(), 10),
        duration: reduceMotion ? 0 : 700,
      });
    }
  }, [focusId, reduceMotion, subjects]);

  return <div ref={containerRef} className="absolute inset-0 bg-[#fbf8f4]" />;
}