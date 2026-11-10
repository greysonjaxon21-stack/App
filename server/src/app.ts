import Anthropic from "@anthropic-ai/sdk";
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { AnalysisError, AnalysisSchema, type Analyzer } from "./analyze.js";

const RequestSchema = z.object({
  imageBase64: z.string().max(8_000_000).optional(),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).optional(),
  description: z.string().max(2000).optional(),
  correction: z.string().max(2000).optional(),
  previous: AnalysisSchema.optional(),
});

/** Simple fixed-window rate limiter keyed by client IP. */
function rateLimit(maxPerMinute: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + 60_000 });
      return next();
    }
    if (entry.count >= maxPerMinute) {
      return res.status(429).json({ error: "Too many requests. Wait a moment and try again." });
    }
    entry.count += 1;
    next();
  };
}

export function createApp(opts: { analyzer: Analyzer; appToken?: string; rateLimitPerMinute?: number }) {
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json({ limit: "12mb" }));

  // Allow the web build of the app (and Expo dev tools) to call the API.
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-App-Token");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/analyze", rateLimit(opts.rateLimitPerMinute ?? 20));
  app.post("/analyze", async (req, res) => {
    if (opts.appToken && req.get("x-app-token") !== opts.appToken) {
      return res.status(401).json({ error: "Invalid app token." });
    }
    const parsed = RequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body." });
    }
    try {
      const analysis = await opts.analyzer(parsed.data);
      res.json({ analysis });
    } catch (err) {
      if (err instanceof AnalysisError) {
        return res.status(err.status).json({ error: err.message });
      }
      if (err instanceof Anthropic.AuthenticationError) {
        console.error("Anthropic authentication failed - check ANTHROPIC_API_KEY");
        return res.status(500).json({ error: "Server is not configured correctly." });
      }
      if (err instanceof Anthropic.RateLimitError) {
        return res.status(503).json({ error: "The AI service is busy. Try again in a moment." });
      }
      if (err instanceof Anthropic.APIError) {
        console.error(`Anthropic API error ${err.status}:`, err.message);
        return res.status(502).json({ error: "The AI service had a problem. Please try again." });
      }
      console.error(err);
      res.status(500).json({ error: "Something went wrong." });
    }
  });

  return app;
}
