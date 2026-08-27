import type { MetadataRoute } from "next";

const origin = "https://quarzion.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api/"],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
