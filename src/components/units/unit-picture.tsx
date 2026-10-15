"use client";

import { useLayoutEffect, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UnitSilhouette } from "@/components/units/unit-silhouette";

const PORTRAIT = 4 / 5;

export function UnitPicture({ src, alt }: { src: string | null; alt: string }) {
  const [open, setOpen] = useState(false);
  const frame = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const button = frame.current;
    const stack = button?.nextElementSibling;
    if (!button || !(stack instanceof HTMLElement)) return;

    const fit = () => {
      const row = button.parentElement;
      const sideBySide = !!row && getComputedStyle(row).flexDirection === "row";
      button.style.width = sideBySide
        ? `${Math.round(stack.getBoundingClientRect().height * PORTRAIT)}px`
        : "";
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(stack);
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <>
      <button
        ref={frame}
        type="button"
        className="relative aspect-[4/5] w-full max-w-60 shrink-0 cursor-zoom-in sm:aspect-auto sm:max-w-none sm:self-stretch"
        aria-label={`Open ${alt} image`}
        onClick={() => setOpen(true)}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            className="aspect-[4/5] w-full rounded-md border border-border bg-muted/60 object-cover sm:absolute sm:inset-0 sm:aspect-auto sm:size-full"
          />
        ) : (
          <UnitSilhouette
            className="aspect-[4/5] rounded-md border border-border sm:absolute sm:inset-0 sm:aspect-auto sm:size-full"
            label={alt}
          />
        )}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{alt}</DialogTitle>
          </DialogHeader>
          {src ? (
            <img src={src} alt={alt} className="max-h-[85vh] w-full object-contain" />
          ) : (
            <UnitSilhouette className="min-h-64 rounded-md" label={alt} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
