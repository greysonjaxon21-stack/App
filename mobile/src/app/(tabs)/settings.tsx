import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, ConfirmButton, Field, SectionTitle } from "../../components/ui";
import { checkServer, hasArtifactRuntime } from "../../lib/api.ts";
import { formatHeight, formatWeight } from "../../lib/nutrition.ts";
import { defaultApiUrl, useStore } from "../../lib/store.tsx";
import { colors } from "../../lib/theme.ts";

export default function Settings() {
  const { profile, goals, settings, apiUrl, updateSettings, updateProfile, resetAll } = useStore();
  const [url, setUrl] = useState(settings.apiUrl);
  const [token, setToken] = useState(settings.appToken);
  const [status, setStatus] = useState<string | null>(null);

  if (!profile || !goals) return null;

  const saveServer = async () => {
    const cleaned = url.trim().replace(/\/$/, "");
    updateSettings({ apiUrl: cleaned, appToken: token.trim() });
    setStatus("Checking…");
    const ok = await checkServer(cleaned || defaultApiUrl());
    setStatus(ok ? "✅ Connected" : "❌ Can't reach the server");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.h1}>Settings</Text>

        <Card style={s.list}>
          <Row label="Age" value={`${profile.age}`} />
          <Row label="Height" value={formatHeight(profile.heightCm, profile.units)} />
          <Row label="Current weight" value={formatWeight(profile.weightKg, profile.units)} />
          <Row label="Goal weight" value={formatWeight(profile.targetWeightKg, profile.units)} />
          <Row label="Personal details" chevron onPress={() => router.push("/edit-profile")} />
        </Card>

        <SectionTitle>Nutrition goals</SectionTitle>
        <Card style={s.list}>
          <Row label="Calories" value={`${goals.calories} kcal`} />
          <Row label="Protein" value={`${goals.protein} g`} />
          <Row label="Carbs" value={`${goals.carbs} g`} />
          <Row label="Fats" value={`${goals.fat} g`} />
          <Row label="Adjust goals" chevron onPress={() => router.push("/edit-goals")} />
        </Card>

        <SectionTitle>Preferences</SectionTitle>
        <Card style={s.list}>
          <Row
            label="Units"
            value={profile.units === "imperial" ? "Imperial (lb, ft)" : "Metric (kg, cm)"}
            onPress={() => updateProfile({ ...profile, units: profile.units === "imperial" ? "metric" : "imperial" }, false)}
          />
        </Card>

        {hasArtifactRuntime() ? (
          <>
            <SectionTitle>AI analysis</SectionTitle>
            <Card>
              <Text style={s.small}>Meals are analyzed by Claude using your Claude account. Your log is saved in this browser only.</Text>
            </Card>
          </>
        ) : (
        <>
        <SectionTitle>AI server</SectionTitle>
        <Card style={{ gap: 12 }}>
          <Text style={s.small}>Photos are analyzed by your Plately server. Currently using: {apiUrl}</Text>
          <Field label="Server URL" value={url} onChangeText={setUrl} placeholder={defaultApiUrl()} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
          <Field label="App token (optional)" value={token} onChangeText={setToken} placeholder="Only if your server requires one" autoCapitalize="none" autoCorrect={false} secureTextEntry />
          <Button title="Save & test connection" variant="secondary" onPress={saveServer} />
          {status ? <Text style={s.small}>{status}</Text> : null}
        </Card>
        </>
        )}

        <View style={{ height: 12 }} />
        <ConfirmButton title="Reset all data" confirmTitle="Tap again to erase everything" onConfirm={() => resetAll()} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, chevron, onPress }: { label: string; value?: string; chevron?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>
        {value}
        {chevron ? "  ›" : ""}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, gap: 8, paddingBottom: 40 },
  h1: { fontSize: 30, fontWeight: "800", color: colors.text, marginBottom: 8 },
  list: { paddingVertical: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLabel: { fontSize: 16, color: colors.text },
  rowValue: { fontSize: 16, color: colors.muted, fontWeight: "500" },
  small: { fontSize: 13, color: colors.muted, lineHeight: 18 },
});
