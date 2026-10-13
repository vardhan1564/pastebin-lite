import { NextResponse } from "next/server";

// Every API error has the same shape: { error: "message" }
export function jsonError(status, message, details) {
  return NextResponse.json(details ? { error: message, details } : { error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

// Public address of the site, used to build the share link.
export function getBaseUrl(req) {
  const configured = process.env.BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}`;
}