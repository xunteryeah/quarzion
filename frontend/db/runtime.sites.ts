import { env as cloudflareEnv } from "cloudflare:workers";

type SitesEnv = {
  DB: D1Database;
  GEO_PROOF_INGEST_KEY?: string;
  GEO_PROOF_INGEST_KEYS?: string;
};

export const env = cloudflareEnv as unknown as SitesEnv;
