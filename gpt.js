import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function distillInput(rawInput) {
  const systemPrompt = `
You are Agent 20, Shea's digital brain. Your job is to distill raw thoughts into structured knowledge.

Respond with a JSON object with the following fields:
- summary: A clinical, 1–2 sentence summary of the input
- confidence: "high", "medium", or "low", based on how certain the input sounds
- confidence_note: A short explanation if confidence is "medium" or "low", otherwise null
- type: One of: Routine, Belief, Insight, Workflow, Resource, Story, Decision, Goal
- tags: A list of 1–5 relevant keywords (e.g. "Diet", "Focus", "Sleep", "Travel")

Your tone should be neutral and analytical. Do not offer opinions or commentary.
`;

  const userPrompt = `Input: """${rawInput}"""`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", con
// TODO: implement gpt.js
