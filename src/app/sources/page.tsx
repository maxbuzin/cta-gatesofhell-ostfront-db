import type { Metadata } from "next";
import { getSourcesList } from "@/lib/db/queries/units";
import { EmptyState } from "@/components/units/empty-state";
import { safeUrl } from "@/lib/safe";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sources & Credits",
};

export default async function SourcesPage() {
  const sources = await getSourcesList();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="page-title">Sources & Credits</h1>
      <p className="text-muted-foreground">
        Ostfront DB aggregates community and wiki data. Numeric values are
        attributed per source. Data is licensed CC BY-SA where derived from the
        Gates of Hell Fandom wiki.
      </p>

      {sources.length === 0 ? (
        <EmptyState
          title="No sources loaded yet"
          description="Source records appear after the first ETL run."
        />
      ) : (
        <ul className="space-y-3">
          {sources.map((s) => {
            const url = safeUrl(s.url);
            return (
              <li
                key={s.id}
                className="rounded-md border border-border p-4 text-sm"
              >
                <p className="font-medium">{s.title}</p>
                <p className="text-muted-foreground">
                  {s.kind} · {s.license || "--"} · {s.author || "--"}
                </p>
                {url ? (
                  <a
                    href={url}
                    className="text-primary hover:underline"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {url}
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-2 rounded-md border border-border p-4 text-sm text-muted-foreground">
        <p>
          This site is a fan-made, non-commercial project. It is not affiliated
          with, endorsed, sponsored, or approved by Barbedwire Studios, 1C
          Entertainment, Digitalmindsoft, or Fandom.
        </p>
        <p>
          Call to Arms – Gates of Hell: Ostfront and related names and assets
          are trademarks and/or copyrights of their respective owners.
        </p>
      </div>

      <Button asChild>
        <a
          href="https://github.com/maxbuzin/cta-gatesofhell-ostfront-db/issues/new"
          target="_blank"
          rel="noopener noreferrer"
        >
          Report wrong data
        </a>
      </Button>
    </div>
  );
}
