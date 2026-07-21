"use client";

import { useEffect, useState } from "react";

function isTextField(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA";
}

/** True while a text input/textarea is focused — used to hide the bottom nav so it
 * doesn't float awkwardly above the on-screen keyboard. */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    function onFocusIn(e: FocusEvent) {
      if (isTextField(e.target)) setOpen(true);
    }
    function onFocusOut(e: FocusEvent) {
      if (isTextField(e.target)) setOpen(false);
    }
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);
  return open;
}
