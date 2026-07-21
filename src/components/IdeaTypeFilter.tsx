"use client";

import { Heart, Layers3, Utensils } from "lucide-react";
import { useIdeaTypeFilter, type IdeaTypeFilter as IdeaTypeFilterValue } from "@/components/IdeaTypeFilterProvider";
import { pillToggle, pillToggleActive, pillToggleInactive } from "@/lib/ui";

const options: { value: IdeaTypeFilterValue; label: string; Icon: typeof Layers3 }[] = [
  { value: "ALL", label: "Все", Icon: Layers3 },
  { value: "DATE", label: "Свидания", Icon: Heart },
  { value: "FOOD", label: "Еда", Icon: Utensils },
];

export default function IdeaTypeFilter({ fullWidth = false }: { fullWidth?: boolean }) {
  const { filter, setFilter } = useIdeaTypeFilter();

  return (
    <div className={`${fullWidth ? "flex w-full" : "inline-flex w-fit self-start"} gap-1 rounded-full bg-[var(--app-overlay)] p-1 ring-1 ring-[var(--app-outline)]/10`}>
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setFilter(value)}
          className={`${pillToggle} inline-flex items-center gap-1 border-0 py-1.5 ${fullWidth ? "flex-1 justify-center" : ""} ${filter === value ? pillToggleActive : pillToggleInactive}`}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}
