import { access, cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import type { Plugin } from "vite";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

// Packages Sites metadata and migrations after Vite finishes compiling.
export function sites(): Plugin {
  let root = process.cwd();

  return {
    name: "sites",
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    async closeBundle() {
      const outputDirectory = resolve(root, "dist", ".openai");
      const hostingConfig = resolve(root, ".openai", "hosting.json");
      const sharedMigrations = resolve(root, "..", "database", "migrations");
      const legacyBridge = resolve(root, "drizzle-sites");
      const drizzleSource = await exists(sharedMigrations) ? sharedMigrations : resolve(root, "drizzle");

      await rm(outputDirectory, { recursive: true, force: true });
      await mkdir(outputDirectory, { recursive: true });

      if (await exists(hostingConfig)) {
        await cp(hostingConfig, resolve(outputDirectory, "hosting.json"));
      }
      const drizzleOutput = resolve(outputDirectory, "drizzle");
      if (process.env.QUARZION_BUILD_TARGET === "sites" && await exists(legacyBridge)) {
        await cp(legacyBridge, drizzleOutput, { recursive: true });
      }
      if (await exists(drizzleSource)) {
        await cp(drizzleSource, drizzleOutput, {
          recursive: true,
        });
      }
    },
  };
}
