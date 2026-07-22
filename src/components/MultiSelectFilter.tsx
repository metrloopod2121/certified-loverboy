"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Check, ChevronDown } from "lucide-react";
import { select } from "@/lib/ui";

const dropdownWidth = 224;
const viewportPadding = 16;

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
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({ width: dropdownWidth });

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false);
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
  }, [open]);

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
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          className="absolute z-[100] mt-1 max-h-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-[var(--app-outline)]/15 bg-[var(--app-surface)] p-2 shadow-[0_8px_20px_rgba(28,26,23,0.16)]"
          style={dropdownStyle}
        >
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mb-1 w-full rounded-lg px-2 py-1 text-left text-[12px] font-semibold text-[var(--app-ink)] active:bg-black/5"
            >
              Clear
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
                className="peer sr-only"
              />
              <span className="flex size-4 shrink-0 items-center justify-center rounded-[5px] border-2 border-[var(--app-pink)] bg-[var(--app-surface)] text-[#1c1a17] transition peer-checked:border-[var(--app-pink)] peer-checked:bg-[var(--app-pink)]">
                <Check size={12} strokeWidth={3} className={`${selected.includes(option) ? "opacity-100" : "opacity-0"} transition`} />
              </span>
              <span className="min-w-0 break-words">{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
