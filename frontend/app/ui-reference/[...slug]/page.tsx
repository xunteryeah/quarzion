import { DeepMarketingPage } from "@/components/DeepMarketingPage";
import { TextlessReference } from "@/components/TextlessReference";
import { marketingPageMap, marketingPages } from "@/lib/marketing-content";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ slug: string[] }> };

export const metadata: Metadata = {
  title: "UI Reference",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return marketingPages.map((page) => ({ slug: page.path.split("/") }));
}

export default async function UiReferenceRoute({ params }: PageProps) {
  const { slug } = await params;
  const page = marketingPageMap.get(slug.join("/"));
  if (!page) notFound();
  return <TextlessReference><DeepMarketingPage page={page} /></TextlessReference>;
}
