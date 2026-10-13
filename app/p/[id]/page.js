import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getNow } from "@/lib/clock";
import { getAndConsumePaste } from "@/lib/pasteService";
import { isValidId } from "@/lib/validation";

// Never cache this page: every visit must hit the database and count a view
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Paste · Pastebin Lite",
  robots: { index: false, follow: false }, // don't let Google index shared pastes
};

export default async function PastePage({ params }) {
  const { id } = await params;
  if (!isValidId(id)) notFound();

  const paste = await getAndConsumePaste(id, getNow(await headers()));
  if (!paste) notFound(); // shows app/not-found.js with status 404

  return (
    <>
      <div className="meta">
        <span>Paste <code>{id}</code></span>
        <span>
          Expires:{" "}
          {paste.expires_at
            ? paste.expires_at.replace("T", " ").replace(/\.\d+Z$/, " UTC")
            : "never"}
        </span>
        <span>Views left: {paste.remaining_views ?? "unlimited"}</span>
      </div>
      <pre className="paste">{paste.content}</pre>
    </>
  );
}