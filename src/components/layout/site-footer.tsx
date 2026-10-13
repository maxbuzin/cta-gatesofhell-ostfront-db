import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand-logo";

const linkClass = "text-primary underline-offset-2 hover:underline";

export function SiteFooter({ gameVersion }: { gameVersion: string | null }) {
  return (
    <footer className="mt-16 w-full border-t border-border bg-surface/60 px-8 pt-14 pb-2 text-sm text-muted-foreground md:mt-24 md:px-12 md:pt-20 md:pb-2">
      <div className="flex w-full flex-col gap-10 pb-[env(safe-area-inset-bottom)] md:gap-14">
        <div className="flex w-full flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
          <div className="flex items-start gap-3">
            <BrandLogo className="size-10" />
            <div className="space-y-2">
              <p className="font-stat text-foreground">
                Game {gameVersion ? `v${gameVersion}` : "version --"}
              </p>
              <p>
                Not affiliated with Barbedwire Studios / 1C Entertainment /
                Digitalmindsoft.
              </p>
            </div>
          </div>
          <div className="space-y-2 md:text-right">
            <p>
              Data:{" "}
              <Link href="/sources" className={linkClass}>
                CC BY-SA
              </Link>{" "}
              (from community sources / GoH Fandom wiki)
            </p>
            <p>
              Code:{" "}
              <a
                href="https://github.com/maxbuzin/cta-gatesofhell-ostfront-db/blob/main/LICENSE"
                className={linkClass}
                target="_blank"
                rel="noopener noreferrer"
              >
                MIT
              </a>
            </p>
          </div>
        </div>
        <p className="border-t border-border pt-8 leading-relaxed">
          Call to Arms – Gates of Hell: Ostfront and related names and assets
          are trademarks and/or copyrights of their respective owners. Developed
          by{" "}
          <a
            href="https://www.dev.maxbuzin.com"
            className={linkClass}
            target="_blank"
            rel="noopener noreferrer"
          >
            maxbuzin
          </a>{" "}
          (vibecoded).
        </p>
      </div>
    </footer>
  );
}
