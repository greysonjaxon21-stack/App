import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FixWithAI } from "../../components/FixWithAI";
import { NutritionEditor, type Draft } from "../../components/NutritionEditor";
import { Button, ConfirmButton } from "../../components/ui";
import { analyzeFood } from "../../lib/api.ts";
import { analysisFromDraft, draftFromAnalysis, draftFromEntry } from "../../lib/draft.ts";
import { useStore, useThumb } from "../../lib/store.tsx";
import { colors, radius } from "../../lib/theme.ts";

export default function FoodDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entries, updateEntry, deleteEntry, apiUrl, settings } = useStore();
  const entry = entries.find((e) => e.id === id);
  const [draft, setDraft] = useState<Draft | null>(entry ? draftFromEntry(entry) : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const thumb = useThumb(entry ?? { id: "", hasThumb: false });

  if (!entry || !draft) {
    return (
      <View style={s.center}>
        <Text style={s.muted}>This entry no longer exists.</Text>
      </View>
    );
  }

  const save = () => {
    updateEntry(entry.id, { ...draft, name: draft.name.trim() || entry.name });
    router.back();
  };

  const remove = () => {
    deleteEntry(entry.id);
    router.back();
  };

  const fix = async (correction: string) => {
    setLoading(true);
    setError(null);
    try {
      const analysis = await analyzeFood(apiUrl, settings.appToken, {
        description: draft.name,
        correction,
        previous: analysisFromDraft(draft),
      });
      setDraft(draftFromAnalysis(analysis, draft.servings));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ title: new Date(entry.loggedAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }) }} />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {thumb ? <Image source={{ uri: thumb }} style={s.photo} /> : null}
        <NutritionEditor draft={draft} onChange={setDraft} />
        <FixWithAI loading={loading} onSubmit={fix} />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <ConfirmButton title="Delete" confirmTitle="Tap again to delete" onConfirm={remove} />
      </ScrollView>
      <View style={s.footer}>
        <Button title="Save" onPress={save} disabled={loading} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { fontSize: 15, color: colors.muted },
  error: { fontSize: 14, color: colors.danger },
  photo: { width: "100%", height: 220, borderRadius: radius.lg, backgroundColor: colors.track },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.bg },
});
