"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Link as LinkIcon, CalendarClock, Pencil, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { dateIdeaToInput, type DateIdea, type DateIdeaInput } from "@/lib/types";
import DateIdeaForm from "@/components/DateIdeaForm";
import { priceTier } from "@/lib/priceTier";
import { pill, pillBlue, eventBadgeColors, mutedText, hashtag, buttonSecondary } from "@/lib/ui";
import { trackClientEvent } from "@/lib/clientAnalytics";
import { useLang, useT } from "@/hooks/useLang";
import { locationsHeading, formatEventWhen } from "@/lib/i18n";

type LoadState = "loading" | "error";

function linkHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function PlaceDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const { lang } = useLang();
  const t = useT();
  const [loadState, setLoadState] = useState<{ id: string; value: DateIdea | LoadState }>({
    id,
    value: "loading",
  });
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const idea = loadState.id === id ? loadState.value : "loading";

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/date-ideas/${id}`)
      .then((data) => {
        if (!cancelled) setLoadState({ id, value: data });
      })
      .catch(() => {
        if (!cancelled) setLoadState({ id, value: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function updateIdea(input: DateIdeaInput) {
    setActionError(null);
    const updated = await apiFetch(`/api/date-ideas/${id}`, { method: "PATCH", body: JSON.stringify(input) });
    setLoadState({ id, value: updated });
    setEditing(false);
  }

  async function deleteIdea() {
    if (deleting) return;
    setDeleting(true);
    setActionError(null);
    trackClientEvent("place_detail_delete_clicked", { placeId: id });
    try {
      await apiFetch(`/api/date-ideas/${id}`, { method: "DELETE" });
      router.replace("/");
    } catch {
      setActionError(t("couldntDelete"));
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-[var(--app-canvas)]">
      <div className="flex items-center px-4 pb-2" style={{ paddingTop: "calc(var(--safe-top) + var(--content-top-gap) + 14px)" }}>
        <button
          type="button"
          onClick={() => {
            trackClientEvent("place_back_clicked", { placeId: id });
            router.back();
          }}
          aria-label={t("backAria")}
          className="inline-flex size-10 items-center justify-center rounded-full bg-[var(--app-overlay)] text-[var(--app-ink)] ring-1 ring-[var(--app-outline)]/10 active:scale-90 transition"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10">
        {idea === "loading" && <p className={mutedText}>{t("loadingEllipsis")}</p>}
        {idea === "error" && <p className={mutedText}>{t("couldntLoadPlace")}</p>}
        {idea !== "loading" && idea !== "error" && (
          <div className="mx-auto flex max-w-2xl flex-col gap-4 pt-2">
            {editing ? (
              <DateIdeaForm
                initial={dateIdeaToInput(idea)}
                onSubmit={updateIdea}
                onCancel={() => {
                  setActionError(null);
                  setEditing(false);
                }}
              />
            ) : (
              <>
                <h1 className="text-[26px] font-semibold leading-[1.1]">{idea.title}</h1>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActionError(null);
                      trackClientEvent("place_detail_edit_opened", { placeId: id });
                      setEditing(true);
                    }}
                    className={`${buttonSecondary} min-w-0 px-3`}
                  >
                    <Pencil size={16} />
                    <span className="truncate">{t("editAria")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={deleteIdea}
                    disabled={deleting}
                    className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[15px] font-semibold text-red-600 transition active:scale-[0.98] disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    <span className="truncate">{deleting ? t("deletingBtn") : t("deleteAria")}</span>
                  </button>
                </div>
                {actionError && <p className={mutedText}>{actionError}</p>}

                {idea.eventStartsAt && (
                  <div className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-bold ${eventBadgeColors}`}>
                    <CalendarClock size={15} />
                    {formatEventWhen(lang, idea.eventStartsAt, idea.eventEndsAt)}
                  </div>
                )}

                {idea.priceNote && (
                  <p className="text-[16px] font-semibold">{priceTier(idea.priceNote) ?? idea.priceNote}</p>
                )}

                {idea.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {idea.tags.map((t) => (
                      <span key={t.tag.id} className={idea.eventStartsAt ? pillBlue : pill}>
                        {hashtag(t.tag.name)}
                      </span>
                    ))}
                  </div>
                )}

                {idea.description && <p className="text-[15px] leading-relaxed">{idea.description}</p>}

                {idea.locations.length > 0 && (
                  <div className="flex flex-col gap-2.5 pt-2">
                    <h2 className={mutedText}>{locationsHeading(lang, idea.locations.length)}</h2>
                    {idea.locations.map((loc) => (
                      <div
                        key={loc.id}
                        className="flex flex-col gap-1.5 rounded-[18px] border border-[var(--app-outline)]/10 bg-[var(--app-overlay)] p-3.5"
                      >
                        <div className="flex items-start gap-2">
                          <MapPin size={16} className="mt-0.5 shrink-0" />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[14px] font-medium">{loc.address || t("noAddress")}</span>
                            {loc.metro && <span className={mutedText}>M {loc.metro}</span>}
                          </div>
                        </div>
                        {loc.url && (
                          <a
                            href={loc.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => trackClientEvent("place_external_link_opened", { placeId: id, type: "map", host: linkHostname(loc.url!) })}
                            className="inline-flex w-fit items-center gap-1 text-[13px] font-semibold text-[var(--app-ink)] active:opacity-60"
                          >
                            <LinkIcon size={13} />
                            {t("openLink")}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {idea.links.length > 0 && (
                  <div className="flex flex-col gap-2.5 pt-2">
                    <h2 className={mutedText}>{t("linksLabel")}</h2>
                    <div className="flex flex-col gap-1.5 rounded-[18px] border border-[var(--app-outline)]/10 bg-[var(--app-overlay)] p-3.5">
                      {idea.links.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => trackClientEvent("place_external_link_opened", { placeId: id, type: "link", host: linkHostname(link.url) })}
                          className="inline-flex w-fit items-center gap-1.5 text-[14px] font-medium text-[var(--app-ink)] active:opacity-60"
                        >
                          <LinkIcon size={14} />
                          {link.label || linkHostname(link.url)}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
