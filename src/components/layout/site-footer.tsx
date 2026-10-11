import Link from "next/link";

export function SiteFooter({ gameVersion }: { gameVersion: string | null }) {
  return (
    <footer className="mt-auto border-t border-border bg-surface/60 px-4 py-6 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="font-stat text-foreground">
            Game {gameVersion ? `v${gameVersion}` : "version --"}
          </p>
          <p>
            Not affiliated with Barbedwire Studios / 1C Entertainment /
            Digitalmindsoft.
          </p>
        </div>
        <div className="space-y-1 md:text-right">
          <p>
            Data:{" "}
            <Link href="/sources" className="text-primary underline-offset-2 hover:underline">
              CC BY-SA
            </Link>{" "}
            (from community sources / GoH Fandom wiki)
          </p>
          <p>
            Code:{" "}
            <a
              href="https://github.com/maxbuzin/cta-gatesofhell-ostfront-db/blob/main/LICENSE"
              className="text-primary underline-offset-2 hover:underline"
              rel="noopener noreferrer"
            >
              MIT
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
