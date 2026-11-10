import type { Draft } from "../components/NutritionEditor";
import type { Analysis, FoodEntry } from "./types.ts";

export function draftFromAnalysis(a: Analysis, servings = 1): Draft {
  return {
    name: a.name,
    servings,
    calories: a.calories,
    protein: a.protein_g,
    carbs: a.carbs_g,
    fat: a.fat_g,
    fiber: a.fiber_g,
    sugar: a.sugar_g,
    sodium: a.sodium_mg,
    healthScore: a.health_score,
    items: a.items,
    notes: a.notes,
  };
}

export function draftFromEntry(e: FoodEntry): Draft {
  return {
    name: e.name,
    servings: e.servings,
    calories: e.calories,
    protein: e.protein,
    carbs: e.carbs,
    fat: e.fat,
    fiber: e.fiber,
    sugar: e.sugar,
    sodium: e.sodium,
    healthScore: e.healthScore,
    items: e.items,
    notes: e.notes,
  };
}

/** Rebuild an Analysis-shaped object so the AI can apply a correction to it. */
export function analysisFromDraft(d: Draft): Analysis {
  return {
    is_food: true,
    name: d.name,
    items: d.items ?? [],
    calories: d.calories,
    protein_g: d.protein,
    carbs_g: d.carbs,
    fat_g: d.fat,
    fiber_g: d.fiber ?? 0,
    sugar_g: d.sugar ?? 0,
    sodium_mg: d.sodium ?? 0,
    health_score: d.healthScore ?? 5,
    confidence: "medium",
    notes: d.notes ?? "",
  };
}
