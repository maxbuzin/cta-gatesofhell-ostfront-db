import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.webp"
      alt=""
      width={32}
      height={32}
      className={cn("size-8 shrink-0", className)}
    />
  );
}
