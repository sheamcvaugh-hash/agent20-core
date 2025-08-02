// Entry point for Agent 20 core logic
import { runAgent } from "./src/core.js";

const input = process.argv[2];
if (!input) {
  console.error("❌ No input provided. Usage: node agent20.js "Your input here"");
  process.exit(1);
}

runAgent(input);