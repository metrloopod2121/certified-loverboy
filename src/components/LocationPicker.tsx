"use client";

import { MapContainer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";
import "./leaflet-theme.css";
import { useIsDark } from "@/hooks/useIsDark";
import { OpenFreeMapLayer, InvalidateSizeOnMount, pickerMarkerIcon, MOSCOW_CENTER } from "./mapInternals";

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({
  lat,
  lng,
  onPick,
}: {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const dark = useIsDark();
  const center: [number, number] = lat != null && lng != null ? [lat, lng] : MOSCOW_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={lat != null ? 15 : 11}
      className="h-64 w-full rounded-xl overflow-hidden"
      zoomControl={false}
    >
      <InvalidateSizeOnMount />
      <OpenFreeMapLayer dark={dark} />
      <ClickHandler onPick={onPick} />
      {lat != null && lng != null && <Marker position={[lat, lng]} icon={pickerMarkerIcon} />}
    </MapContainer>
  );
}
