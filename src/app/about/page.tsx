import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <h1 className="page-title">About</h1>
      <div className="space-y-4 text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">OSTFRONT DB</span>{" "}
          is a free, open-source, no-login unit database for{" "}
          <em>Call to Arms – Gates of Hell: Ostfront</em>. It is a turbo
          spreadsheet: search units, read stats, compare side by side, and
          explore Conquest research trees.
        </p>
        <p>
          Author: <span className="text-foreground">Max Buzin</span>. Code is
          MIT. Data is CC BY-SA. Contributions welcome via GitHub issues and
          pull requests.
        </p>
        <p id="privacy">
          Privacy: the site stores no accounts and collects no personal data in
          v1. Compare selections stay in your browser (localStorage).
        </p>
        <p>
          Not affiliated with Barbedwire Studios, 1C Entertainment,
          Digitalmindsoft, or Fandom.
        </p>
        <p>
          <a
            href="https://github.com/maxbuzin/cta-gatesofhell-ostfront-db"
            className="text-primary hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            Contribute on GitHub
          </a>
        </p>
      </div>
    </div>
  );
}
