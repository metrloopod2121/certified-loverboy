"use client";

import { useRef } from "react";
import { MapContainer, Marker, Popup } from "react-leaflet";
import type L from "leaflet";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";
import "./leaflet-theme.css";
import { OpenFreeMapLayer, InvalidateSizeOnMount, FocusMarker, dateMarkerIcon, venueMarkerIcon, MOSCOW_CENTER } from "./mapInternals";
import { useT } from "@/hooks/useLang";

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

export default function LeafletMap({
  markers,
  focusMarkerId = null,
}: {
  markers: MapMarker[];
  /** Location id to fly to and pop open once it shows up in `markers` -- set when arriving from
   *  Storage's "show on map" button. */
  focusMarkerId?: string | null;
}) {
  const t = useT();
  const markerRefs = useRef<Record<string, L.Marker>>({});

  return (
    <MapContainer center={MOSCOW_CENTER} zoom={11} className="h-full w-full" zoomControl={false}>
      <InvalidateSizeOnMount />
      <OpenFreeMapLayer />
      <FocusMarker markers={markers} focusMarkerId={focusMarkerId} markerRefs={markerRefs} />
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          ref={(instance) => {
            if (instance) markerRefs.current[marker.id] = instance;
            else delete markerRefs.current[marker.id];
          }}
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
                  {t("linkWord")}
                </a>
              </div>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
