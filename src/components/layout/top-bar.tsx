import Link from "next/link";
import { Crosshair } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandSearch, type SearchIndexItem } from "@/components/search/command-search";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12 2C6.477 2 2 6.584 2 12.253c0 4.526 2.865 8.363 6.839 9.718.5.094.682-.222.682-.486 0-.24-.009-.875-.014-1.718-2.782.619-3.37-1.37-3.37-1.37-.454-1.18-1.11-1.494-1.11-1.494-.908-.636.069-.623.069-.623 1.003.072 1.53 1.056 1.53 1.056.892 1.566 2.341 1.114 2.91.852.091-.662.35-1.114.636-1.37-2.22-.259-4.555-1.138-4.555-5.067 0-1.12.39-2.036 1.03-2.754-.103-.26-.447-1.303.098-2.716 0 0 .84-.275 2.75 1.052A9.36 9.36 0 0 1 12 6.844a9.36 9.36 0 0 1 2.504.345c1.909-1.327 2.748-1.052 2.748-1.052.547 1.413.203 2.456.1 2.716.64.718 1.028 1.634 1.028 2.754 0 3.94-2.339 4.805-4.566 5.058.359.318.679.944.679 1.904 0 1.374-.012 2.482-.012 2.82 0 .267.18.586.688.486A10.27 10.27 0 0 0 22 12.253C22 6.584 17.523 2 12 2Z" />
    </svg>
  );
}

export function TopBar({ searchIndex }: { searchIndex: SearchIndexItem[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur paper-grain">
      <div className="flex h-14 items-center gap-2 px-3 md:px-4">
        <MobileNav />
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity duration-150 hover:opacity-90"
        >
          <Crosshair className="size-5 text-brass" aria-hidden />
          <span className="font-display text-lg tracking-wider text-foreground">
            OSTFRONT DB
          </span>
        </Link>
        <div className="ml-auto flex flex-1 items-center justify-end gap-1 md:ml-4 md:justify-center">
          <CommandSearch index={searchIndex} />
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
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
        </div>
      </div>
    </header>
  );
}
