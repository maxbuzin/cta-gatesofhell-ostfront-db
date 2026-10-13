import Link from "next/link";
import { CommandSearch, type SearchIndexItem } from "@/components/search/command-search";
import { MobileNav } from "@/components/layout/mobile-nav";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STEAM_URL =
  "https://store.steampowered.com/app/400750/Call_to_Arms__Gates_of_Hell_Ostfront/";

const SHOW_GITHUB = false;

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12 2C6.477 2 2 6.584 2 12.253c0 4.526 2.865 8.363 6.839 9.718.5.094.682-.222.682-.486 0-.24-.009-.875-.014-1.718-2.782.619-3.37-1.37-3.37-1.37-.454-1.18-1.11-1.494-1.11-1.494-.908-.636.069-.623.069-.623 1.003.072 1.53 1.056 1.53 1.056.892 1.566 2.341 1.114 2.91.852.091-.662.35-1.114.636-1.37-2.22-.259-4.555-1.138-4.555-5.067 0-1.12.39-2.036 1.03-2.754-.103-.26-.447-1.303.098-2.716 0 0 .84-.275 2.75 1.052A9.36 9.36 0 0 1 12 6.844a9.36 9.36 0 0 1 2.504.345c1.909-1.327 2.748-1.052 2.748-1.052.547 1.413.203 2.456.1 2.716.64.718 1.028 1.634 1.028 2.754 0 3.94-2.339 4.805-4.566 5.058.359.318.679.944.679 1.904 0 1.374-.012 2.482-.012 2.82 0 .267.18.586.688.486A10.27 10.27 0 0 0 22 12.253C22 6.584 17.523 2 12 2Z" />
    </svg>
  );
}

export function TopBar({ searchIndex }: { searchIndex: SearchIndexItem[] }) {
  return (
    <header className="relative z-40 border-b border-border bg-background pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center gap-2 px-3 md:px-4">
        <div className="flex shrink-0 items-center gap-2">
          <MobileNav />
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 transition-opacity duration-150 hover:opacity-90"
          >
            <BrandLogo />
            <span className="hidden font-display text-lg tracking-wider text-foreground sm:inline">
              OSTFRONT DB
            </span>
          </Link>
          <Badge
            variant="outline"
            className="hidden border-brass/60 px-2 py-0.5 text-[10px] tracking-widest text-brass uppercase lg:inline-flex"
          >
            Non-official website
          </Badge>
          {SHOW_GITHUB ? (
            <Button variant="ghost" size="icon" asChild>
              <a
                href="https://github.com/maxbuzin/cta-gatesofhell-ostfront-db"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub repository"
              >
                <GitHubIcon className="size-4" />
              </a>
            </Button>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 items-center">
          <CommandSearch index={searchIndex} />
        </div>
        <Button size="xs" className="shrink-0" asChild>
          <a href={STEAM_URL} target="_blank" rel="noopener noreferrer">
            Buy on Steam
          </a>
        </Button>
      </div>
    </header>
  );
}
