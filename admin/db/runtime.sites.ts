import { env as cloudflareEnv } from "cloudflare:workers";

export const env = cloudflareEnv as unknown as { DB: D1Database };
