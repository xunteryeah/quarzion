import { MarketingHome } from "@/components/MarketingHome";
import { TextlessReference } from "@/components/TextlessReference";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UI Reference",
  robots: { index: false, follow: false },
};

export default function UiReferenceHome() {
  return <TextlessReference><MarketingHome /></TextlessReference>;
}
