import { generateText, Output } from 'ai';
import { MODEL, rateLimit, badRequest, clip, readJson, aiErrorResponse } from './_lib/guard.js';
import { DECONSTRUCT_INSTRUCTIONS, buildDeconstructPrompt, deconstructionSchema } from './_lib/prompts.js';

export async function POST(request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const body = await readJson(request);
  const thought = clip(body?.thought, 2000).trim();
  if (!thought) return badRequest('Expected { thought }.');
  const intensity = Math.max(1, Math.min(10, Math.round(Number(body.intensity) || 5)));
  const knownRules = (Array.isArray(body.knownRules) ? body.knownRules : [])
    .slice(0, 20)
    .map(r => ({ id: clip(r?.id, 80), statement: clip(r?.statement, 300) }))
    .filter(r => r.id && r.statement);

  try {
    const { output } = await generateText({
      model: MODEL,
      instructions: DECONSTRUCT_INSTRUCTIONS,
      prompt: buildDeconstructPrompt({ thought, intensity, knownRules }),
      output: Output.object({ schema: deconstructionSchema }),
      maxOutputTokens: 2000,
      abortSignal: AbortSignal.timeout(45000)
    });
    // Only accept a match against an id the client actually sent
    const matchedRuleId = knownRules.some(r => r.id === output.matchedRuleId) ? output.matchedRuleId : '';
    return Response.json({ ...output, matchedRuleId });
  } catch (err) {
    return aiErrorResponse(err);
  }
}
