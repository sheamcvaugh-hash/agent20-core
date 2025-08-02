import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

export async function sendToNotion(data) {
  const {
    title,
    raw_input,
    distilled_summary,
    confidence,
    confidence_note,
    type,
    tags,
    source,
    timestamp
  } = data;

  try {
    await axios.post(
      `${NOTION_API_BASE}/pages`,
      {
        parent: {
          database_id: process.env.NOTION_DATABASE_ID,
        },
        properties: {
          Name: {
            title: [{ text: { content: title } }],
          },
          "Raw Input": {
            rich_text: [{ text: { content: raw_input } }],
          },
          Confidence: {
            select: { name: capitalize(confidence) },
          },
          "Confidence Notes": {
            rich_text: confidence_note
              ? [{ text: { content: confidence_note } }]
              : [],
          },
          Type: type ? { select: { name: type } } : undefined,
          Tags: {
            multi_select: tags.map((tag) => ({ name: tag })),
          },
          Source: {
            select: { name: source },
          },
          Timestamp: {
            date: { start: timestamp },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NOTION_SECRET}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Saved to Notion");
  } catch (err) {
    console.error("❌ Notion API error:", err?.response?.data || err.message);
    throw err;
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
// TODO: implement notion.js
