import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "WindCall｜AI 搜索可见度监测与 GEO 效果证明平台";
const description = "持续监测豆包、千问、DeepSeek 官方 API 中的品牌提及、排名、情绪与引用来源，形成可追溯、可审计的 GEO 优化证据链。";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const canonical = `${protocol}://${host}`;
  const socialImage = `${canonical}/og-scrunch-light.png`;
  return {
    metadataBase: new URL(canonical),
    title,
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: { title, description, type: "website", url: canonical, siteName: "WindCall", locale: "zh_CN", images: [{ url: socialImage, width: 1200, height: 630, alt: "WindCall — AI 搜索可见度监测与效果证明平台" }] },
    twitter: { card: "summary_large_image", title, description, images: [socialImage] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
