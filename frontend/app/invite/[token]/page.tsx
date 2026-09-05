import type { Metadata } from "next";
import { InvitationForm } from "@/components/InvitationForm";

export const metadata: Metadata = { title: "接受邀请｜WindCall", robots: { index: false, follow: false } };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InvitationForm token={token} />;
}
