import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { AnalysisError, normalizeAnalysis, type Analysis } from "./analyze.js";
import { createApp } from "./app.js";

const sample: Analysis = {
  is_food: true,
  name: "Eggs and toast",
  items: [
    { name: "Fried egg", quantity: "2 large", calories: 179.6, protein_g: 12.55, carbs_g: 0.8, fat_g: 13.9 },
    { name: "Toast", quantity: "1 slice", calories: 80, protein_g: 3, carbs_g: 15, fat_g: 1 },
  ],
  calories: 999,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0.84,
  sugar_g: 1.2,
  sodium_mg: 300.4,
  health_score: 14,
  confidence: "high",
  notes: "",
};

test("normalizeAnalysis recomputes totals and clamps the health score", () => {
  const n = normalizeAnalysis(sample);
  assert.equal(n.calories, 260);
  assert.equal(n.protein_g, 15.6);
  assert.equal(n.carbs_g, 15.8);
  assert.equal(n.fat_g, 14.9);
  assert.equal(n.health_score, 10);
  assert.equal(n.sodium_mg, 300);
});

async function withServer(app: ReturnType<typeof createApp>, fn: (base: string) => Promise<void>) {
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const { port } = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
}

test("POST /analyze returns the analysis", async () => {
  let received: unknown;
  const app = createApp({
    analyzer: async (input) => {
      received = input;
      return normalizeAnalysis(sample);
    },
  });
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "2 eggs and toast" }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { analysis: Analysis };
    assert.equal(body.analysis.calories, 260);
    assert.deepEqual(received, { description: "2 eggs and toast" });
  });
});

test("POST /analyze enforces the app token when set", async () => {
  const app = createApp({ analyzer: async () => sample, appToken: "secret" });
  await withServer(app, async (base) => {
    const bad = await fetch(`${base}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "apple" }),
    });
    assert.equal(bad.status, 401);
    const ok = await fetch(`${base}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-App-Token": "secret" },
      body: JSON.stringify({ description: "apple" }),
    });
    assert.equal(ok.status, 200);
  });
});

test("POST /analyze maps AnalysisError to its status and message", async () => {
  const app = createApp({
    analyzer: async () => {
      throw new AnalysisError("No food detected. Try a clearer photo of your meal.");
    },
  });
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "a rock" }),
    });
    assert.equal(res.status, 422);
    assert.match(((await res.json()) as { error: string }).error, /No food/);
  });
});

test("POST /analyze rejects malformed bodies", async () => {
  const app = createApp({ analyzer: async () => sample });
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaType: "image/tiff" }),
    });
    assert.equal(res.status, 400);
  });
});
