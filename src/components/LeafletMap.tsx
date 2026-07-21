"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./leaflet-theme.css";
import type { DateIdea } from "@/lib/types";

const icon = L.divIcon({
  className: "date-marker",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10],
});

const MOSCOW_CENTER: [number, number] = [55.751244, 37.618423];

function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const scheme = window.Telegram?.WebApp?.colorScheme;
    if (scheme) {
      setDark(scheme === "dark");
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(media.matches);
    const listener = (e: MediaQueryListEvent) => setDark(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);
  return dark;
}

// Leaflet measures its container once on init. If the flex layout hasn't
// settled to its final height yet at that point, the map stays 0x0 and never
// requests tiles. Force a re-measure after mount (and on resize) to fix it.
function InvalidateSizeOnMount() {
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

export default function LeafletMap({ ideas }: { ideas: DateIdea[] }) {
  const dark = useIsDark();
  const style = dark ? "dark_all" : "light_all";

  return (
    <MapContainer center={MOSCOW_CENTER} zoom={11} className="h-full w-full" zoomControl={false}>
      <InvalidateSizeOnMount />
      <TileLayer url={`/api/tiles/${style}/{z}/{x}/{y}`} attribution="&copy; OpenStreetMap &copy; CARTO" />
      {ideas.map((idea) => (
        <Marker key={idea.id} position={[idea.lat!, idea.lng!]} icon={icon}>
          <Popup>
            <strong>{idea.title}</strong>
            {idea.address && <div>{idea.address}</div>}
            {idea.metro && <div>м. {idea.metro}</div>}
            {idea.priceNote && <div>{idea.priceNote}</div>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
