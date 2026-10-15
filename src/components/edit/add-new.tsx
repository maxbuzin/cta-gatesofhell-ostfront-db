"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Flag, Network, Users } from "lucide-react";

import { CreateButton } from "@/components/edit/edit-actions";
import { UnitFields } from "@/components/edit/unit-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { emptyParents, ResearchParentFields } from "@/components/edit/research-parents";
import { sectionLabel } from "@/lib/research-section";
import { emptyUnitFields, readUnitFields, type UnitFieldDraft } from "@/lib/unit-profile";

const DEFAULT_COLOR = "#5e6b73";
const NONE = "__none__";
const NEW_SECTION = "__new__";

type FactionOpt = { slug: string; nameEn: string };
type ResearchOpt = {
  factionSlug: string;
  slug: string;
  name: string;
  sectionId: number | null;
  sortOrder: number;
};
type SectionOpt = { id: number; factionSlug: string; name: string | null; sortOrder: number };
type Mode = "faction" | "unit" | "research";

const ADD_KINDS = [
  ["unit", "Create unit", Users],
  ["research", "Create research", Network],
  ["faction", "Create faction", Flag],
] as const;

export type AddRequest = { mode: "unit" | "research"; sectionId: number };

export type ResearchSeed = {
  name: string;
  cost: number | null;
  sectionId: number | null;
  sectionName: string;
  parentSlugs: string[];
  image: File | null;
};

function firstResearchName(research: ResearchOpt[], sectionId: number) {
  const row = research
    .filter((node) => node.sectionId === sectionId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))[0];
  return row?.name ?? null;
}

