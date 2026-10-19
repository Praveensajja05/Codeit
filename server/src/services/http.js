// fetch with a timeout, so one slow website can't hang a request forever.
export async function getJson(url, options = {}, timeoutMs = 20000) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`${new URL(url).host} returned HTTP ${res.status}`);
  return res.json();
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
