import { NextResponse } from "next/server";
import { getNow } from "@/lib/clock";
import { jsonError } from "@/lib/http";
import { getAndConsumePaste } from "@/lib/pasteService";
import { isValidId } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/pastes/:id   (each successful call counts as one view)
export async function GET(req, { params }) {
  const { id } = await params; // in Next.js 15+, params must be awaited

  if (!isValidId(id)) return jsonError(404, "Paste not found");

  try {
    const paste = await getAndConsumePaste(id, getNow(req.headers));
    if (!paste) return jsonError(404, "Paste not found");
    return NextResponse.json(paste, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("fetch paste failed", err);
    return jsonError(500, "Internal server error");
  }
}