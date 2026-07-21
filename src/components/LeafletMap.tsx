"use client";

import { MapContainer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";
import "./leaflet-theme.css";
import type { DateIdea } from "@/lib/types";
import { useIsDark } from "@/hooks/useIsDark";
import { OpenFreeMapLayer, InvalidateSizeOnMount, dateMarkerIcon, MOSCOW_CENTER } from "./mapInternals";

export default function LeafletMap({ ideas }: { ideas: DateIdea[] }) {
  const dark = useIsDark();

  return (
    <MapContainer center={MOSCOW_CENTER} zoom={11} className="h-full w-full" zoomControl={false}>
      <InvalidateSizeOnMount />
      <OpenFreeMapLayer dark={dark} />
      {ideas.map((idea) => (
        <Marker key={idea.id} position={[idea.lat!, idea.lng!]} icon={dateMarkerIcon}>
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
