"use client";

import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyLinkButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          toast.success("Link copied");
        } catch {
          toast.error("Could not copy link");
        }
      }}
    >
      <Link2 className="size-3.5" />
      Copy link
    </Button>
  );
}
