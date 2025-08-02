import { distillInput } from './gpt.js';
import { sendToNotion } from './notion.js';
import { sendToDiscordLog, sendToDiscordAlert } from './discord.js';

export async function runAgent(rawInput) {
  console.log("🧠 Agent 20 is processing...");

  // Step 1: Distill input via GPT
  const distillation = await distillInput(rawInput);
  const {
    summary,
    confidence,
    confidence_note,
    type,
    tags
  } = distillation;

  const payload = {
    title: summary,
    raw_input: rawInput,
    distilled_summary: summary,
    confidence,
    confidence_note,
    type,
    tags,
    source: "CLI", // We’ll make this dynamic later
    timestamp: new Date().toISOString()
  };

  // Step 2: Save to Notion
  await sendToNotion(payload);

  // Step 3: Send to global log
  await sendToDiscordLog(payload);

  // Step 4: If confidence is low/medium, send alert
  if (confidence === "medium" || confidence === "low") {
    await sendToDiscordAlert(payload);
  }

  console.log("✅ Agent 20 update complete.");
}
// TODO: implement core.js
