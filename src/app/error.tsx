"use client";

import Link from "next/link";

export default function ErrorPage() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center gap-3 px-4 py-16">
      <h1 className="page-title text-2xl">Something went wrong</h1>
      <p className="text-muted-foreground">
        An unexpected error occurred. Try again, or return to the home page.
      </p>
      <Link href="/" className="text-primary underline-offset-4 hover:underline">
        Back to Ostfront DB
      </Link>
    </main>
  );
}
