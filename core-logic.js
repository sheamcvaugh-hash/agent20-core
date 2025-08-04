import 'dotenv/config';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VALID_TYPES = [
  'Preference', 'Goal', 'Workflow', 'Resource',
  'Personal History', 'Belief', 'Fear', 'Personal Info', 'Insight'
];

// ——— SUMMARIZATION ——— //
export async function summarizeText(text) {
  const prompt = `
You're a thought distillation engine for a digital brain. Your job is to extract a clear and meaningful summary that captures the emotional truth and intellectual core of the input.

Guidelines:
- Write in the user's natural voice, using third person.
- Assume the speaker is male (he/him).
- Maintain ambiguity when the user is vague or non-absolute.
- Prioritize clarity and emotional fidelity over cleverness or flair.
- Avoid awkward constructions or quotation marks.
- Do not combine unrelated ideas into one summary.

Input:
${text}

Distilled Summary:
`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    });
    return res.choices?.[0]?.message?.content?.trim() || text.trim();
  } catch (err) {
    console.error('❌ GPT summarization failed, using fallback:', err.message);
    return text.trim();
  }
}

// ——— TAG + TYPE EXTRACTION ——— //
export async function extractTagsAndType(text) {
  const prompt = `
You're a tagging and classification engine for a digital brain.

Your job is to return:
1. A single Type from this list:
${VALID_TYPES.map(t => `- ${t}`).join('\n')}
2. 3–5 high-quality Tags (one or two words each, comma-separated)

Guidelines:
- Tags should reflect the core ideas. Avoid vague or generic terms.
- If fewer than 2 strong tags apply, return ["General"].
- No hashtags or quotation marks.

Text:
${text}

Format:
Type: [One of the list above]
Tags: [Comma-separated list of tags]
`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    const content = res.choices?.[0]?.message?.content || '';
    const typeMatch = content.match(/Type:\s*(.*)/i);
    const tagsMatch = content.match(/Tags:\s*(.*)/i);

    const typeRaw = typeMatch?.[1]?.trim() || '';
    const tagsRaw = tagsMatch?.[1]?.trim() || '';

    const type = VALID_TYPES.includes(typeRaw) ? typeRaw : fallbackType(text);
    const tags = tagsRaw
      .split(/[,|\n]/)
      .map(t => t.replace(/^["']+|["']+$/g, '').trim())
      .filter(t => t.length > 0 && t.toLowerCase() !== 'general');

    return {
      type,
      tags: tags.length >= 2 ? tags : ['General'],
    };
  } catch (err) {
    console.error('❌ GPT tag/type extraction failed:', err.message);
    return {
      type: fallbackType(text),
      tags: ['General'],
    };
  }
}

// ——— FALLBACK TYPE DETECTION ——— //
function fallbackType(text) {
  const lower = text.toLowerCase();

  if (/(is better than|beats|wins over|more enjoyable than)/.test(lower)) return 'Preference';
  if (/fur (child|baby)|my (cat|dog|pet).*?(child|love|bond)/.test(lower)) return 'Personal Info';
  if (/i (prefer|like|enjoy|hate|can't stand)/.test(lower)) return 'Preference';
  if (/i (want to|hope to|plan to|my goal|my dream)/.test(lower)) return 'Goal';
  if (/habit|routine|workflow|system/.test(lower)) return 'Workflow';
  if (/i (use|carry|film with|subscribe to)/.test(lower)) return 'Resource';
  if (/when i was|growing up|i remember|in childhood/.test(lower)) return 'Personal History';
  if (/i (believe|think|feel|support|oppose)/.test(lower)) return 'Belief';
  if (/i (fear|am afraid|terrified|scares me)/.test(lower)) return 'Fear';
  if (/my (cat|dog|partner|house)|i (live with|have a cat|am single)/.test(lower)) return 'Personal Info';
  if (/i (learned|realized|noticed|this taught me)/.test(lower)) return 'Insight';

  return 'Insight';
}

// ——— CHEAP SPLIT HEURISTIC ——— //
function cheapSplitHeuristic(text) {
  const sentences = text.split(/[.!?]/).map(s => s.trim()).filter(Boolean);
  const conjunctions = (text.match(/\b(and|but|or|so|because|while|although|though|even though)\b/gi) || []);
  const thematicClues = [
    /research.*(brisket|favorite)/i,
    /dedicated.*(passion|hours)/i,
    /likes?.*also/i,
    /tool.*routine/i,
    /enjoy.*separately/i,
    /habit.*setup/i,
    /dream.*plan/i,
    /multiple.*reasons/i,
    /my (goal|plan).*also/i,
    /two.*(ideas|thoughts|preferences)/i,
  ];

  const clauseCount = text.split(/\b(and|but|so|because)\b/i).length;
  const longIdeas = sentences.filter(s => s.length > 120).length;

  return longIdeas >= 2 || conjunctions.length >= 5 || clauseCount > 8 || thematicClues.some(r => r.test(text));
}

// ——— SPLIT DETECTION (GPT-3.5) ——— //
export async function isPossiblySplittable(text) {
  if (!text || text.length < 100) return false;
  if (!cheapSplitHeuristic(text)) return false;

  const prompt = `
You are a split detection engine for a digital brain.

Your task: decide if this entry contains 2+ **distinct thoughts** that should be logged as separate entries.

Return exactly one word: "Yes" or "No".

Text:
${text}

Answer:
`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    });

    const reply = res.choices?.[0]?.message?.content?.trim().toLowerCase();
    const isYes = /^yes[\s\.\!]*$/i.test(reply);

    if (isYes) console.log('✅ GPT-3.5 split triggered');
    else console.log('🟡 GPT-3.5 said No or ambiguous:', reply);

    return isYes;
  } catch (err) {
    console.error('❌ GPT split detection failed:', err.message);
    return false;
  }
}

// ——— SPLITTING (GPT-4o) ——— //
export async function splitText(text) {
  const prompt = `
You're a splitting engine for a digital brain.

Your task is to split the following input into clean, standalone entries — but only when the ideas are **meaningfully independent**.

✅ Do split:
- Distinct thoughts, reflections, or shifts in focus
- Unrelated facts, goals, or insights

❌ Do NOT split:
- Related details (e.g., issue → solution, plan → tool)
- Cause-effect chains
- Contrasting pairs ("but", "however")
- Multiple aspects of a single process

Rules:
- Output each entry on its own line, no bullets or numbers
- Minimum 2–3 sentences per entry unless it's very distinct
- Do not create more than 4 entries unless clearly necessary

Text:
${text}

Entries:
`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    const chunks = res.choices?.[0]?.message?.content
      .split(/\n+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (chunks.length > 1) console.log(`✅ Split into ${chunks.length} chunks`);
    return chunks.length ? chunks : [text.trim()];
  } catch (err) {
    console.error('❌ GPT split failed, using fallback:', err.message);
    return fallbackSplit(text);
  }
}

// ——— FALLBACK SPLITTING ——— //
function fallbackSplit(text) {
  const sentences = text.split(/(?<=[\.\?!])\s+/).map(s => s.trim()).filter(Boolean);
  const glueWords = ['but', 'because', 'so', 'although', 'while', 'even though', 'since', 'though'];
  const chunks = [];

  let buffer = '';
  for (const sentence of sentences) {
    const test = `${buffer} ${sentence}`.trim();
    const tooLong = test.length > 220 && !glueWords.some(w => test.includes(` ${w} `));
    if (tooLong) {
      if (buffer) chunks.push(buffer.trim());
      buffer = sentence;
    } else {
      buffer = test;
    }
  }

  if (buffer) chunks.push(buffer.trim());
  return chunks;
}
