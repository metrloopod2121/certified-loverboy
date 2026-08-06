"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map-theme.css";
import { MAP_STYLE_URL, MOSCOW_CENTER, createPickerMarkerElement } from "./mapInternals";

export default function LocationPicker({
  lat,
  lng,
  onPick,
}: {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  // Always-current onPick without needing to recreate the map (and its click listener) whenever
  // the parent hands us a new function reference.
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  // Created once -- lat/lng here only seed where the map opens initially, the marker-sync effect
  // below handles every pick afterwards.
  useEffect(() => {
    if (!containerRef.current) return;
    const center: [number, number] = lat != null && lng != null ? [lng, lat] : MOSCOW_CENTER;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center,
      zoom: lat != null ? 15 : 11,
      attributionControl: { compact: true },
    });
    map.on("click", (e) => onPickRef.current(e.lngLat.lat, e.lngLat.lng));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (lat == null || lng == null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    } else {
      markerRef.current = new maplibregl.Marker({ element: createPickerMarkerElement() }).setLngLat([lng, lat]).addTo(map);
    }
  }, [lat, lng]);

  return <div ref={containerRef} className="h-64 w-full rounded-xl overflow-hidden" />;
}
