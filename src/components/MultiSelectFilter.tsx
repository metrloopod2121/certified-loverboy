"use client";

import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { select } from "@/lib/ui";

export default function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  open,
  onOpenChange,
  fullWidth = false,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fullWidth?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, onOpenChange]);

  function toggle(option: string) {
    onChange(selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option]);
  }

  if (options.length === 0) return null;

  return (
    <div className={`relative isolate ${fullWidth ? "min-w-0" : ""}`} ref={ref}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={`${select} gap-1 ${fullWidth ? "w-full" : ""} ${selected.length > 0 ? "border-[var(--app-ink)] bg-[var(--app-yellow)]" : ""}`}
      >
        {label}
        {selected.length > 0 ? ` (${selected.length})` : ""}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute z-[100] mt-1 max-h-72 w-56 overflow-y-auto rounded-xl border border-[var(--app-outline)]/15 bg-[var(--app-surface)] p-2 shadow-[0_8px_20px_rgba(28,26,23,0.16)]">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mb-1 w-full rounded-lg px-2 py-1 text-left text-[12px] font-semibold text-[var(--app-ink)] active:bg-black/5"
            >
              Сбросить
            </button>
          )}
          {options.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[14px] active:bg-black/5"
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggle(option)}
                className="h-4 w-4 accent-[var(--app-ink)]"
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
