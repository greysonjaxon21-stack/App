export type Sex = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "active";
export type GoalType = "lose" | "maintain" | "gain";
export type Units = "metric" | "imperial";

export type Profile = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: GoalType;
  targetWeightKg: number;
  /** Desired change in kg per week (always positive). */
  weeklyRateKg: number;
  units: Units;
  /** Weight when the user started, for goal progress. */
  startWeightKg?: number;
};

export type Goals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type FoodItem = {
  name: string;
  quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

/** Nutrition for one serving. Totals are these values × servings. */
export type Nutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
};

export type FoodEntry = Nutrition & {
  id: string;
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  /** ISO timestamp of when it was logged. */
  loggedAt: string;
  name: string;
  servings: number;
  source: "photo" | "text" | "manual";
  healthScore?: number;
  items?: FoodItem[];
  notes?: string;
  /** Whether a thumbnail is stored for this entry (see useThumb). */
  hasThumb?: boolean;
  /** Only used when creating an entry: small JPEG data URI, stored separately. */
  thumb?: string;
};

export type WeightEntry = {
  date: string;
  kg: number;
};

export type Settings = {
  apiUrl: string;
  appToken: string;
};

/** Shape returned by the server's /analyze endpoint. */
export type Analysis = {
  is_food: boolean;
  name: string;
  items: FoodItem[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  health_score: number;
  confidence: "low" | "medium" | "high";
  notes: string;
};
