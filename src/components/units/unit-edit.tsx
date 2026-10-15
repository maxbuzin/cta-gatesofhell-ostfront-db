"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { EditToggle, SaveButton } from "@/components/edit/edit-actions";
import { UnitFields } from "@/components/edit/unit-fields";
import { Input } from "@/components/ui/input";
import { CostChips } from "@/components/units/cost-chips";
import { UnitFacts } from "@/components/units/unit-facts";
import { AmmoFields, TypeLabel, TypeSelect } from "@/components/edit/unit-loadout";
import { profileToDraft, readUnitProfile, type UnitDraft, type UnitProfile } from "@/lib/unit-profile";
import {
  readUnitLoadout,
  type AmmoDraft,
  type TypeChoice,
  type TypeOption,
} from "@/lib/unit-loadout";
import type { UnitFacts as UnitFactsData } from "@/lib/unit-facts";

type UnitEdit = {
  editable: boolean;
  editing: boolean;
  pending: boolean;
  error: string | null;
  draft: UnitDraft;
  profile: UnitProfile;
  type: TypeChoice;
  ammo: AmmoDraft[];
  setDraft: (next: UnitDraft) => void;
  setType: (next: TypeChoice) => void;
  setAmmo: (next: AmmoDraft[]) => void;
  toggle: () => void;
  save: () => void;
};

const UnitEditContext = createContext<UnitEdit | null>(null);

function useUnitEdit() {
  const ctx = useContext(UnitEditContext);
  if (!ctx) throw new Error("Unit edit is missing");
  return ctx;
}

function shown(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

async function postEdit(body: Record<string, unknown>) {
  const res = await fetch("/api/local-edit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) return payload?.error || "Save failed";
  return null;
}

export function UnitEditProvider({
  slug,
  editable,
  profile,
  type: typeProp,
  ammo: ammoProp,
  children,
}: {
  slug: string;
  editable: boolean;
  profile: UnitProfile;
  type: TypeChoice;
  ammo: AmmoDraft[];
  children: ReactNode;
}) {
  const router = useRouter();
  const profileKey = JSON.stringify(profile);
  const loadoutKey = JSON.stringify({ type: typeProp, ammo: ammoProp });
  const [seen, setSeen] = useState(profileKey);
  const [seenLoadout, setSeenLoadout] = useState(loadoutKey);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(profile);
  const [draft, setDraft] = useState(() => profileToDraft(profile));
  const [savedType, setSavedType] = useState(typeProp);
  const [type, setType] = useState(typeProp);
  const [savedAmmo, setSavedAmmo] = useState(ammoProp);
  const [ammo, setAmmo] = useState(ammoProp);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (seen !== profileKey) {
    setSeen(profileKey);
    setSaved(profile);
    if (!editing) setDraft(profileToDraft(profile));
  }
  if (seenLoadout !== loadoutKey) {
    setSeenLoadout(loadoutKey);
    setSavedType(typeProp);
    setSavedAmmo(ammoProp);
    if (!editing) {
      setType(typeProp);
      setAmmo(ammoProp);
    }
  }

  function toggle() {
    if (pending) return;
    if (editing) {
      setDraft(profileToDraft(saved));
      setType(savedType);
      setAmmo(savedAmmo);
      setError(null);
      setEditing(false);
      return;
    }
    setEditing(true);
  }

  async function save() {
    const parsed = readUnitProfile(draft);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const loadout = readUnitLoadout(type, ammo);
    if (!loadout.ok) {
      setError(loadout.error);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const profileError = await postEdit({ kind: "unit-profile", slug, ...parsed.value });
      if (profileError) {
        setError(profileError);
        return;
      }
      const loadoutError = await postEdit({ kind: "unit-loadout", slug, ...loadout.value });
      if (loadoutError) {
        setError(loadoutError);
        return;
      }
      setSaved(parsed.value);
      setDraft(profileToDraft(parsed.value));
      setSavedType(type);
      setSavedAmmo(ammo);
      router.refresh();
    } catch {
      setError("Save failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <UnitEditContext.Provider
      value={{
        editable,
        editing,
        pending,
        error,
        draft,
        profile,
        type,
        ammo,
        setDraft,
        setType,
        setAmmo,
        toggle,
        save,
      }}
    >
      {children}
    </UnitEditContext.Provider>
  );
}

export function UnitEditActions() {
  const { editable, editing, pending, toggle, save } = useUnitEdit();
  if (!editable) return null;
  return (
    <>
      <EditToggle editing={editing} disabled={pending} onClick={toggle} />
      {editing ? <SaveButton pending={pending} onClick={() => void save()} /> : null}
    </>
  );
}

export function UnitEditError() {
  const { error } = useUnitEdit();
  if (!error) return null;
  return <p className="text-sm text-destructive">{error}</p>;
}

export function UnitTitle() {
  const { editing, draft, setDraft, profile, pending } = useUnitEdit();
  if (!editing) return <h1 className="page-title min-w-0 flex-1">{profile.name}</h1>;
  return (
    <Input
      aria-label="Name"
      className="page-title h-auto min-w-0 flex-1 py-1 text-2xl md:text-2xl"
      value={draft.name}
      maxLength={300}
      disabled={pending}
      onChange={(event) => setDraft({ ...draft, name: event.target.value })}
    />
  );
}

export function UnitCosts() {
  const { editing, draft, profile } = useUnitEdit();
  const cp = editing ? shown(draft.cp) : profile.cp;
  const cost = editing ? shown(draft.cost) : profile.cost;
  return <CostChips cp={cp} resources={cost} />;
}

function lines(value: string | null) {
  return (value || "").split("\n").filter(Boolean);
}

export function UnitTypeChip({ types }: { types: TypeOption[] }) {
  const { editing, pending, type, setType } = useUnitEdit();
  if (!editing) return <TypeLabel name={type.name} />;
  return <TypeSelect types={types} value={type} disabled={pending} onChange={setType} />;
}

export function UnitOverview({ facts }: { facts: UnitFactsData }) {
  const { editing, draft, setDraft, profile, pending, ammo, setAmmo } = useUnitEdit();
  if (editing) {
    return (
      <div className="space-y-6">
        <UnitFields
          value={draft}
          disabled={pending}
          onChange={(next) => setDraft({ ...draft, ...next })}
        />
        <AmmoFields value={ammo} disabled={pending} onChange={setAmmo} />
      </div>
    );
  }
  const best = lines(profile.bestAt);
  const weak = lines(profile.weakAgainst);
  return (
    <div className="space-y-4">
      <UnitFacts facts={facts} />
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 font-medium">Best at</h3>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            {best.map((line) => (
              <li key={line}>{line}</li>
            ))}
            {best.length === 0 ? <li>--</li> : null}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 font-medium">Weak against</h3>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            {weak.map((line) => (
              <li key={line}>{line}</li>
            ))}
            {weak.length === 0 ? <li>--</li> : null}
          </ul>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{profile.description || "--"}</p>
    </div>
  );
}
