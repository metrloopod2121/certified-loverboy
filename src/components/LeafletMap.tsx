"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DateIdea } from "@/lib/types";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const MOSCOW_CENTER: [number, number] = [55.751244, 37.618423];

export default function LeafletMap({ ideas }: { ideas: DateIdea[] }) {
  return (
    <MapContainer center={MOSCOW_CENTER} zoom={11} className="h-full w-full" zoomControl={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
      />
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
