'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

function assetSrc(asset: string | { src: string }): string {
  return typeof asset === 'string' ? asset : asset.src;
}

const markerIcon = L.icon({
  iconUrl: assetSrc(iconUrl),
  iconRetinaUrl: assetSrc(iconRetinaUrl),
  shadowUrl: assetSrc(shadowUrl),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/**
 * Plain Leaflet, driven imperatively from refs — not react-leaflet's <MapContainer>.
 * react-leaflet v4 creates the Leaflet map instance directly in the render path, so
 * React 18 StrictMode's dev-only double-render calls `L.map()` on the same DOM node
 * twice before any cleanup runs, throwing "Map container is already initialized."
 * The `mapRef.current` guard below is what makes the double-invoke safe: the first
 * pass creates the map, the synchronous cleanup removes it and clears the ref, and
 * the second pass creates a fresh one — exactly the round-trip StrictMode expects.
 */
export default function AddressMapInner({
  center,
  zoom,
  marker,
  onPick,
}: {
  center: [number, number];
  zoom: number;
  marker: [number, number] | null;
  onPick: (lat: number, lon: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    // React 18 StrictMode's dev-only double-mount can leave Leaflet's own
    // "already bound to a map" marker on the container between the two passes —
    // clear it defensively so this mount is never blocked by a stale flag.
    const container = containerRef.current as HTMLDivElement & { _leaflet_id?: number };
    delete container._leaflet_id;
    const map = L.map(containerRef.current).setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => onPickRef.current(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mapRef.current?.setView(center, zoom);
  }, [center, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!marker) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      const m = L.marker(marker, { icon: markerIcon, draggable: true }).addTo(map);
      m.on('dragend', () => {
        const pos = m.getLatLng();
        onPickRef.current(pos.lat, pos.lng);
      });
      markerRef.current = m;
    } else {
      markerRef.current.setLatLng(marker);
    }
  }, [marker]);

  return <div ref={containerRef} className="h-72 w-full overflow-hidden rounded-lg" />;
}
