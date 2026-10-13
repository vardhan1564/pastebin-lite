import { NextResponse } from "next/server";
import { getNow } from "@/lib/clock";
import { getBaseUrl, jsonError } from "@/lib/http";
import { createPaste } from "@/lib/pasteService";
import { createPasteSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// POST /api/pastes
// Body: { "content": "text", "ttl_seconds": 60, "max_views": 5 }  (last two optional)
export async function POST(req) {
  // 1. Read the body as JSON
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Request body must be valid JSON");
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return jsonError(400, "Request body must be a JSON object");
  }

  // 2. Validate the fields
  const parsed = createPasteSchema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({
      field: i.path.join(".") || "body",
      message: i.message,
    }));
    return jsonError(400, details[0]?.message ?? "Invalid request", details);
  }

  // 3. Save and return the link
  try {
    const paste = await createPaste(parsed.data, getNow(req.headers));
    return NextResponse.json(
      {
        id: paste.id,
        url: `${getBaseUrl(req)}/p/${paste.id}`,
        expires_at: paste.expires_at,
        max_views: paste.max_views,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("create paste failed", err);
    return jsonError(500, "Internal server error");
  }
}