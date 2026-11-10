import { createClaudeAnalyzer } from "./analyze.js";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 8787);
const effort = (process.env.CLAUDE_EFFORT ?? "medium") as "low" | "medium" | "high";

const app = createApp({
  analyzer: createClaudeAnalyzer({
    model: process.env.CLAUDE_MODEL ?? "claude-opus-5-5",
    effort,
  }),
  appToken: process.env.APP_TOKEN || undefined,
  rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 20),
});

if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
  console.warn("Warning: ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.");
}

app.listen(port, "0.0.0.0", () => {
  console.log(`Plately API listening on http://0.0.0.0:${port}`);
});
