import type { Analysis, FoodItem } from "./types.ts";

export type AnalyzeRequest = {
  imageBase64?: string;
  mediaType?: "image/jpeg";
  description?: string;
  correction?: string;
  previous?: Analysis;
};

// ---------- Claude artifact runtime (web build published as a claude.ai artifact) ----------

type SampleFn = {
  json: (input: string, opts?: { images?: Blob[]; modelTier?: string; cache?: boolean }) => Promise<unknown>;
  limits: () => Promise<{ images?: unknown }>;
};
type ClaudeRuntime = { use: (name: string) => Promise<unknown> };

let samplePromise: Promise<SampleFn | null> | null = null;

/** When the app runs inside a claude.ai artifact, Claude is reachable directly from the page. */
export function hasArtifactRuntime(): boolean {
  return typeof window !== "undefined" && !!(window as unknown as { claude?: ClaudeRuntime }).claude?.use;
}

function getSample(): Promise<SampleFn | null> {
  if (!hasArtifactRuntime()) return Promise.resolve(null);
  samplePromise ??= (window as unknown as { claude: ClaudeRuntime }).claude
    .use("sample")
    .then((s) => (s as SampleFn | null) ?? null)
    .catch(() => null);
  return samplePromise;
}

const INSTRUCTIONS = `You are a registered dietitian inside a calorie tracking app.
Identify every distinct food and drink, estimate the portion of each from visual cues (plate size,
utensils, packaging, typical servings) and estimate calories and macros using standard (USDA-style)
nutrition values. Account for hidden calories such as cooking oil, butter, dressings, sauces and sugar
in drinks. If a nutrition label is visible, use it. If the amount is unclear, assume a realistic single
serving and say so in notes. health_score is an integer 1-10 (10 = very nutritious whole foods).
If the input is not food or drink, set is_food to false with an empty items list and zeros.

Reply with only one JSON object of exactly this shape:
{"is_food": true, "name": "Short meal title", "items": [{"name": "Grilled chicken", "quantity": "150 g", "calories": 248, "protein_g": 46, "carbs_g": 0, "fat_g": 5.4}], "fiber_g": 3, "sugar_g": 2, "sodium_mg": 400, "health_score": 8, "confidence": "high", "notes": "One sentence on assumptions."}`;

function buildPrompt(req: AnalyzeRequest): string {
  let text = INSTRUCTIONS + "\n\n";
  text += req.imageBase64 ? "The attached image is a photo of the user's meal. Analyze it." : "Estimate the nutrition of this meal.";
  if (req.description?.trim()) text += `\n\nThe user describes it as: ${req.description.trim()}`;
  if (req.previous) text += `\n\nYour previous analysis was:\n${JSON.stringify(req.previous)}`;
  if (req.correction?.trim()) text += `\n\nThe user says this needs fixing: ${req.correction.trim()}\nReturn the updated analysis.`;
  return text;
}

function base64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : 0;
};
const r1 = (x: number) => Math.round(x * 10) / 10;

/** Coerce a model reply into a consistent Analysis (totals = sum of items). */
export function normalizeAnalysis(raw: unknown): Analysis {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const items: FoodItem[] = (Array.isArray(o.items) ? o.items : []).map((it) => {
    const i = (it ?? {}) as Record<string, unknown>;
    return {
      name: String(i.name ?? "Item"),
      quantity: String(i.quantity ?? ""),
      calories: Math.round(n(i.calories)),
      protein_g: r1(n(i.protein_g)),
      carbs_g: r1(n(i.carbs_g)),
      fat_g: r1(n(i.fat_g)),
    };
  });
  const sum = (k: "calories" | "protein_g" | "carbs_g" | "fat_g") => items.reduce((a, it) => a + it[k], 0);
  const has = items.length > 0;
  const confidence = o.confidence === "low" || o.confidence === "high" ? o.confidence : "medium";
  return {
    is_food: o.is_food !== false,
    name: String(o.name ?? "Meal"),
    items,
    calories: has ? Math.round(sum("calories")) : Math.round(n(o.calories)),
    protein_g: has ? r1(sum("protein_g")) : r1(n(o.protein_g)),
    carbs_g: has ? r1(sum("carbs_g")) : r1(n(o.carbs_g)),
    fat_g: has ? r1(sum("fat_g")) : r1(n(o.fat_g)),
    fiber_g: r1(n(o.fiber_g)),
    sugar_g: r1(n(o.sugar_g)),
    sodium_mg: Math.round(n(o.sodium_mg)),
    health_score: Math.min(10, Math.max(1, Math.round(n(o.health_score) || 5))),
    confidence,
    notes: String(o.notes ?? ""),
  };
}

const SAMPLE_ERRORS: Record<string, string> = {
  not_granted: "Allow this page to use Claude to analyze meals (you can change this in the artifact's permissions).",
  sampling_disabled: "Claude isn't available for this account.",
  rate_limited: "Too many requests right now. Wait a moment and try again.",
  image_rejected: "That photo couldn't be read. Try a different one.",
  images_unavailable: "Photo analysis isn't available here. Try describing the meal instead.",
  refused: "This couldn't be analyzed. Try another photo or description.",
  invalid_json: "The analysis came back garbled. Please try again.",
  session_expired: "Please sign in to Claude again.",
};

async function analyzeWithArtifact(sample: SampleFn, req: AnalyzeRequest): Promise<Analysis> {
  let raw: unknown;
  try {
    raw = await sample.json(buildPrompt(req), {
      images: req.imageBase64 ? [base64ToBlob(req.imageBase64, "image/jpeg")] : undefined,
      modelTier: "default",
      cache: !req.correction,
    });
  } catch (e) {
    const code = (e as { code?: string }).code ?? "";
    throw new Error(SAMPLE_ERRORS[code] ?? "The analysis failed. Please try again.");
  }
  const a = normalizeAnalysis(raw);
  if (!a.is_food) throw new Error("No food detected. Try a clearer photo of your meal.");
  return a;
}

// ---------- Plately server ----------

export async function analyzeFood(apiUrl: string, appToken: string, body: AnalyzeRequest): Promise<Analysis> {
  const sample = await getSample();
  if (sample) return analyzeWithArtifact(sample, body);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  let res: Response;
  try {
    res = await fetch(`${apiUrl}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(appToken ? { "X-App-Token": appToken } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error("The analysis took too long. Please try again.");
    throw new Error(`Can't reach the Plately server at ${apiUrl}. Check the server address in Settings.`);
  } finally {
    clearTimeout(timer);
  }
  let json: { analysis?: Analysis; error?: string } = {};
  try {
    json = await res.json();
  } catch {
    // fall through to the generic error below
  }
  if (!res.ok || !json.analysis) {
    throw new Error(json.error ?? `Server error (${res.status}).`);
  }
  return json.analysis;
}

export async function checkServer(apiUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiUrl}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
