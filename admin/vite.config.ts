import vinext from "vinext";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { sites } from "./build/sites-vite-plugin";

const sitesTarget = process.env.QUARZION_BUILD_TARGET === "sites";

export default defineConfig({
  plugins: [vinext(), sites()],
  build: sitesTarget ? { rolldownOptions: { external: ["cloudflare:workers"] } } : undefined,
  resolve: sitesTarget ? { alias: {
    "@/db/runtime": fileURLToPath(new URL("./db/runtime.sites.ts", import.meta.url)),
    "@/db/bootstrap": fileURLToPath(new URL("./db/bootstrap.sites.ts", import.meta.url)),
  } } : undefined,
});
