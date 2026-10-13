import { NextResponse } from "next/server";
import { pingDatabase } from "@/lib/pasteService";

// Always run fresh, never cache this response
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pingDatabase();
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("healthz: database unreachable", err);
    return NextResponse.json(
      { ok: false, error: "database unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}