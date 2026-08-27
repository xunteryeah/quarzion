import { ensureDatabase } from "@/db/bootstrap";
import { processEmailOutbox } from "@/lib/email-outbox";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function authorized(request: NextRequest) {
  const expected = process.env.QUARZION_DELIVERY_KEY;
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !received) return false;
  const [left, right] = await Promise.all([digest(expected), digest(received)]);
  return left.every((byte, index) => byte === right[index]);
}

export async function POST(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: "not found" }, { status: 404 });
  await ensureDatabase();
  return NextResponse.json(await processEmailOutbox(25));
}
