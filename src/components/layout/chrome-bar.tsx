"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

export function ChromeBar({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      document.documentElement.style.setProperty(
        "--chrome-h",
        `${el.offsetHeight}px`,
      );
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--chrome-h");
    };
  }, []);

  return (
    <div ref={ref} className="fixed inset-x-0 top-0 z-40">
      {children}
    </div>
  );
}
