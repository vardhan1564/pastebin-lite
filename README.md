# Pastebin Lite

A small Pastebin-like web app: paste text, get a shareable link, and view the content through that link.
A paste can optionally expire after a **time limit**, a **number of views**, or both (whichever comes first).

**Live demo:** https://pastebin-lite-theta-nine.vercel.app

**Stack:** Next.js (App Router, JavaScript) · React · Neon Postgres · `pg` · Zod · nanoid · Vercel

---

## Features

- Create a paste and get a short, unguessable share link (`/p/:id`)
- Optional expiry by time (`ttl_seconds`) and/or by view count (`max_views`)
- JSON API for programmatic use, plus a simple web UI
- Expired, used-up and unknown pastes all return a clean `404`
- Paste content is HTML-escaped, so pasted scripts never execute
- Correct view counting even when many requests arrive at the same moment

---

## API

| Method & path | Request body | Success | Errors |
|---|---|---|---|
| `GET /api/healthz` | – | `200 {"ok": true}` (also checks the database) | `503 {"ok": false}` |
| `POST /api/pastes` | `{"content": "...", "ttl_seconds"?: 60, "max_views"?: 5}` | `201 {"id", "url", "expires_at", "max_views"}` | `400 {"error", "details"}` |
| `GET /api/pastes/:id` | – | `200 {"content", "remaining_views", "expires_at"}` | `404 {"error"}` |
| `GET /p/:id` | – | HTML page showing the paste | HTML `404` page |

**Rules**
- `content`: required, non-empty string (whitespace-only is rejected), max 1,000,000 characters.
- `ttl_seconds`, `max_views`: optional integers ≥ 1. Missing or `null` means no limit.
  Strings like `"60"`, decimals, zero and negative numbers return `400`.
- `remaining_views` and `expires_at` are `null` when that limit is not set. `expires_at` is ISO 8601 (UTC).
- Every successful read counts as one view, from both the API and the HTML page.

### Example

```bash
curl -X POST https://pastebin-lite-theta-nine.vercel.app/api/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"hello world","ttl_seconds":3600,"max_views":3}'
# {"id":"HINToQLZzJ","url":"https://pastebin-lite-theta-nine.vercel.app/p/HINToQLZzJ","expires_at":"...","max_views":3}

curl https://pastebin-lite-theta-nine.vercel.app/api/pastes/HINToQLZzJ
# {"content":"hello world","remaining_views":2,"expires_at":"..."}
```

### Deterministic time for testing

When the server runs with `TEST_MODE=1`, a request header `x-test-now-ms: <milliseconds since epoch>`
is used as the current time for all expiry logic. This lets automated tests check time-based expiry
without waiting. Without `TEST_MODE=1`, the header is ignored.

---

## Run locally

**Requirements:** Node.js 18.18+ and a Postgres database (a free [Neon](https://neon.tech) database works).

```bash
git clone https://github.com/VARDHAN1564/pastebin-lite.git
cd pastebin-lite
npm install
```

Create a `.env.local` file in the project root:

```
DATABASE_URL=postgresql://user:password@host/neondb?sslmode=require
TEST_MODE=1
```

Start the app:

```bash
npm run dev
```

Open http://localhost:3000. The `pastes` table is created automatically on the first request
(the same SQL is in `db/schema.sql`).

## Deploy (Vercel + Neon)

1. Create a Neon project and copy the **pooled** connection string.
2. Import this repository into Vercel.
3. Add environment variables: `DATABASE_URL` (the Neon string) and `TEST_MODE=1`.
4. Deploy, then check `https://pastebin-lite-theta-nine.vercel.app/api/healthz` returns `{"ok":true}`.

---

## Project structure

```
app/
  page.js                    Home page: create-paste form (client component)
  layout.js                  Shared layout and header
  globals.css                Styles (light and dark mode)
  not-found.js               "Paste not available" 404 page
  p/[id]/page.js             View a paste as HTML (server component, counts a view)
  api/healthz/route.js       GET  health check
  api/pastes/route.js        POST create a paste
  api/pastes/[id]/route.js   GET  fetch a paste (counts a view)
lib/
  pasteService.js            Business logic: create, fetch + count view
  db.js                      Postgres connection pool and auto-created schema
  validation.js              Input validation rules (Zod)
  clock.js                   Current time, with TEST_MODE override
  http.js                    JSON error helper, public base URL
db/
  schema.sql                 Table definition
```

---

## Design decisions

### 1. Checking limits and counting a view in one atomic SQL statement
The core of the app is in `lib/pasteService.js`:

```sql
UPDATE pastes
   SET view_count = view_count + 1
 WHERE id = $1
   AND (expires_at IS NULL OR expires_at > $2)
   AND (max_views IS NULL OR view_count < max_views)
RETURNING content, expires_at, max_views, view_count;
```

A simpler approach (SELECT the paste, check the limits in JavaScript, then UPDATE) has a race
condition: two requests arriving at the same moment could both see "1 view left" and both succeed.
With a single `UPDATE ... WHERE`, Postgres locks the row and re-checks the conditions, so a paste with
`max_views = N` is served exactly N times, even under concurrent traffic. If no row is returned,
the paste is missing, expired or used up, and the API responds with `404`.

### 2. Lazy expiry instead of a cleanup job
Expiry is checked on every read, so an expired paste can never be served. No background job is
needed for correctness. A scheduled `DELETE FROM pastes WHERE expires_at < now()` could be added
later purely to free up storage.

### 3. Injectable clock
Business logic never calls `Date.now()` directly; it gets the time from `lib/clock.js`. This single
place is what makes `TEST_MODE` and the `x-test-now-ms` header work, and keeps expiry testable.

### 4. One service function, two entry points
The JSON API (`/api/pastes/:id`) and the HTML page (`/p/:id`) both call the same
`getAndConsumePaste()` function, so their rules can never drift apart. Both are marked
`force-dynamic` and send `Cache-Control: no-store`, so a cached response can never skip view counting.

### 5. Same 404 for missing, expired and used-up pastes
Callers cannot tell whether an id ever existed, which avoids leaking information.

### 6. Safe rendering
Paste content is rendered as text inside `<pre>`, which React HTML-escapes automatically. A paste
containing `<script>` is displayed as text and never runs. Paste pages are also marked `noindex`
so shared pastes are not picked up by search engines.

### 7. Short, unguessable ids
Ids are 10 random characters from a 62-character alphabet (about 8×10¹⁷ combinations), generated
with nanoid. Unlike sequential numbers, they can't be guessed to find other people's pastes.
Inserts use `ON CONFLICT DO NOTHING` with a retry, so a collision can never overwrite an existing paste.

### 8. Database storage, not memory
Serverless functions on Vercel don't share memory and can be restarted at any time, so all data
is stored in Postgres. The connection pool is reused across requests within an instance, and Neon's
pooled endpoint prevents running out of database connections.

### 9. Strict input validation
Zod rejects wrong types instead of silently converting them (`"60"` is not accepted as a number).
Malformed JSON and non-object bodies return a JSON `400`, never a `500`.

---

## Possible improvements

- Syntax highlighting for code pastes
- Rate limiting per IP address to prevent abuse
- Password-protected pastes
- Scheduled cleanup of expired rows
- Automated test suite in CI