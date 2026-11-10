import { Pressable, StyleSheet, Text, View } from "react-native";
import { addDays, dayKey, parseDayKey } from "../lib/nutrition.ts";
import { colors } from "../lib/theme.ts";
import { Ring } from "./ui";

const LETTERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Last seven days ending today; each day shows a ring of calories eaten vs goal. */
export function WeekStrip({
  selected,
  onSelect,
  caloriesByDay,
  goal,
}: {
  selected: string;
  onSelect: (key: string) => void;
  caloriesByDay: Record<string, number>;
  goal: number;
}) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  return (
    <View style={s.row}>
      {days.map((d) => {
        const key = dayKey(d);
        const isSel = key === selected;
        const eaten = caloriesByDay[key] ?? 0;
        return (
          <Pressable key={key} onPress={() => onSelect(key)} style={[s.day, isSel && s.daySel]} accessibilityLabel={key}>
            <Text style={[s.letter, isSel && { color: colors.text }]}>{LETTERS[parseDayKey(key).getDay()]}</Text>
            <Ring size={34} stroke={3} progress={goal ? eaten / goal : 0} color={eaten > goal ? colors.danger : colors.text}>
              <Text style={s.num}>{d.getDate()}</Text>
            </Ring>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  day: { alignItems: "center", gap: 6, paddingVertical: 8, borderRadius: 16, flex: 1 },
  daySel: { backgroundColor: colors.card },
  letter: { fontSize: 12, color: colors.muted, fontWeight: "500" },
  num: { fontSize: 13, fontWeight: "600", color: colors.text },
});
