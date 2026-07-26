"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { select, input, hashtag } from "@/lib/ui";
import { useT } from "@/hooks/useLang";

const dropdownWidths = { list: 224, pills: 288 } as const;
const viewportPadding = 16;

export default function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  open,
  onOpenChange,
  fullWidth = false,
  dotColor,
  variant = "list",
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fullWidth?: boolean;
  dotColor?: (option: string) => string | null;
  /** "list" is a checkbox list (for long/dotted options like metro stations). "pills" is a
   *  flowing row of tap-to-toggle chips sized to their own text, no checkbox — for tags. */
  variant?: "list" | "pills";
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const dropdownWidth = dropdownWidths[variant];
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({ width: dropdownWidth });
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setQuery("");
        onOpenChange(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, onOpenChange]);

  useLayoutEffect(() => {
    if (!open) return;

    function updateDropdownPosition() {
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const width = Math.max(0, Math.min(dropdownWidth, window.innerWidth - viewportPadding * 2));
      let left = 0;

      if (rect.left + width > window.innerWidth - viewportPadding) {
        left = window.innerWidth - viewportPadding - rect.left - width;
      }

      if (rect.left + left < viewportPadding) {
        left = viewportPadding - rect.left;
      }

      setDropdownStyle({ left, width });
    }

    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);
    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open, dropdownWidth]);

  function toggle(option: string) {
    onChange(selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option]);
  }

  if (options.length === 0) return null;

  const visibleOptions = query.trim()
    ? options.filter((option) => option.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div className={`relative isolate ${fullWidth ? "min-w-0" : ""}`} ref={ref}>
      <button
        type="button"
        onClick={() => {
          setQuery("");
          onOpenChange(!open);
        }}
        className={`${select} gap-1 ${fullWidth ? "w-full" : ""} ${selected.length > 0 ? "border-[var(--app-ink)] bg-[var(--app-yellow)]" : ""}`}
      >
        {label}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          className="absolute z-[100] mt-1 flex max-h-72 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-[var(--app-outline)]/15 bg-[var(--app-surface)] shadow-[0_8px_20px_rgba(28,26,23,0.16)]"
          style={dropdownStyle}
        >
          <div className="flex shrink-0 flex-col gap-1 p-2 pb-0">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--app-muted)]" />
              <input
                autoFocus
                placeholder={t("searchPlaceholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`${input} py-1.5 pl-7 text-[13px]`}
              />
            </div>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full rounded-lg px-2 py-1 text-left text-[12px] font-semibold text-[var(--app-ink)] active:bg-black/5"
              >
                {t("clear")}
              </button>
            )}
          </div>

          <div className="overflow-y-auto p-2 pt-1">
            {visibleOptions.length === 0 && <p className="px-2 py-1.5 text-[13px] text-[var(--app-muted)]">{t("nothingFound")}</p>}
            {variant === "pills" ? (
              <div className="flex flex-wrap gap-1.5 p-0.5">
                {visibleOptions.map((option) => {
                  const isSelected = selected.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggle(option)}
                      className={`inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-bold transition active:scale-95 ${
                        isSelected
                          ? "bg-[var(--app-ink)] text-[var(--app-canvas)]"
                          : "bg-[var(--app-pink)]/25 text-[var(--app-ink)]"
                      }`}
                    >
                      {hashtag(option)}
                    </button>
                  );
                })}
              </div>
            ) : (
              visibleOptions.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[14px] active:bg-black/5"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => toggle(option)}
                    className="peer sr-only"
                  />
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-[5px] border-2 border-[var(--app-pink)] bg-[var(--app-surface)] text-[#1c1a17] transition peer-checked:border-[var(--app-pink)] peer-checked:bg-[var(--app-pink)]">
                    <Check size={12} strokeWidth={3} className={`${selected.includes(option) ? "opacity-100" : "opacity-0"} transition`} />
                  </span>
                  {dotColor?.(option) && <span className={`size-2 shrink-0 rounded-full ${dotColor(option)}`} />}
                  <span className="min-w-0 break-words">{option}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
