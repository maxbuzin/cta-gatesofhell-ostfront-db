import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL_OWNER;
if (!url) {
  throw new Error(
    "DATABASE_URL_OWNER is required for drizzle-kit (owner / unpooled Neon URL)",
  );
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
