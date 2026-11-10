import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const FoodItemSchema = z.object({
  name: z.string().describe("Short name of the item, e.g. 'Grilled chicken breast'"),
  quantity: z.string().describe("Estimated amount, e.g. '150 g' or '1 cup'"),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
});

export const AnalysisSchema = z.object({
  is_food: z.boolean().describe("False if the input does not show or describe food or drink"),
  name: z.string().describe("A short, friendly title for the whole meal"),
  items: z.array(FoodItemSchema),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  fiber_g: z.number(),
  sugar_g: z.number(),
  sodium_mg: z.number(),
  health_score: z.number().describe("Integer 1-10. 10 = very nutritious whole foods, 1 = mostly empty calories"),
  confidence: z.enum(["low", "medium", "high"]),
  notes: z.string().describe("One or two sentences on assumptions made (portion size, cooking oil, etc.)"),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

export type AnalyzeInput = {
  /** Base64 image data without the data: prefix. */
  imageBase64?: string;
  mediaType?: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  /** Free text description, e.g. "2 eggs and toast with butter". */
  description?: string;
  /** User correction to apply to a previous analysis ("it was 2 slices, not 1"). */
  correction?: string;
  previous?: Analysis;
};

export type Analyzer = (input: AnalyzeInput) => Promise<Analysis>;

export class AnalysisError extends Error {
  constructor(
    message: string,
    public status = 422,
  ) {
    super(message);
  }
}

const SYSTEM_PROMPT = `You are a registered dietitian and nutrition analyst inside a calorie tracking app.
Given a photo of a meal and/or a text description, identify every distinct food and drink, estimate
the portion of each from visual cues (plate size, utensils, packaging, typical servings), and estimate
calories and macronutrients using standard nutrition databases (USDA-style values).

Guidelines:
- Account for hidden calories: cooking oils, butter, dressings, sauces, sugar in drinks.
- If a nutrition label or packaging is visible, use it.
- Use realistic single-serving portions when the amount is unclear, and say what you assumed in notes.
- Totals must equal the sum of the items. Round calories to whole numbers and grams to one decimal.
- health_score is an integer from 1 to 10.
- If the input is not food or drink, set is_food to false, return an empty items list and zeros.`;

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/** Make totals consistent with the item breakdown and clamp out-of-range values. */
export function normalizeAnalysis(a: Analysis): Analysis {
  const items = a.items.map((it) => ({
    ...it,
    calories: Math.max(0, Math.round(it.calories)),
    protein_g: Math.max(0, round1(it.protein_g)),
    carbs_g: Math.max(0, round1(it.carbs_g)),
    fat_g: Math.max(0, round1(it.fat_g)),
  }));
  const sum = (k: "calories" | "protein_g" | "carbs_g" | "fat_g") =>
    items.reduce((acc, it) => acc + it[k], 0);
  const hasItems = items.length > 0;
  return {
    ...a,
    items,
    calories: hasItems ? Math.round(sum("calories")) : Math.max(0, Math.round(a.calories)),
    protein_g: hasItems ? round1(sum("protein_g")) : Math.max(0, round1(a.protein_g)),
    carbs_g: hasItems ? round1(sum("carbs_g")) : Math.max(0, round1(a.carbs_g)),
    fat_g: hasItems ? round1(sum("fat_g")) : Math.max(0, round1(a.fat_g)),
    fiber_g: Math.max(0, round1(a.fiber_g)),
    sugar_g: Math.max(0, round1(a.sugar_g)),
    sodium_mg: Math.max(0, Math.round(a.sodium_mg)),
    health_score: Math.min(10, Math.max(1, Math.round(a.health_score))),
  };
}

export function createClaudeAnalyzer(opts: {
  client?: Anthropic;
  model?: string;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
} = {}): Analyzer {
  const client = opts.client ?? new Anthropic();
  const model = opts.model ?? "claude-opus-5-5";
  const effort = opts.effort ?? "medium";

  return async (input) => {
    if (!input.imageBase64 && !input.description?.trim()) {
      throw new AnalysisError("Provide a photo or a description of the food.", 400);
    }

    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    if (input.imageBase64) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: input.mediaType ?? "image/jpeg",
          data: input.imageBase64,
        },
      });
    }
    let text = input.imageBase64
      ? "Analyze this meal photo and estimate its nutrition."
      : "Estimate the nutrition of this meal.";
    if (input.description?.trim()) {
      text += `\n\nThe user describes it as: ${input.description.trim()}`;
    }
    if (input.previous) {
      text += `\n\nYour previous analysis was:\n${JSON.stringify(input.previous)}`;
    }
    if (input.correction?.trim()) {
      text += `\n\nThe user says this needs fixing: ${input.correction.trim()}\nUpdate the analysis accordingly.`;
    }
    content.push({ type: "text", text });

    const response = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      output_config: {
        effort,
        format: betaZodOutputFormat(AnalysisSchema),
      },
      messages: [{ role: "user", content }],
    });

    if (response.stop_reason === "refusal") {
      throw new AnalysisError("The image could not be analyzed. Try another photo.");
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      throw new AnalysisError("The analysis came back incomplete. Please try again.", 502);
    }

    const result = normalizeAnalysis(response.parsed_output);
    if (!result.is_food) {
      throw new AnalysisError("No food detected. Try a clearer photo of your meal.");
    }
    return result;
  };
}
