"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

const WIDE = "(min-width: 1024px)";

export function RightRailOffset() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia(WIDE);
    const apply = () => {
      const on = pathname === "/units" && mq.matches;
      root.style.setProperty("--rail-right", on ? "20rem" : "0px");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [pathname]);

  return null;
}
