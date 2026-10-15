"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteUnit({ slug }: { slug: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (pending) return;
    if (!window.confirm("Delete this unit?")) return;
    setPending(true);
    try {
      const res = await fetch("/api/local-edit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "unit-delete", slug }),
      });
      if (res.ok) router.push("/units");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      aria-label="Delete unit"
      disabled={pending}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm border border-border bg-card"
      onClick={() => void remove()}
    >
      <Trash2 className="size-4" />
    </button>
  );
}
