import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HomeSearch } from "@/components/home/home-search";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-20 text-center">
      <h1 className="page-title">Unit lost in the fog of war</h1>
      <p className="text-muted-foreground">
        The page you requested could not be found. Try a search or return home.
      </p>
      <div className="w-full">
        <HomeSearch />
      </div>
      <Button asChild>
        <Link href="/">Back home</Link>
      </Button>
    </div>
  );
}
