import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db/bootstrap";
import { env } from "@/db/runtime";

export async function GET() {
  try {
    await ensureDatabase();
    const migration = await env.DB.prepare("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1").first<{ version: string }>();
    return NextResponse.json({ status: "ok", database: "ready", migration: migration?.version ?? null });
  } catch (error) {
    console.error("health_check_failed", error);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
