import { useEffect, useRef } from 'react';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { mapSubjectKey } from '@/lib/universal/map-subjects';
const MAP_STYLE = {
    version: 8,
    sources: {
        carto: {
            type: 'raster',
            tiles: [
                'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
                'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
                'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors © CARTO',
        },
    },
    layers: [
        { id: 'carto-background', type: 'background', paint: { 'background-color': '#fbf8f4' } },
        { id: 'carto-tiles', type: 'raster', source: 'carto', minzoom: 0, maxzoom: 20 },
    ],
};
function toGeoJson(subjects, activeId) {
    return {
        type: 'FeatureCollection',
        features: subjects
            .filter(subject => subject.latitude !== undefined && subject.longitude !== undefined)
            .map(subject => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [subject.longitude, subject.latitude],
            },
            properties: {
                id: mapSubjectKey(subject),
                label: subject.label,
                active: mapSubjectKey(subject) === activeId ? 1 : 0,
            },
        })),
    };
}
export function UniversalMap({ subjects, activeId, focusId, reduceMotion, onSelect, onReady, onError }) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const readyRef = useRef(false);
    const fittedRef = useRef(false);
    const stateRef = useRef({ subjects, activeId, onSelect, onReady, onError });
    stateRef.current = { subjects, activeId, onSelect, onReady, onError };
    useEffect(() => {
        let cancelled = false;
        let timeout;
        void (async () => {
            const gl = await import('maplibre-gl');
            if (cancelled || !containerRef.current || mapRef.current)
                return;
            try {
                const worker = new URL(mapWorkerUrl, window.location.href);
                gl.setWorkerUrl?.(`${worker.pathname}${worker.search}`);
            }
            catch {
                // MapLibre keeps its built-in worker fallback.
            }
            const map = new gl.Map({
                container: containerRef.current,
                style: MAP_STYLE,
                center: [2.3522, 48.8566],
                zoom: 4,
                attributionControl: false,
            });
            mapRef.current = map;
            map.on('error', (event) => {
                if (!readyRef.current && event?.error)
                    stateRef.current.onError?.();
            });
            map.addControl(new gl.NavigationControl({ showCompass: false }), 'bottom-right');
            map.addControl(new gl.AttributionControl({ compact: true, customAttribution: '© OpenStreetMap © CARTO' }), 'bottom-left');
            timeout = window.setTimeout(() => {
                if (!readyRef.current)
                    stateRef.current.onError?.();
            }, 12000);
            map.on('style.load', () => {
                if (cancelled)
                    return;
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
                map.on('click', 'points', (event) => {
                    const id = event.features?.[0]?.properties?.id;
                    if (id)
                        stateRef.current.onSelect(id);
                });
                map.on('click', 'clusters', async (event) => {
                    const feature = event.features?.[0];
                    const clusterId = Number(feature?.properties?.cluster_id);
                    const source = map.getSource('subjects');
                    if (!feature || !Number.isFinite(clusterId) || !source?.getClusterExpansionZoom)
                        return;
                    const zoom = await source.getClusterExpansionZoom(clusterId);
                    map.easeTo({ center: feature.geometry.coordinates, zoom, duration: reduceMotion ? 0 : 650 });
                });
                for (const layer of ['points', 'clusters']) {
                    map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
                    map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
                }
                readyRef.current = true;
                if (timeout)
                    window.clearTimeout(timeout);
                const points = stateRef.current.subjects.filter(subject => subject.latitude !== undefined && subject.longitude !== undefined);
                if (points.length === 1) {
                    map.jumpTo({ center: [points[0].longitude, points[0].latitude], zoom: 8 });
                    fittedRef.current = true;
                }
                else if (points.length > 1) {
                    const bounds = points.reduce((value, subject) => value.extend([subject.longitude, subject.latitude]), new gl.LngLatBounds([points[0].longitude, points[0].latitude], [points[0].longitude, points[0].latitude]));
                    map.fitBounds(bounds, { padding: 90, duration: 0, maxZoom: 11 });
                    fittedRef.current = true;
                }
                stateRef.current.onReady?.();
            });
        })();
        return () => {
            cancelled = true;
            if (timeout)
                window.clearTimeout(timeout);
            readyRef.current = false;
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, [reduceMotion]);
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !readyRef.current)
            return;
        map.getSource('subjects')?.setData(toGeoJson(subjects, activeId));
        if (!fittedRef.current) {
            const points = subjects.filter(subject => subject.latitude !== undefined && subject.longitude !== undefined);
            if (points.length === 1) {
                map.jumpTo({ center: [points[0].longitude, points[0].latitude], zoom: 8 });
                fittedRef.current = true;
            }
            else if (points.length > 1) {
                void import('maplibre-gl').then(gl => {
                    const bounds = points.reduce((value, subject) => value.extend([subject.longitude, subject.latitude]), new gl.LngLatBounds([points[0].longitude, points[0].latitude], [points[0].longitude, points[0].latitude]));
                    map.fitBounds(bounds, { padding: 90, duration: 0, maxZoom: 11 });
                    fittedRef.current = true;
                });
            }
        }
    }, [subjects, activeId]);
    useEffect(() => {
        if (!focusId || !mapRef.current)
            return;
        const subject = subjects.find(item => mapSubjectKey(item) === focusId);
        if (subject?.longitude !== undefined && subject.latitude !== undefined) {
            mapRef.current.flyTo({
                center: [subject.longitude, subject.latitude],
                zoom: Math.max(mapRef.current.getZoom(), 10),
                duration: reduceMotion ? 0 : 700,
            });
        }
    }, [focusId, reduceMotion, subjects]);
    return <div ref={containerRef} className="absolute inset-0 bg-[#fbf8f4]"/>;
}
//# sourceMappingURL=UniversalMap.jsx.map