import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    title: "Quarzion Admin｜内部运营系统",
    description:
      "管理客户项目、豆包、千问与 DeepSeek 官方 API 任务、异常和审计记录。",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Quarzion Admin",
      description: "GEO 官方 API 监测运营后台",
      images: [`${origin}/og-admin-light.png`],
    },
    twitter: {
      card: "summary_large_image",
      title: "Quarzion Admin",
      description: "GEO 官方 API 监测运营后台",
      images: [`${origin}/og-admin-light.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
