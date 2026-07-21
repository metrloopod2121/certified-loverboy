"use client";

import { useEffect } from "react";
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
  return (
    <MapContainer center={MOSCOW_CENTER} zoom={11} className="h-full w-full" zoomControl={false}>
      <InvalidateSizeOnMount />
      <TileLayer url="/api/tiles/{z}/{x}/{y}" attribution="&copy; OpenStreetMap" />
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
