"use client";

import { useState } from "react";

export default function HomePage() {
  const [content, setContent] = useState("");
  const [ttl, setTtl] = useState("");
  const [maxViews, setMaxViews] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e) {
    e.preventDefault(); // stop the page from reloading
    setError(null);
    setCreated(null);
    setCopied(false);

    // Only send the optional fields if the user filled them in
    const body = { content };
    if (ttl.trim()) body.ttl_seconds = Number(ttl);
    if (maxViews.trim()) body.max_views = Number(maxViews);

    setBusy(true);
    try {
      const res = await fetch("/api/pastes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setCreated(data);
      setContent("");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <h1>Share text with a link</h1>
      <p className="lede">
        Paste anything below. Optionally make it disappear after a time or a number of views.
      </p>

      <form className="card" onSubmit={onSubmit}>
        <label htmlFor="content">Content</label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your text here…"
          required
        />

        <div className="row">
          <div>
            <label htmlFor="ttl">
              Expire after <span className="hint">(seconds, optional)</span>
            </label>
            <input
              id="ttl"
              type="number"
              min={1}
              step={1}
              value={ttl}
              onChange={(e) => setTtl(e.target.value)}
              placeholder="e.g. 3600"
            />
          </div>
          <div>
            <label htmlFor="views">
              Max views <span className="hint">(optional)</span>
            </label>
            <input
              id="views"
              type="number"
              min={1}
              step={1}
              value={maxViews}
              onChange={(e) => setMaxViews(e.target.value)}
              placeholder="e.g. 5"
            />
          </div>
        </div>

        <div className="actions">
          <button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create paste"}
          </button>
        </div>

        {error && <p className="error" role="alert">{error}</p>}
      </form>

      {created && (
        <div className="result" role="status">
          <strong>Your paste is ready.</strong>
          <div className="share">
            <code>{created.url}</code>
            <button type="button" className="secondary" onClick={copyLink}>
              {copied ? "Copied" : "Copy link"}
            </button>
            <a href={created.url}>
              <button type="button">Open</button>
            </a>
          </div>
          <div className="meta" style={{ marginTop: 10, marginBottom: 0 }}>
            <span>
              Expires: {created.expires_at ? new Date(created.expires_at).toLocaleString() : "never"}
            </span>
            <span>Views allowed: {created.max_views ?? "unlimited"}</span>
          </div>
        </div>
      )}
    </>
  );
}