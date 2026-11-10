import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { NutritionEditor, type Draft } from "../components/NutritionEditor";
import { Button } from "../components/ui";
import { dayKey } from "../lib/nutrition.ts";
import { useStore } from "../lib/store.tsx";
import { colors } from "../lib/theme.ts";

export default function Manual() {
  const params = useLocalSearchParams<{ date?: string }>();
  const { addEntry } = useStore();
  const [draft, setDraft] = useState<Draft>({ name: "", servings: 1, calories: 0, protein: 0, carbs: 0, fat: 0 });

  const save = () => {
    addEntry({
      ...draft,
      name: draft.name.trim() || "Food",
      date: params.date ?? dayKey(new Date()),
      source: "manual",
    });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <NutritionEditor draft={draft} onChange={setDraft} />
      </ScrollView>
      <View style={s.footer}>
        <Button title="Log food" onPress={save} disabled={!draft.name.trim() || draft.calories <= 0} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  footer: { padding: 16, paddingBottom: 28, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
