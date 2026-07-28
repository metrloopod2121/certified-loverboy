"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Link as LinkIcon, CalendarClock } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import type { DateIdea } from "@/lib/types";
import { priceTier } from "@/lib/priceTier";
import { pill, mutedText, hashtag } from "@/lib/ui";
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
            <h1 className="text-[26px] font-semibold leading-[1.1]">{idea.title}</h1>

            {idea.eventStartsAt && (
              <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--app-coral)] px-3 py-1.5 text-[14px] font-bold text-[var(--app-ink)]">
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
                  <span key={t.tag.id} className={pill}>
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
          </div>
        )}
      </div>
    </div>
  );
}
