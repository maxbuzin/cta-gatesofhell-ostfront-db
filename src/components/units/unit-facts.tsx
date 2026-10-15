"use client";

import { StatCell } from "@/components/units/stat-cell";
import type { StatDef, StatDirection, StatGroup } from "@/lib/stats/definitions";
import type { SquadMember, UnitFacts as Facts } from "@/lib/unit-facts";

const AMMO_TIPS: Record<string, string> = {
  AP: "Armor-piercing solid shot.",
  APCR: "Armor-piercing composite rigid.",
  "APC-HE": "Armor-piercing capped with HE filler.",
  APHE: "Armor-piercing high explosive.",
  HEAT: "High-explosive anti-tank.",
  HE: "High explosive.",
  WP: "White phosphorus.",
  Smoke: "Smoke round.",
};

function soldierKey(member: SquadMember, index: number) {
  return `${member.role}-${member.weapon}-${index}`;
}

function Fact({
  value,
  label,
  group,
  icon,
  unit = "",
  direction = "higher",
}: {
  value: number | string | null | undefined;
  label: string;
  group: StatGroup;
  icon: StatDef["icon"];
  unit?: string;
  direction?: StatDirection;
}) {
  if (value == null || value === "") return null;
  return (
    <StatCell value={value} label={label} group={group} icon={icon} unit={unit} direction={direction} />
  );
}

export function UnitFacts({ facts }: { facts: Facts }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Fact value={facts.hp} label="HP" group="yellow" icon="Heart" />
        <Fact value={facts.armor} label="Armor" group="yellow" icon="Shield" unit="mm" />
        <Fact value={facts.speed} label="Speed" group="green" icon="Gauge" unit="km/h" />
        <Fact value={facts.reload} label="Reload" group="green" icon="Timer" unit="s" direction="lower" />
        <Fact value={facts.vision} label="Line of sight" group="blue" icon="Eye" unit="m" />
        <Fact value={facts.squadSize} label="Squad size" group="purple" icon="Users" direction="neutral" />
        <Fact value={facts.caliber} label="Caliber" group="pink" icon="CircleDot" unit="mm" />
        <Fact value={facts.range} label="Range" group="blue" icon="Ruler" unit="m" />
        <Fact value={facts.cp} label="Command points" group="gray" icon="HardHat" direction="lower" />
        <Fact value={facts.cost} label="Resources" group="gray" icon="Coins" direction="lower" />
      </div>
      {facts.members.length > 0 ? (
        <div className="space-y-2">
          {facts.members.map((member, index) => (
            <div key={soldierKey(member, index)} className="flex flex-wrap gap-2">
              <Fact value={member.count} label={member.role} group="purple" icon="Users" direction="neutral" />
              <Fact value={member.caliberMm} label={member.weapon} group="pink" icon="CircleDot" unit="mm" />
              <Fact value={member.rpm} label={`${member.weapon} rate of fire`} group="green" icon="Timer" unit="rpm" />
              <Fact value={member.rangeM} label={`${member.weapon} range`} group="blue" icon="Ruler" unit="m" />
            </div>
          ))}
        </div>
      ) : null}
      {facts.penetration.map((ammo) => (
        <div key={`${ammo.kind}-${ammo.name}`} className="flex flex-wrap gap-2">
          <Fact value={ammo.kind} label={AMMO_TIPS[ammo.kind] || ammo.name} group="red" icon="Crosshair" direction="neutral" />
          {ammo.points.map((point) => (
            <Fact
              key={point.rangeM}
              value={point.mm}
              label={`${ammo.kind} at ${point.rangeM} m`}
              group="red"
              icon="Crosshair"
              unit="mm"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
