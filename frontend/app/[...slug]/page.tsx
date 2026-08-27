import { DeepMarketingPage } from "@/components/DeepMarketingPage";
import { marketingPageMap, marketingPages } from "@/lib/marketing-content";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ slug: string[] }> };

export function generateStaticParams() {
  return marketingPages.map((page) => ({ slug: page.path.split("/") }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = marketingPageMap.get(slug.join("/"));
  if (!page) return { title: "页面不存在｜Quarzion", robots: { index: false, follow: false } };
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const url = `${protocol}://${host}/${page.path}`;
  const title = `${page.title}${page.emphasis ? page.emphasis : ""}｜Quarzion`;
  return {
    title,
    description: page.summary,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: { title, description: page.summary, type: page.kind === "article" || page.kind === "guide" || page.kind === "howto" || page.kind === "lab" || page.kind === "case" ? "article" : "website", url, images: [] },
    twitter: { card: "summary", title, description: page.summary, images: [] },
  };
}

export default async function MarketingRoute({ params }: PageProps) {
  const { slug } = await params;
  const page = marketingPageMap.get(slug.join("/"));
  if (!page) notFound();
  return <DeepMarketingPage page={page} />;
}
