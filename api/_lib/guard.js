// Shared request guards for the AI routes: model choice, rate limiting, and input limits.

export const MODEL = process.env.AI_GATEWAY_MODEL || 'google/gemini-2.5-flash';

// Best-effort per-IP limit. Counts live in each function instance's memory, so this
// slows abuse rather than guaranteeing a hard cap; the AI Gateway budget is the real ceiling.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 30;
const hits = new Map();

export function rateLimit(request) {
  const ip =
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    return Response.json(
      { error: "You've sent a lot of requests in a short time. Please take a breather and try again in a few minutes." },
      { status: 429 }
    );
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return null;
}

export const badRequest = (message) => Response.json({ error: message }, { status: 400 });

export const clip = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// Maps gateway/provider failures to a status the client can act on, without leaking details
export function aiErrorResponse(err) {
  console.error('AI request failed:', err);
  const status = err?.statusCode === 429 ? 429 : 502;
  return Response.json({ error: 'The AI is unavailable right now.' }, { status });
}
