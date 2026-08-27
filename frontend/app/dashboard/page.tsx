import { Dashboard } from "@/components/Dashboard";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ensureDatabase } from "@/db/bootstrap";
import { getSessionByToken, SESSION_COOKIE } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const url = `${protocol}://${host}/dashboard`;
  const image = `${protocol}://${host}/og.png`;
  const title = "Quarzion｜监测与效果证明系统";
  const description = "客户工作台：查看 AI 平台中的品牌可见度、原始回答、引用来源与优化前后效果。";
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "website", url, images: [{ url: image, width: 1200, height: 630, alt: "Quarzion 客户工作台" }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function DashboardPage() {
  await ensureDatabase();
  const cookieStore = await cookies();
  const session = await getSessionByToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login?returnTo=/dashboard");
  return <Dashboard />;
}
