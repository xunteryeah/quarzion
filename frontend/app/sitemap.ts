import { marketingPages } from "@/lib/marketing-content";
import type { MetadataRoute } from "next";

const origin = "https://quarzion.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date("2026-08-20T00:00:00+08:00");

  return [
    {
      url: origin,
      lastModified: updated,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...marketingPages.map((page) => ({
      url: `${origin}/${page.path}`,
      lastModified: updated,
      changeFrequency: page.kind === "article" || page.kind === "lab" ? "monthly" as const : "weekly" as const,
      priority: page.kind === "product" || page.kind === "solution" ? 0.9 : 0.7,
    })),
  ];
}
