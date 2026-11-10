import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Button, NumberField } from "../components/ui";
import { computeGoals } from "../lib/nutrition.ts";
import { useStore } from "../lib/store.tsx";
import { colors } from "../lib/theme.ts";
import type { Goals } from "../lib/types.ts";

export default function EditGoals() {
  const { goals, profile, setGoals } = useStore();
  const [g, setG] = useState<Goals>(goals ?? { calories: 2000, protein: 150, carbs: 200, fat: 65 });
  const macroKcal = g.protein * 4 + g.carbs * 4 + g.fat * 9;

  return (
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <NumberField label="Calorie goal" value={g.calories} onChangeNumber={(calories) => setG({ ...g, calories: Math.round(calories) })} suffix="kcal" />
      <NumberField label="Protein goal" value={g.protein} onChangeNumber={(protein) => setG({ ...g, protein: Math.round(protein) })} suffix="g" />
      <NumberField label="Carb goal" value={g.carbs} onChangeNumber={(carbs) => setG({ ...g, carbs: Math.round(carbs) })} suffix="g" />
      <NumberField label="Fat goal" value={g.fat} onChangeNumber={(fat) => setG({ ...g, fat: Math.round(fat) })} suffix="g" />
      <Text style={s.small}>Your macros add up to {macroKcal} kcal.</Text>
      <Button
        title="Save"
        disabled={g.calories < 500}
        onPress={() => {
          setGoals(g);
          router.back();
        }}
      />
      {profile ? <Button title="Auto-generate from my details" variant="secondary" onPress={() => setG(computeGoals(profile))} /> : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  small: { fontSize: 13, color: colors.muted },
});
