import { Button } from "@/components/ui/button";

const STEAM_URL =
  "https://store.steampowered.com/app/400750/Call_to_Arms__Gates_of_Hell_Ostfront/";

export function SteamBanner() {
  return (
    <div className="flex items-center justify-center gap-3 border-b border-border bg-brass/15 px-3 py-1.5 text-sm">
      <p className="min-w-0 truncate text-foreground">
        Call to Arms - Gates of Hell: Ostfront
      </p>
      <Button size="xs" asChild>
        <a href={STEAM_URL} target="_blank" rel="noopener noreferrer">
          Buy on Steam
        </a>
      </Button>
    </div>
  );
}
