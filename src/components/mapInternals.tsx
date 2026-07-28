"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export const dateMarkerIcon = L.divIcon({
  className: "date-marker date-marker--date",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10],
});

export const venueMarkerIcon = L.divIcon({
  className: "date-marker date-marker--venue",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10],
});

export const pickerMarkerIcon = L.divIcon({
  className: "date-marker",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export const MOSCOW_CENTER: [number, number] = [55.751244, 37.618423];

// Map always uses the light "liberty" style, regardless of device/Telegram theme.
export function OpenFreeMapLayer() {
  const map = useMap();

  useEffect(() => {
    const layer = L.maplibreGL({ style: "https://tiles.openfreemap.org/styles/liberty" }).addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map]);

  return null;
}

// Leaflet measures its container once on init. If the layout hasn't settled
// to its final height yet at that point, the map stays 0x0 and never
// requests tiles. Force a re-measure after mount (and on resize) to fix it.
export function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    const raf = requestAnimationFrame(invalidate);
    const timeout = setTimeout(invalidate, 300);
    window.addEventListener("resize", invalidate);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
      window.removeEventListener("resize", invalidate);
    };
  }, [map]);
  return null;
}

export const FOCUS_ZOOM = 16;

/** Flies the map to a specific marker once it shows up in `markers` -- used when arriving from
 *  the Storage screen's "show on map" button, where the marker list loads asynchronously (own
 *  /api/date-ideas fetch) after this component has already mounted. Only fires once per
 *  `focusMarkerId` so panning/zooming manually afterwards doesn't keep getting overridden. */
export function FocusMarker({
  markers,
  focusMarkerId,
  markerRefs,
}: {
  markers: { id: string; lat: number; lng: number }[];
  focusMarkerId: string | null;
  markerRefs: React.MutableRefObject<Record<string, L.Marker>>;
}) {
  const map = useMap();
  const focusedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!focusMarkerId || focusedIdRef.current === focusMarkerId) return;
    const marker = markers.find((m) => m.id === focusMarkerId);
    if (!marker) return;

    focusedIdRef.current = focusMarkerId;
    map.flyTo([marker.lat, marker.lng], FOCUS_ZOOM, { animate: true });
    const timeout = setTimeout(() => markerRefs.current[focusMarkerId]?.openPopup(), 400);
    return () => clearTimeout(timeout);
  }, [markers, focusMarkerId, map, markerRefs]);

  return null;
}
