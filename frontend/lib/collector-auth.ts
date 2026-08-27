import { env } from "@/db/runtime";
import type { NextRequest } from "next/server";

function sameSecret(left: string, right: string) {
  if (!left || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export function collectorAuthorized(request: NextRequest) {
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const configured = String(env.GEO_PROOF_INGEST_KEYS || env.GEO_PROOF_INGEST_KEY || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.some((secret) => sameSecret(received, secret));
}
