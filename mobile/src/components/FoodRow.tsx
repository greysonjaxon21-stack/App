import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { entryTotals } from "../lib/nutrition.ts";
import { useThumb } from "../lib/store.tsx";
import { colors, radius, shadow } from "../lib/theme.ts";
import type { FoodEntry } from "../lib/types.ts";

export function FoodRow({ entry, onPress }: { entry: FoodEntry; onPress: () => void }) {
  const thumb = useThumb(entry);
  const t = entryTotals(entry);
  const time = new Date(entry.loggedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}>
      {thumb ? (
        <Image source={{ uri: thumb }} style={s.thumb} />
      ) : (
        <View style={[s.thumb, s.thumbEmpty]}>
          <Text style={{ fontSize: 28 }}>{entry.source === "text" ? "📝" : "🍽️"}</Text>
        </View>
      )}
      <View style={s.body}>
        <View style={s.top}>
          <Text style={s.name} numberOfLines={1}>
            {entry.name}
          </Text>
          <Text style={s.time}>{time}</Text>
        </View>
        <Text style={s.kcal}>🔥 {t.calories} kcal</Text>
        <View style={s.macros}>
          <Text style={s.macro}>
            <Text style={{ color: colors.protein }}>●</Text> {t.protein}g
          </Text>
          <Text style={s.macro}>
            <Text style={{ color: colors.carbs }}>●</Text> {t.carbs}g
          </Text>
          <Text style={s.macro}>
            <Text style={{ color: colors.fat }}>●</Text> {t.fat}g
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: 12,
    ...shadow,
  },
  thumb: { width: 96, height: 96 },
  thumbEmpty: { backgroundColor: colors.track, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, padding: 12, justifyContent: "center", gap: 4 },
  top: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
  time: { fontSize: 12, color: colors.muted, backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: "hidden" },
  kcal: { fontSize: 15, fontWeight: "600", color: colors.text },
  macros: { flexDirection: "row", gap: 14 },
  macro: { fontSize: 13, color: colors.muted },
});
