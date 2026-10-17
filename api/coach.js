import { generateText } from 'ai';
import { MODEL, rateLimit, badRequest, clip, readJson, aiErrorResponse } from './_lib/guard.js';
import { buildCoachInstructions } from './_lib/prompts.js';

const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 4000;

export async function POST(request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const body = await readJson(request);
  if (!body || !Array.isArray(body.messages)) return badRequest('Expected { messages }.');

  const messages = body.messages
    .slice(-MAX_MESSAGES)
    .filter(m => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: clip(m.content, MAX_MESSAGE_CHARS) }));
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return badRequest('The last message must be from the user.');
  }

  const patterns = (Array.isArray(body.patterns) ? body.patterns : [])
    .slice(0, 5)
    .map(p => ({ statement: clip(p?.statement, 300), count: Math.max(0, Math.min(999, Number(p?.count) || 0)) }))
    .filter(p => p.statement);

  try {
    const { text } = await generateText({
      model: MODEL,
      instructions: buildCoachInstructions(patterns),
      messages,
      maxOutputTokens: 800,
      abortSignal: AbortSignal.timeout(45000)
    });
    if (!text.trim()) return aiErrorResponse(new Error('Empty response'));
    return Response.json({ text });
  } catch (err) {
    return aiErrorResponse(err);
  }
}
