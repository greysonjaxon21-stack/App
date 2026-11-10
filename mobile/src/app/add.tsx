import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../components/ui";
import { prepareImage, pickImage } from "../lib/image.ts";
import { dayKey } from "../lib/nutrition.ts";
import { setPendingScan } from "../lib/pending.ts";
import { colors, radius, shadow } from "../lib/theme.ts";

function showError(message: string) {
  if (Platform.OS === "web") window.alert(message);
  else Alert.alert("Oops", message);
}

export default function AddFood() {
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date ?? dayKey(new Date());
  const [busy, setBusy] = useState(false);
  const [describe, setDescribe] = useState(false);
  const [text, setText] = useState("");

  const fromImage = async (source: "camera" | "library") => {
    try {
      const asset = await pickImage(source);
      if (!asset) return;
      setBusy(true);
      const img = await prepareImage(asset.uri, asset.width);
      setPendingScan({ date, imageBase64: img.base64, previewUri: img.previewUri, thumb: img.thumb });
      router.replace("/analyze");
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const fromText = () => {
    if (!text.trim()) return;
    setPendingScan({ date, description: text.trim() });
    router.replace("/analyze");
  };

  if (busy) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.text} />
        <Text style={s.muted}>Preparing photo…</Text>
      </View>
    );
  }

  if (describe) {
    return (
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Describe your meal</Text>
        <Text style={s.muted}>Include amounts if you know them, e.g. “2 scrambled eggs, 1 slice sourdough with butter, black coffee”.</Text>
        <TextInput
          autoFocus
          multiline
          value={text}
          onChangeText={setText}
          placeholder="What did you eat?"
          placeholderTextColor={colors.muted}
          style={s.textArea}
        />
        <Button title="Estimate nutrition" onPress={fromText} disabled={!text.trim()} />
        <Button title="Back" variant="secondary" onPress={() => setDescribe(false)} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.grid}>
        <Tile icon="scan" label="Scan food" sub="Take a photo" onPress={() => fromImage("camera")} />
        <Tile icon="images" label="Photo library" sub="Pick a photo" onPress={() => fromImage("library")} />
      </View>
      <View style={s.grid}>
        <Tile icon="chatbubble-ellipses" label="Describe food" sub="Type what you ate" onPress={() => setDescribe(true)} />
        <Tile icon="create" label="Manual entry" sub="Enter the numbers" onPress={() => router.replace({ pathname: "/manual", params: { date } })} />
      </View>
    </ScrollView>
  );
}

function Tile({ icon, label, sub, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.tile, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={32} color={colors.text} />
      <Text style={s.tileLabel}>{label}</Text>
      <Text style={s.tileSub}>{sub}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  content: { padding: 20, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  grid: { flexDirection: "row", gap: 14 },
  tile: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: 20, gap: 6, minHeight: 150, justifyContent: "center", ...shadow },
  tileLabel: { fontSize: 17, fontWeight: "700", color: colors.text, marginTop: 8 },
  tileSub: { fontSize: 13, color: colors.muted },
  title: { fontSize: 24, fontWeight: "800", color: colors.text },
  muted: { fontSize: 15, color: colors.muted, lineHeight: 21 },
  textArea: {
    minHeight: 140,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: 17,
    textAlignVertical: "top",
    color: colors.text,
  },
});
