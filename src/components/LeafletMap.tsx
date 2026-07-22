"use client";

import { MapContainer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";
import "./leaflet-theme.css";
import { OpenFreeMapLayer, InvalidateSizeOnMount, dateMarkerIcon, venueMarkerIcon, MOSCOW_CENTER } from "./mapInternals";

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
      <OpenFreeMapLayer />
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.lat, marker.lng]}
          icon={marker.tags.includes("date") ? dateMarkerIcon : venueMarkerIcon}
        >
          <Popup>
            <strong>{marker.title}</strong>
            {marker.address && <div>{marker.address}</div>}
            {marker.metro && <div>M {marker.metro}</div>}
            {marker.priceNote && <div>{marker.priceNote}</div>}
            {marker.url && (
              <div>
                <a href={marker.url} target="_blank" rel="noreferrer">
                  Link
                </a>
              </div>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