function factionSections(sections: SectionOpt[], factionSlug: string) {
  return sections
    .filter((section) => section.factionSlug === factionSlug)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

function firstSection(sections: SectionOpt[], factionSlug: string) {
  const row = factionSections(sections, factionSlug)[0];
  return row ? String(row.id) : NEW_SECTION;
}

export function AddNew({
  factions,
  research,
  sections,
  kinds,
  request = null,
  onRequest,
  stageFaction = null,
  onResearch,
  iconSize = "icon",
}: {
  factions: FactionOpt[];
  research: ResearchOpt[];
  sections: SectionOpt[];
  kinds: Mode[];
  request?: AddRequest | null;
  onRequest?: (next: AddRequest | null) => void;
  stageFaction?: string | null;
  onResearch?: (seed: ResearchSeed) => void;
  iconSize?: "icon" | "icon-sm";
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const lastMode = useRef<Mode>("research");
  if (mode) lastMode.current = mode;
  const shown = mode ?? lastMode.current;
  const [name, setName] = useState("");
  const [factionSlug, setFactionSlug] = useState("");
  const [parents, setParents] = useState(emptyParents);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [cost, setCost] = useState("");
  const [sectionValue, setSectionValue] = useState(NEW_SECTION);
  const [sectionName, setSectionName] = useState("");
  const [fields, setFields] = useState<UnitFieldDraft>(emptyUnitFields);
  const parentChoices = research.filter((node) => node.factionSlug === factionSlug);
  const sectionChoices = factionSections(sections, factionSlug);

  function open(next: Mode, sectionId?: number) {
    const section = sections.find((row) => row.id === sectionId);
    const faction = section?.factionSlug ?? factions[0]?.slug ?? "";
    setMode(next);
    setName("");
    setFactionSlug(faction);
    setParents(emptyParents());
    setImage(null);
    setColor(DEFAULT_COLOR);
    setCost("");
    setSectionValue(section ? String(section.id) : firstSection(sections, faction));
    setSectionName("");
    setFields(emptyUnitFields());
    setError(null);
  }

  useEffect(() => {
    if (!request || !kinds.includes(request.mode)) return;
    open(request.mode, request.sectionId);
    onRequest?.(null);
  }, [request]);

  async function save() {
    if (mode !== "faction" && !factionSlug) {
      setError("Add a faction first");
      return;
    }
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (mode === "research" && onResearch && factionSlug === stageFaction) {
      let researchCost: number | null = null;
      if (cost.trim()) {
        const parsed = Number(cost);
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > 2_000_000_000) {
          setError("Invalid cost");
          return;
        }
        researchCost = parsed;
      }
      const sectionId = sectionValue === NEW_SECTION ? null : Number(sectionValue);
      if (sectionId != null && !Number.isInteger(sectionId)) {
        setError("Section is required");
        return;
      }
      onResearch({
        name: name.trim(),
        cost: researchCost,
        sectionId,
        sectionName: sectionName.trim(),
        parentSlugs: parents.filter(Boolean),
        image,
      });
      setMode(null);
      return;
    }
    if (mode === "unit") {
      const parsed = readUnitFields(fields);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
    }
    setPending(true);
    setError(null);
    const init: RequestInit = { method: "POST" };
    if (mode === "faction") {
      init.headers = { "content-type": "application/json" };
      init.body = JSON.stringify({ kind: "faction", name, color });
    } else if (mode) {
      const form = new FormData();
      form.set("kind", mode);
      form.set("factionSlug", factionSlug);
      form.set("name", name);
      if (sectionValue === NEW_SECTION) {
        form.set("newSection", "1");
        form.set("sectionName", sectionName.trim());
      } else {
        form.set("sectionId", sectionValue);
      }
      if (mode === "research") {
        for (const parent of parents) {
          if (parent) form.append("parentSlug", parent);
        }
        if (cost.trim()) form.set("cost", cost.trim());
      }
      if (mode === "unit") {
        for (const [key, value] of Object.entries(fields)) form.set(key, value);
      }
      if (image) form.set("image", image);
      init.body = form;
    }
    try {
      const res = await fetch("/api/local-edit", init);
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
      <div className="flex gap-2">
        {ADD_KINDS.filter(([kind]) => kinds.includes(kind)).map(([kind, label, Icon]) => (
          <Tooltip key={kind}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size={iconSize}
                className="rounded-none"
                aria-label={label}
                onClick={() => open(kind)}
              >
                <Icon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <Dialog open={mode != null} onOpenChange={(open) => !open && setMode(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {shown === "faction" ? "Create faction" : shown === "research" ? "Create research" : "Create unit"}
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            {shown === "faction" ? (
              <>
              <label className="block space-y-1 text-sm">
                <span>Name</span>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={300}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Color</span>
                <input
                  type="color"
                  className="h-9 w-full rounded-md border border-input bg-input/30 px-1"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  required
                />
              </label>
              </>
            ) : (
              <>
                <label className="block space-y-1 text-sm">
                  <span>Faction</span>
                  {factions.length === 0 ? (
                    <p className="flex h-9 items-center rounded-md border border-input bg-input/30 px-2 text-muted-foreground">
                      No factions yet
                    </p>
                  ) : (
                    <Select
                      value={factionSlug}
                      onValueChange={(value) => {
                        setFactionSlug(value);
                        setParents(emptyParents());
                        setSectionValue(firstSection(sections, value));
                        setSectionName("");
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {factions.map((faction) => (
                          <SelectItem key={faction.slug} value={faction.slug}>
                            {faction.nameEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Name</span>
                  <Input value={name} onChange={(event) => setName(event.target.value)} required />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Section</span>
                  <Select value={sectionValue} onValueChange={setSectionValue}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {sectionChoices.map((section, index) => (
                        <SelectItem key={section.id} value={String(section.id)}>
                          {sectionLabel(section.name, index, firstResearchName(research, section.id))}
                        </SelectItem>
                      ))}
                      <SelectItem value={NEW_SECTION}>New section</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                {sectionValue === NEW_SECTION ? (
                  <label className="block space-y-1 text-sm">
                    <span>Section name</span>
                    <Input
                      value={sectionName}
                      onChange={(event) => setSectionName(event.target.value)}
                      placeholder="Optional"
                      maxLength={80}
                    />
                  </label>
                ) : null}
              </>
            )}
            {shown === "research" ? (
              <>
                <ResearchParentFields
                  slots={parents}
                  onChange={setParents}
                  choices={parentChoices
                    .filter((node) => node.slug !== NONE)
                    .map((node) => ({ slug: node.slug, name: node.name }))}
                  idPrefix="create-research-parent"
                />
                <label className="block space-y-1 text-sm">
                  <span>Cost</span>
                  <Input
                    type="number"
                    min={0}
                    max={2000000000}
                    step={1}
                    value={cost}
                    onChange={(event) => setCost(event.target.value)}
                  />
                </label>
              </>
            ) : null}
            {shown === "unit" ? <UnitFields value={fields} onChange={setFields} disabled={pending} /> : null}
            {shown === "unit" || shown === "research" ? (
              <label className="block space-y-1 text-sm">
                <span>Image</span>
                <input
                  key={shown}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="block w-full text-sm"
                  onChange={(event) => setImage(event.target.files?.[0] ?? null)}
                />
              </label>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <CreateButton
              pending={pending}
              label={shown === "research" && onResearch && factionSlug === stageFaction ? "Add" : "Create"}
            />
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
