import type { Activity, FoodEntry, Goals, Profile, Units } from "./types.ts";

export const ACTIVITY_FACTORS: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

/** kcal in one kg of body fat. */
const KCAL_PER_KG = 7700;

/** Basal metabolic rate (Mifflin-St Jeor). */
export function bmr(p: Pick<Profile, "sex" | "age" | "heightCm" | "weightKg">): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === "male" ? base + 5 : base - 161;
}

/** Total daily energy expenditure. */
export function tdee(p: Profile): number {
  return bmr(p) * ACTIVITY_FACTORS[p.activity];
}

/** Daily calorie and macro targets for a profile. */
export function computeGoals(p: Profile): Goals {
  const maintenance = tdee(p);
  const dailyDelta = (p.weeklyRateKg * KCAL_PER_KG) / 7;
  let calories = maintenance;
  if (p.goal === "lose") calories -= dailyDelta;
  if (p.goal === "gain") calories += dailyDelta;
  const floor = p.sex === "male" ? 1500 : 1200;
  calories = Math.round(Math.max(floor, calories) / 10) * 10;

  // Protein ~1.8 g per kg body weight (capped at 35% of calories), fat 27%, carbs the rest.
  const protein = Math.round(Math.min(1.8 * p.weightKg, (calories * 0.35) / 4));
  const fat = Math.round((calories * 0.27) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat };
}

/** Estimated date the target weight is reached, or null for maintain / already there. */
export function projectedGoalDate(p: Profile, from = new Date()): Date | null {
  if (p.goal === "maintain" || p.weeklyRateKg <= 0) return null;
  const diff = Math.abs(p.targetWeightKg - p.weightKg);
  if (diff < 0.1) return null;
  const weeks = diff / p.weeklyRateKg;
  return new Date(from.getTime() + weeks * 7 * 24 * 3600 * 1000);
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiCategory(value: number): string {
  if (value < 18.5) return "Underweight";
  if (value < 25) return "Healthy";
  if (value < 30) return "Overweight";
  return "Obese";
}

export type Totals = { calories: number; protein: number; carbs: number; fat: number };

export function entryTotals(e: FoodEntry): Totals {
  return {
    calories: Math.round(e.calories * e.servings),
    protein: Math.round(e.protein * e.servings),
    carbs: Math.round(e.carbs * e.servings),
    fat: Math.round(e.fat * e.servings),
  };
}

export function sumTotals(entries: FoodEntry[]): Totals {
  return entries.reduce<Totals>(
    (acc, e) => {
      const t = entryTotals(e);
      return {
        calories: acc.calories + t.calories,
        protein: acc.protein + t.protein,
        carbs: acc.carbs + t.carbs,
        fat: acc.fat + t.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

// ---------- dates ----------

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Consecutive days with at least one logged meal, ending today (or yesterday if today is empty). */
export function streak(entries: FoodEntry[], today = new Date()): number {
  const days = new Set(entries.map((e) => e.date));
  let cursor = days.has(dayKey(today)) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(dayKey(cursor))) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

// ---------- units ----------

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export function formatWeight(kg: number, units: Units, digits = 1): string {
  return units === "imperial" ? `${(kg / KG_PER_LB).toFixed(digits)} lb` : `${kg.toFixed(digits)} kg`;
}

export function weightToDisplay(kg: number, units: Units): number {
  return units === "imperial" ? kg / KG_PER_LB : kg;
}

export function weightFromDisplay(value: number, units: Units): number {
  return units === "imperial" ? value * KG_PER_LB : value;
}

export function formatHeight(cm: number, units: Units): string {
  if (units === "metric") return `${Math.round(cm)} cm`;
  const totalIn = Math.round(cm / CM_PER_IN);
  return `${Math.floor(totalIn / 12)}' ${totalIn % 12}"`;
}
