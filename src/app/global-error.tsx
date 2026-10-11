"use client";

export default function GlobalError() {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          margin: 0,
          padding: "3rem 1.5rem",
          background: "#f3f2ea",
          color: "#1a1c16",
        }}
      >
        <main style={{ maxWidth: 480, margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.5rem" }}>Something went wrong</h1>
          <p>An unexpected error occurred. Please try again later.</p>
          {/* global-error replaces the root layout; next/link is unavailable here */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">Back to Ostfront DB</a>
        </main>
      </body>
    </html>
  );
}
