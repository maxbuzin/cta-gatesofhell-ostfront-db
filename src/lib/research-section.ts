function clean(value: string | null | undefined) {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  return trimmed || null;
}

export function sectionLabel(name: string | null, index: number, firstName?: string | null) {
  return clean(name) ?? clean(firstName) ?? `Section ${index + 1}`;
}
