"use client";

import { createContext, useContext, useState } from "react";
import type { DateIdeaType } from "@/lib/types";

export type IdeaTypeFilter = "ALL" | DateIdeaType;

type IdeaTypeFilterContextValue = {
  filter: IdeaTypeFilter;
  setFilter: (filter: IdeaTypeFilter) => void;
};

const IdeaTypeFilterContext = createContext<IdeaTypeFilterContextValue | null>(null);
const STORAGE_KEY = "certified-loverboy:idea-type-filter";

function isFilter(value: string | null): value is IdeaTypeFilter {
  return value === "ALL" || value === "DATE" || value === "FOOD";
}

export default function IdeaTypeFilterProvider({ children }: { children: React.ReactNode }) {
  const [filter, setFilterState] = useState<IdeaTypeFilter>(() => {
    if (typeof window === "undefined") return "ALL";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return isFilter(saved) ? saved : "ALL";
  });

  function setFilter(next: IdeaTypeFilter) {
    setFilterState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <IdeaTypeFilterContext.Provider value={{ filter, setFilter }}>
      {children}
    </IdeaTypeFilterContext.Provider>
  );
}

export function useIdeaTypeFilter() {
  const context = useContext(IdeaTypeFilterContext);
  if (!context) throw new Error("useIdeaTypeFilter must be used within IdeaTypeFilterProvider");
  return context;
}
