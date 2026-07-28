"use client";

import { useEffect, useState } from "react";
import { mutedText } from "@/lib/ui";

const ROTATE_MS = 2200;

export default function LoadingCaptions({ phrases }: { phrases: string[] }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (phrases.length <= 1) return;

    const interval = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((prev) => (prev + 1) % phrases.length);
        setVisible(true);
      }, 200);
    }, ROTATE_MS);

    return () => window.clearInterval(interval);
  }, [phrases]);

  return (
    <p className={`${mutedText} min-h-[1.2em] transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}>
      {phrases[index]}
    </p>
  );
}
