"use client";

import { useEffect, useState } from "react";
import { mutedText } from "@/lib/ui";

const ROTATE_MS = 2200;
const FADE_MS = 180;
const BLANK_MS = 50;

export default function LoadingCaptions({ phrases }: { phrases: string[] }) {
  const [index, setIndex] = useState(0);
  const [caption, setCaption] = useState(phrases[0] ?? "");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let current = 0;
    let fadeTimer: number | undefined;
    let blankTimer: number | undefined;

    if (phrases.length <= 1) return;

    const interval = window.setInterval(() => {
      setVisible(false);

      fadeTimer = window.setTimeout(() => {
        current = (current + 1) % phrases.length;
        setCaption("");

        blankTimer = window.setTimeout(() => {
          setIndex(current);
          setCaption(phrases[current]);
          setVisible(true);
        }, BLANK_MS);
      }, FADE_MS);
    }, ROTATE_MS);

    return () => {
      window.clearInterval(interval);
      if (fadeTimer) window.clearTimeout(fadeTimer);
      if (blankTimer) window.clearTimeout(blankTimer);
    };
  }, [phrases]);

  return (
    <div className={`${mutedText} flex h-[2.8em] w-[min(84vw,340px)] items-center justify-center overflow-hidden text-center leading-snug`}>
      <span
        key={index}
        aria-live="polite"
        className={`block max-w-full transition-opacity duration-150 ${visible && caption ? "opacity-100" : "opacity-0"}`}
      >
        {caption || "\u00a0"}
      </span>
    </div>
  );
}
