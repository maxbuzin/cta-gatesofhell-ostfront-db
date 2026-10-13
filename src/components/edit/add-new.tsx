"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { FACTIONS } from "@/lib/factions";

type FactionOpt = { slug: string; nameEn: string };
type ResearchOpt = { factionSlug: string; slug: string; name: string };
type Mode = "faction" | "unit" | "research";

export function AddNew({
  factions,
  research,
}: {
  factions: FactionOpt[];
  research: ResearchOpt[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [name, setName] = useState("");
  const [factionSlug, setFactionSlug] = useState("");
  const [parentSlug, setParentSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const parents = research.filter((node) => node.factionSlug === factionSlug);

  function open(next: Mode) {
    setMode(next);
    setName("");
    setFactionSlug(factions[0]?.slug ?? "");
    setParentSlug("");
    setError(null);
  }

  async function save() {
    if (mode !== "faction" && !factionSlug) {
      setError("Add a faction first");
      return;
    }
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setPending(true);
    setError(null);
    const body =
      mode === "faction"
        ? { kind: "faction", name }
        : mode === "unit"
          ? { kind: "unit", factionSlug, name }
          : { kind: "research", factionSlug, name, parentSlug: parentSlug || null };
    try {
      const res = await fetch("/api/local-edit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string; slug?: string } | null;
      if (!res.ok) {
        setError(payload?.error || "Save failed");
        return;
      }
      setMode(null);
      if (mode === "unit" && payload?.slug) router.push(`/units/${payload.slug}`);
      else if (mode === "research" && factionSlug) router.push(`/research/${factionSlug}`);
      else router.refresh();
    } catch {
      setError("Save failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm">
            Add New
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => open("unit")}>Create unit</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => open("research")}>Create research</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => open("faction")}>Create faction</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={mode != null} onOpenChange={(open) => !open && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === "faction" ? "Create faction" : mode === "research" ? "Create research" : "Create unit"}
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            {mode === "faction" ? (
              <label className="block space-y-1 text-sm">
                <span>Name</span>
                <select
                  className="h-9 w-full rounded-md border border-input bg-input/30 px-2"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                >
                  <option value="">Select</option>
                  {FACTIONS.map((faction) => (
                    <option key={faction.slug} value={faction.nameEn}>
                      {faction.nameEn}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label className="block space-y-1 text-sm">
                  <span>Faction</span>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-input/30 px-2"
                    value={factionSlug}
                    onChange={(event) => {
                      setFactionSlug(event.target.value);
                      setParentSlug("");
                    }}
                    required
                  >
                    {factions.length === 0 ? <option value="">No factions yet</option> : null}
                    {factions.map((faction) => (
                      <option key={faction.slug} value={faction.slug}>
                        {faction.nameEn}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Name</span>
                  <Input value={name} onChange={(event) => setName(event.target.value)} required />
                </label>
              </>
            )}
            {mode === "research" ? (
              <label className="block space-y-1 text-sm">
                <span>Comes after</span>
                <select
                  className="h-9 w-full rounded-md border border-input bg-input/30 px-2"
                  value={parentSlug}
                  onChange={(event) => setParentSlug(event.target.value)}
                >
                  <option value="">None</option>
                  {parents.map((node) => (
                    <option key={node.slug} value={node.slug}>
                      {node.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Create"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
