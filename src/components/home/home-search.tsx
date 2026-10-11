"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function HomeSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim().slice(0, 64);
        router.push(query ? `/units?q=${encodeURIComponent(query)}` : "/units");
      }}
    >
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          maxLength={64}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search any unit: Panther, ZiS-3, Pz IV H..."
          className="h-11 pl-10"
          aria-label="Search units"
        />
      </div>
      <Button type="submit" className="h-11">
        Search
      </Button>
    </form>
  );
}
