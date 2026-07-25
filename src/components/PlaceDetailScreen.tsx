"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Link as LinkIcon } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import type { DateIdea } from "@/lib/types";
import { priceTier } from "@/lib/priceTier";
import { pill, mutedText } from "@/lib/ui";

type LoadState = "loading" | "error";

export default function PlaceDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const [idea, setIdea] = useState<DateIdea | LoadState>("loading");

  useEffect(() => {
    let cancelled = false;
    setIdea("loading");
    apiFetch(`/api/date-ideas/${id}`)
      .then((data) => {
        if (!cancelled) setIdea(data);
      })
      .catch(() => {
        if (!cancelled) setIdea("error");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-[var(--app-canvas)]">
      <div className="flex items-center px-4 pb-2" style={{ paddingTop: "calc(var(--safe-top) + var(--content-top-gap))" }}>
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="inline-flex size-10 items-center justify-center rounded-full bg-[var(--app-overlay)] text-[var(--app-ink)] ring-1 ring-[var(--app-outline)]/10 active:scale-90 transition"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10">
        {idea === "loading" && <p className={mutedText}>Loading…</p>}
        {idea === "error" && <p className={mutedText}>Couldn't load this place.</p>}
        {idea !== "loading" && idea !== "error" && (
          <div className="mx-auto flex max-w-2xl flex-col gap-4 pt-2">
            <h1 className="text-[26px] font-semibold leading-[1.1]">{idea.title}</h1>

            {idea.priceNote && (
              <p className="text-[16px] font-semibold">{priceTier(idea.priceNote) ?? idea.priceNote}</p>
            )}

            {idea.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {idea.tags.map((t) => (
                  <span key={t.tag.id} className={pill}>
                    {t.tag.name}
                  </span>
                ))}
              </div>
            )}

            {idea.description && <p className="text-[15px] leading-relaxed">{idea.description}</p>}

            {idea.locations.length > 0 && (
              <div className="flex flex-col gap-2.5 pt-2">
                <h2 className={mutedText}>{idea.locations.length > 1 ? "Locations" : "Location"}</h2>
                {idea.locations.map((loc) => (
                  <div
                    key={loc.id}
                    className="flex flex-col gap-1.5 rounded-[18px] border border-[var(--app-outline)]/10 bg-[var(--app-overlay)] p-3.5"
                  >
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="mt-0.5 shrink-0" />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[14px] font-medium">{loc.address || "No address"}</span>
                        {loc.metro && <span className={mutedText}>M {loc.metro}</span>}
                      </div>
                    </div>
                    {loc.url && (
                      <a
                        href={loc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-fit items-center gap-1 text-[13px] font-semibold text-[var(--app-ink)] active:opacity-60"
                      >
                        <LinkIcon size={13} />
                        Open link
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
