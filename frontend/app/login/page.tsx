import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "登录｜Quarzion 客户后台", robots: { index: false, follow: false } };

export default function LoginPage() { return <LoginForm />; }
