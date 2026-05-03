import 'server-only';
import type { AnalyzeResult } from './types';

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM = `You are a friendly nutrition assistant for kids' meals.
Look at the photo and identify the food. Estimate the total calories AND total protein (in grams) for the visible portion.
Be conservative and reasonable for typical kid-sized portions.
Respond ONLY with strict JSON, no prose, in this exact shape:
{"food":"short name","calories":number,"protein_g":number,"confidence":"low|medium|high","notes":"short note (size/quantity)"}`;

interface AnthropicContentBlock {
  type: string;
  text?: string;
}
interface AnthropicResponse {
  content?: AnthropicContentBlock[];
}

export async function analyzeFoodPhoto(opts: {
  imageBase64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
}): Promise<AnalyzeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set on the server.');
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const body = {
    model,
    max_tokens: 300,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: opts.mediaType, data: opts.imageBase64 } },
          { type: 'text', text: 'Identify the food and estimate the total calories. Reply with the JSON only.' },
        ],
      },
    ],
  };

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Anthropic ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await resp.json()) as AnthropicResponse;
  const text = (data.content || [])
    .map((c) => (c.type === 'text' ? c.text || '' : ''))
    .join('')
    .trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Model did not return JSON');
  const obj = JSON.parse(match[0]) as Partial<AnalyzeResult>;
  return {
    food: String(obj.food ?? '').slice(0, 80) || 'Food',
    calories: Math.max(0, Math.round(Number(obj.calories) || 0)),
    protein_g: Math.max(0, Math.round(Number(obj.protein_g) || 0)),
    confidence:
      obj.confidence === 'low' || obj.confidence === 'high' ? obj.confidence : 'medium',
    notes: String(obj.notes ?? '').slice(0, 200),
  };
}
