import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export async function sendToDiscordLog(data) {
  const message = formatDiscordMessage(data, false);
  await sendToWebhook(process.env.DISCORD_WEBHOOK_GLOBAL, message);
}

export async function sendToDiscordAlert(data) {
  const message = formatDiscordMessage(data, true);
  await sendToWebhook(process.env.DISCORD_WEBHOOK_ALERTS, message);
}

function formatDiscordMessage(data, isAlert) {
  const {
    title,
    raw_input,
    confidence,
    confidence_note,
    type,
    tags,
    source,
    timestamp
  } = data;

  const confidenceLine = confidence_note
    ? `**Confidence:** ${capitalize(confidence)}\n**Note:** ${confidence_note}`
    : `**Confidence:** ${capitalize(confidence)}`;

  return {
    content: isAlert
      ? "🔔 Posted in `#🚨-alerts`"
      : "🧠 Posted in `#🧠-logs-global`",
    embeds: [
      {
        title: title,
        color: isAlert ? 0xff3333 : 0x00cc99,
        fields: [
          { name: "Type", value: type || "—", inline: true },
          { name: "Tags", value: tags?.join(", ") || "—", inline: true },
          { name: "Confidence", value: capitalize(confidence), inline: true },
          ...(confidence_note
            ? [{ name: "Confidence Note", value: confidence_note }]
            : []),
          { name: "Source", value: source, inline: true },
          { name: "Timestamp", value: new Date(timestamp).toLocaleString() },
          { name: "Raw Input", value: raw_input },
        ],
      },
    ],
  };
}

async function sendToWebhook(url, message) {
  try {
    await axios.post(url, message);
    console.log(`📬 Sent ${message.content} to Discord`);
  } catch (err) {
    console.error("❌ Discord webhook failed:", err?.response?.data || err.message);
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
// TODO: implement discord.js
