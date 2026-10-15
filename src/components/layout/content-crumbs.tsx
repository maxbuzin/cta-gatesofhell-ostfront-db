"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function ContentCrumbs({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSlot(document.getElementById("content-crumbs"));
  }, []);

  if (!slot) return null;
  return createPortal(children, slot);
}
