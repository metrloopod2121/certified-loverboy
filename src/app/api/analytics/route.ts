import { NextResponse } from "next/server";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { trackEvent } from "@/lib/analytics";

const CLIENT_EVENT_NAMES = new Set([
  "app_opened",
  "screen_view",
  "nav_click",
  "storage_add_panel_opened",
  "storage_add_panel_closed",
  "storage_add_mode_selected",
  "storage_filter_changed",
  "storage_sort_changed",
  "storage_place_opened",
  "storage_place_edit_opened",
  "storage_place_delete_clicked",
  "storage_file_import_selected",
  "storage_import_draft_removed",
  "storage_link_input_normalized",
  "geo_location_requested",
  "geo_location_saved",
  "geo_location_failed",
  "geo_location_cleared",
  "profile_export_clicked",
  "profile_support_started",
  "place_back_clicked",
  "place_external_link_opened",
  "map_filter_changed",
  "place_form_location_added",
  "place_form_location_removed",
  "place_form_map_picker_toggled",
  "place_form_location_pin_selected",
  "place_form_location_pin_cleared",
  "place_form_link_added",
  "place_form_link_removed",
  "place_form_submit_attempted",
  "place_form_submit_failed",
  "place_form_validation_failed",
  "place_form_cancelled",
]);

function isProperties(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";
  if (!CLIENT_EVENT_NAMES.has(name)) {
    return NextResponse.json({ error: "Unknown analytics event" }, { status: 400 });
  }

  await trackEvent(name, auth.telegramId, isProperties(body?.properties) ? body.properties : undefined);
  return NextResponse.json({ ok: true });
}
