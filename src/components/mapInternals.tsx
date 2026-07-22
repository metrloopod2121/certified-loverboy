"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export const dateMarkerIcon = L.divIcon({
  className: "date-marker",
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
    const raf = requestAnimationFrame(() => map.invalidateSize());
    const timeout = setTimeout(() => map.invalidateSize(), 300);
    window.addEventListener("resize", () => map.invalidateSize());
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [map]);
  return null;
}
