/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import { bmr, computeGoals, dayKey, projectedGoalDate, streak, sumTotals } from "./nutrition.ts";
import type { FoodEntry, Profile } from "./types.ts";

const profile: Profile = {
  sex: "male",
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activity: "moderate",
  goal: "lose",
  targetWeightKg: 75,
  weeklyRateKg: 0.5,
  units: "metric",
};

test("bmr uses Mifflin-St Jeor", () => {
  assert.equal(bmr(profile), 1780);
  assert.equal(bmr({ ...profile, sex: "female" }), 1614);
});

test("computeGoals builds a deficit and splits macros", () => {
  const g = computeGoals(profile);
  // 1780 * 1.55 = 2759 maintenance, minus 550/day for 0.5 kg/week
  assert.equal(g.calories, 2210);
  assert.equal(g.protein, 144);
  assert.equal(g.fat, 66);
  const kcalFromMacros = g.protein * 4 + g.carbs * 4 + g.fat * 9;
  assert.ok(Math.abs(kcalFromMacros - g.calories) < 10);
});

test("computeGoals never goes below the safety floor", () => {
  const g = computeGoals({ ...profile, sex: "female", weightKg: 45, heightCm: 150, activity: "sedentary", weeklyRateKg: 1 });
  assert.equal(g.calories, 1200);
});

test("projectedGoalDate", () => {
  const from = new Date(2026, 0, 1);
  const d = projectedGoalDate(profile, from)!;
  assert.equal(Math.round((d.getTime() - from.getTime()) / 86400000), 70);
  assert.equal(projectedGoalDate({ ...profile, goal: "maintain" }), null);
});

function entry(date: string, calories = 100, servings = 1): FoodEntry {
  return { id: date + calories, date, loggedAt: "", name: "x", calories, protein: 10, carbs: 5, fat: 2, servings, source: "manual" };
}

test("streak counts consecutive days", () => {
  const today = new Date(2026, 4, 10);
  const entries = [entry("2026-05-10"), entry("2026-05-09"), entry("2026-05-08"), entry("2026-05-06")];
  assert.equal(streak(entries, today), 3);
  // today empty -> still counts the run ending yesterday
  assert.equal(streak(entries.slice(1), today), 2);
  assert.equal(streak([entry("2026-05-07")], today), 0);
});

test("sumTotals applies servings", () => {
  const t = sumTotals([entry("2026-05-10", 200, 1.5), entry("2026-05-10", 100)]);
  assert.deepEqual(t, { calories: 400, protein: 25, carbs: 13, fat: 5 });
});

test("dayKey is local and zero padded", () => {
  assert.equal(dayKey(new Date(2026, 0, 5)), "2026-01-05");
});
