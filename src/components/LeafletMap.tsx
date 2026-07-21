"use client";

import { MapContainer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./leaflet-theme.css";
import { OpenStreetMapLayer, InvalidateSizeOnMount, dateMarkerIcon, MOSCOW_CENTER } from "./mapInternals";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  address: string | null;
  metro: string | null;
  url: string | null;
  priceNote: string | null;
  tags: string[];
};

export default function LeafletMap({ markers }: { markers: MapMarker[] }) {
  return (
    <MapContainer center={MOSCOW_CENTER} zoom={11} className="h-full w-full" zoomControl={false}>
      <InvalidateSizeOnMount />
      <OpenStreetMapLayer />
      {markers.map((marker) => (
        <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={dateMarkerIcon}>
          <Popup>
            <strong>{marker.title}</strong>
            {marker.address && <div>{marker.address}</div>}
            {marker.metro && <div>м. {marker.metro}</div>}
            {marker.priceNote && <div>{marker.priceNote}</div>}
            {marker.url && (
              <div>
                <a href={marker.url} target="_blank" rel="noreferrer">
                  Ссылка
                </a>
              </div>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
