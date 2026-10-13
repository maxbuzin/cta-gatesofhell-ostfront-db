export function FanNotice({ updated }: { updated?: string | null }) {
  return (
    <p
      role="note"
      className="rounded-md border border-border px-4 py-3 text-center text-sm text-muted-foreground"
    >
      This site exists only to help players. No ads, no donations, no money
      made. Suggestions or issues: send a direct message on Instagram{" "}
      <a
        href="https://instagram.com/maxbuzindev"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-brass underline underline-offset-2 hover:text-foreground"
      >
        @maxbuzindev
      </a>
      .{updated ? ` Data updated ${updated}.` : null}
    </p>
  );
}
