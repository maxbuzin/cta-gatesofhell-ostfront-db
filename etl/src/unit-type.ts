import type { TabName } from "./types.ts";

const SPG_RE =
  /\b(HMC|GMC|SPG|SU-?(76|122|152)|ISU-?(122|152)|Wespe|Hummel|Sturmpanzer|Brummb[aä]r|Grille|Bison|Sexton|Priest|Bishop|Sturmtiger|Karl)\b/i;

const ARMORED_CAR_RE =
  /(armou?red car|\bBA-\d|\bBA-?[0-9]+|Sd\.? ?Kfz\.? ?(221|222|223|231|232|234|247|260|261|263)\b|\bPuma\b|\bM8\b|\bM20\b|Staghound|Daimler|Humber|Dingo|\bAEC\b|Marmon|Lynx|Otter|Rolls|\bT17\b|\bM3A1 Scout|Panhard|\bP204|Coventry)/i;

const TRUCK_RE =
  /(truck|lorry|Blitz|Studebaker|\bZIS\b|ZIS-|GAZ-AA|GAZ-MM|Bedford|CCKW|Chevrolet|\bFord\b|Krupp|B[uü]ssing|\bDodge\b|\bMorris\b|\bAustin\b|\bGMC\b)/i;

export function resolveUnitType(args: {
  tab: TabName;
  name: string;
  specialties: string[];
  squadSize: number | null;
  ieId: string | null;
  typeColumn: string | null;
}): string {
  const { tab, name, specialties, squadSize, ieId, typeColumn } = args;

  if (tab === "Infantry") {
    if ((ieId && ieId.startsWith("single_")) || squadSize === 1) {
      return "infantry_unit";
    }
    return "infantry_squad";
  }
  if (tab === "Tanks") return "tank";
  if (tab === "Tank Destroyers & SPG") {
    if (
      specialties.some((s) => s.includes("Long-Range Artillery")) ||
      SPG_RE.test(name)
    ) {
      return "spg";
    }
    return "tank_destroyer";
  }
  if (tab === "Armored Cars & Light Vehicles") {
    return ARMORED_CAR_RE.test(name) ? "armored_car" : "light_vehicle";
  }
  if (tab === "Support Vehicles & Trucks") {
    return TRUCK_RE.test(name) ? "truck" : "support_vehicle";
  }
  if (tab === "AT Guns") return "at_gun";
  if (tab === "AA Guns") return "aa_gun";
  if (tab === "Artillery") return "artillery";
  if (tab === "Mortars & Rockets") {
    const t = (typeColumn || "").toLowerCase();
    if (t.includes("rocket")) return "rocket";
    return "mortar";
  }
  if (tab === "MG Emplacements") return "mg_emplacement";
  return "tank";
}
