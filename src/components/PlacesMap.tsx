"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map-theme.css";
import { MAP_STYLE_URL, MOSCOW_CENTER, FOCUS_ZOOM, createPlaceMarkerElement } from "./mapInternals";
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

/** Builds popup content via DOM APIs (textContent, property assignment) rather than an HTML
 *  string -- these fields come from user-entered place data, and .setHTML() would otherwise be
 *  an injection risk (the old Leaflet version rendered this as JSX, which auto-escaped). */
function buildPopupContent(marker: MapMarker, linkWord: string): HTMLElement {
  const container = document.createElement("div");

  const title = document.createElement("strong");
  title.textContent = marker.title;
  container.appendChild(title);

  if (marker.address) {
    const row = document.createElement("div");
    row.textContent = marker.address;
    container.appendChild(row);
  }
  if (marker.metro) {
    const row = document.createElement("div");
    row.textContent = `M ${marker.metro}`;
    container.appendChild(row);
  }
  if (marker.priceNote) {
    const row = document.createElement("div");
    row.textContent = marker.priceNote;
    container.appendChild(row);
  }
  if (marker.url) {
    const row = document.createElement("div");
    const link = document.createElement("a");
    link.href = marker.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = linkWord;
    row.appendChild(link);
    container.appendChild(row);
  }

  return container;
}

export default function PlacesMap({
  markers,
  focusMarkerId = null,
}: {
  markers: MapMarker[];
  /** Location id to fly to and pop open once it shows up in `markers` -- set when arriving from
   *  Storage's "show on map" button. */
  focusMarkerId?: string | null;
}) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerInstancesRef = useRef<Record<string, maplibregl.Marker>>({});
  const focusedIdRef = useRef<string | null>(null);

  // Created once and lives for the component's lifetime -- markers and the focus target are
  // synced via separate effects below instead of recreating the map itself.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: MOSCOW_CENTER,
      zoom: 11,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Rebuilds all markers whenever the list changes (filters, initial load) -- infrequent enough
  // that a full remove+recreate is simpler than diffing, and markers are positioned independently
  // of the map's own gesture handling so this has no bearing on pan/zoom smoothness. Markers can
  // be added as soon as the map exists -- unlike map data layers, they don't need the style to
  // have finished loading.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.values(markerInstancesRef.current).forEach((marker) => marker.remove());
    markerInstancesRef.current = {};

    for (const marker of markers) {
      const popup = new maplibregl.Popup({ offset: 14 }).setDOMContent(buildPopupContent(marker, t("linkWord")));
      const instance = new maplibregl.Marker({ element: createPlaceMarkerElement(marker.tags.includes("date")) })
        .setLngLat([marker.lng, marker.lat])
        .setPopup(popup)
        .addTo(map);
      markerInstancesRef.current[marker.id] = instance;
    }
  }, [markers, t]);

  // Flies to and pops open a specific marker once it shows up -- used when arriving from
  // Storage's "show on map" button, where the marker list loads asynchronously (own /api/date-ideas
  // fetch) after this component has already mounted. Fires once per focusMarkerId; further manual
  // panning/zooming isn't overridden.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusMarkerId || focusedIdRef.current === focusMarkerId) return;
    const marker = markers.find((m) => m.id === focusMarkerId);
    if (!marker) return;

    focusedIdRef.current = focusMarkerId;
    map.flyTo({ center: [marker.lng, marker.lat], zoom: FOCUS_ZOOM });
    markerInstancesRef.current[focusMarkerId]?.togglePopup();
  }, [markers, focusMarkerId]);

  return <div ref={containerRef} className="h-full w-full" />;
}
