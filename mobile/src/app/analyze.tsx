import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FixWithAI } from "../components/FixWithAI";
import { NutritionEditor, type Draft } from "../components/NutritionEditor";
import { Button, Card } from "../components/ui";
import { analyzeFood } from "../lib/api.ts";
import { analysisFromDraft, draftFromAnalysis } from "../lib/draft.ts";
import { getPendingScan } from "../lib/pending.ts";
import { useStore } from "../lib/store.tsx";
import { colors, radius } from "../lib/theme.ts";

export default function Analyze() {
  const { apiUrl, settings, addEntry } = useStore();
  const scan = useRef(getPendingScan()).current;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(
    async (correction?: string) => {
      if (!scan) return;
      setLoading(true);
      setError(null);
      try {
        const analysis = await analyzeFood(apiUrl, settings.appToken, {
          imageBase64: scan.imageBase64,
          mediaType: scan.imageBase64 ? "image/jpeg" : undefined,
          description: scan.description,
          correction,
          previous: correction && draft ? analysisFromDraft(draft) : undefined,
        });
        setDraft(draftFromAnalysis(analysis, draft?.servings ?? 1));
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [scan, apiUrl, settings.appToken, draft],
  );

  useEffect(() => {
    run();
    // Only analyze once on mount; corrections call run() explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!scan) {
    return (
      <View style={s.center}>
        <Text style={s.muted}>Nothing to analyze.</Text>
        <Button title="Go home" onPress={() => router.back()} />
      </View>
    );
  }

  const save = () => {
    if (!draft) return;
    addEntry({
      date: scan.date,
      name: draft.name.trim() || "Meal",
      servings: draft.servings,
      calories: draft.calories,
      protein: draft.protein,
      carbs: draft.carbs,
      fat: draft.fat,
      fiber: draft.fiber,
      sugar: draft.sugar,
      sodium: draft.sodium,
      healthScore: draft.healthScore,
      items: draft.items,
      notes: draft.notes,
      source: scan.imageBase64 ? "photo" : "text",
      thumb: scan.thumb,
    });
    router.dismissAll();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {scan.previewUri ? (
          <Image source={{ uri: scan.previewUri }} style={s.photo} resizeMode="cover" />
        ) : (
          <Card>
            <Text style={s.muted}>“{scan.description}”</Text>
          </Card>
        )}

        {loading && !draft ? (
          <Card style={s.loadingCard}>
            <ActivityIndicator color={colors.text} />
            <Text style={s.loadingTitle}>Analyzing your meal…</Text>
            <Text style={s.muted}>Identifying ingredients and estimating portions</Text>
          </Card>
        ) : null}

        {error ? (
          <Card style={{ gap: 12 }}>
            <Text style={s.errorTitle}>Couldn't analyze</Text>
            <Text style={s.muted}>{error}</Text>
            <Button title="Try again" onPress={() => run()} />
          </Card>
        ) : null}

        {draft ? (
          <>
            <NutritionEditor draft={draft} onChange={setDraft} />
            <FixWithAI loading={loading} onSubmit={(c) => run(c)} />
          </>
        ) : null}
      </ScrollView>
      {draft ? (
        <View style={s.footer}>
          <Button title="Done" onPress={save} disabled={loading} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  photo: { width: "100%", height: 260, borderRadius: radius.lg, backgroundColor: colors.track },
  loadingCard: { alignItems: "center", gap: 8, paddingVertical: 28 },
  loadingTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  muted: { fontSize: 15, color: colors.muted, lineHeight: 21, textAlign: "center" },
  errorTitle: { fontSize: 17, fontWeight: "700", color: colors.danger },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.bg },
});
