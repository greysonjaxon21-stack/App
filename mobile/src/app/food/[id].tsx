import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FixWithAI } from "../../components/FixWithAI";
import { NutritionEditor, type Draft } from "../../components/NutritionEditor";
import { Button } from "../../components/ui";
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
    const doDelete = () => {
      deleteEntry(entry.id);
      router.back();
    };
    if (Platform.OS === "web") {
      if (window.confirm("Delete this food?")) doDelete();
    } else {
      Alert.alert("Delete food", "Remove this entry from your log?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const fix = async (correction: string) => {
    setLoading(true);
    try {
      const analysis = await analyzeFood(apiUrl, settings.appToken, {
        description: draft.name,
        correction,
        previous: analysisFromDraft(draft),
      });
      setDraft(draftFromAnalysis(analysis, draft.servings));
    } catch (e) {
      const msg = (e as Error).message;
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Couldn't update", msg);
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
        <Button title="Delete" variant="danger" onPress={remove} />
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
  photo: { width: "100%", height: 220, borderRadius: radius.lg, backgroundColor: colors.track },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.bg },
});
