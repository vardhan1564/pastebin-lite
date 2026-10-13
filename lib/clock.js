// The single source of "now" for all expiry logic.
// If TEST_MODE=1 and the request has an "x-test-now-ms" header,
// that value (milliseconds since 1970) is used as the current time.
export function getNow(headers) {
  if (process.env.TEST_MODE === "1") {
    const raw = headers.get("x-test-now-ms");
    if (raw !== null && /^\d+$/.test(raw.trim())) {
      const ms = Number(raw.trim());
      if (Number.isSafeInteger(ms)) return new Date(ms);
    }
  }
  return new Date();
}