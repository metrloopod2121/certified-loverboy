export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// MapLibre GL orders coordinates as [lng, lat] (GeoJSON convention) -- the reverse of Leaflet's
// [lat, lng]. Every coordinate tuple in the map components follows that convention now.
export const MOSCOW_CENTER: [number, number] = [37.618423, 55.751244];

export const FOCUS_ZOOM = 16;

/** Builds the little colored-dot marker element -- a plain styled div (see map-theme.css'
 *  .date-marker* classes) handed to maplibre-gl's `Marker({ element })`, same visual language as
 *  the old Leaflet divIcons. */
export function createPlaceMarkerElement(isEvent: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `date-marker date-marker--${isEvent ? "date" : "venue"}`;
  return el;
}

/** The larger yellow dot used by LocationPicker's single pick-a-spot marker. */
export function createPickerMarkerElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "date-marker date-marker--picker";
  return el;
}
