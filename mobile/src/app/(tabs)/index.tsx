import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FoodRow } from "../../components/FoodRow";
import { Card, Ring, SectionTitle } from "../../components/ui";
import { WeekStrip } from "../../components/WeekStrip";
import { dayKey, entryTotals, parseDayKey, streak, sumTotals } from "../../lib/nutrition.ts";
import { useStore } from "../../lib/store.tsx";
import { colors, shadow } from "../../lib/theme.ts";

export default function Home() {
  const { entries, goals } = useStore();
  const [selected, setSelected] = useState(dayKey(new Date()));

  const dayEntries = useMemo(
    () => entries.filter((e) => e.date === selected).sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)),
    [entries, selected],
  );
  const totals = sumTotals(dayEntries);
  const caloriesByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) map[e.date] = (map[e.date] ?? 0) + entryTotals(e).calories;
    return map;
  }, [entries]);
  const streakDays = streak(entries);
  const g = goals ?? { calories: 2000, protein: 150, carbs: 200, fat: 65 };
  const isToday = selected === dayKey(new Date());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.header}>
          <Text style={s.brand}>🍽️ Plately</Text>
          <View style={s.streak} accessibilityLabel={`${streakDays} day streak`}>
            <Text style={{ fontSize: 16 }}>🔥</Text>
            <Text style={s.streakText}>{streakDays}</Text>
          </View>
        </View>

        <WeekStrip selected={selected} onSelect={setSelected} caloriesByDay={caloriesByDay} goal={g.calories} />

        <Card style={s.calCard}>
          <View>
            <Text style={s.calNum}>{Math.abs(g.calories - totals.calories)}</Text>
            <Text style={s.calLabel}>{totals.calories > g.calories ? "Calories over" : "Calories left"}</Text>
            <Text style={s.calSub}>
              {totals.calories} eaten · {g.calories} goal
            </Text>
          </View>
          <Ring size={110} stroke={10} progress={totals.calories / g.calories} color={totals.calories > g.calories ? colors.danger : colors.calories}>
            <Text style={{ fontSize: 30 }}>🔥</Text>
          </Ring>
        </Card>

        <View style={s.macroRow}>
          <MacroCard label="Protein" eaten={totals.protein} goal={g.protein} color={colors.protein} icon="🍗" />
          <MacroCard label="Carbs" eaten={totals.carbs} goal={g.carbs} color={colors.carbs} icon="🌾" />
          <MacroCard label="Fats" eaten={totals.fat} goal={g.fat} color={colors.fat} icon="🥑" />
        </View>

        <SectionTitle>{isToday ? "Recently uploaded" : parseDayKey(selected).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}</SectionTitle>
        {dayEntries.length === 0 ? (
          <Card style={s.empty}>
            <Text style={s.emptyText}>{isToday ? "You haven't logged any food today" : "Nothing logged this day"}</Text>
            <Text style={s.emptySub}>Tap + to snap a photo of your meal</Text>
          </Card>
        ) : (
          dayEntries.map((e) => <FoodRow key={e.id} entry={e} onPress={() => router.push(`/food/${e.id}`)} />)
        )}
      </ScrollView>

      <Pressable
        accessibilityLabel="Log food"
        style={({ pressed }) => [s.fab, pressed && { transform: [{ scale: 0.96 }] }]}
        onPress={() => router.push({ pathname: "/add", params: { date: selected } })}
      >
        <Ionicons name="add" size={34} color={colors.primaryText} />
      </Pressable>
    </SafeAreaView>
  );
}

function MacroCard({ label, eaten, goal, color, icon }: { label: string; eaten: number; goal: number; color: string; icon: string }) {
  const over = eaten > goal;
  return (
    <Card style={s.macroCard}>
      <Text style={s.macroNum}>{Math.abs(goal - eaten)}g</Text>
      <Text style={s.macroLabel}>
        {label} {over ? "over" : "left"}
      </Text>
      <Ring size={62} stroke={6} progress={goal ? eaten / goal : 0} color={over ? colors.danger : color}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </Ring>
    </Card>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  brand: { fontSize: 26, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
  streak: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, ...shadow },
  streakText: { fontSize: 16, fontWeight: "700", color: colors.text },
  calCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 22 },
  calNum: { fontSize: 44, fontWeight: "800", color: colors.text, letterSpacing: -1 },
  calLabel: { fontSize: 15, color: colors.text, fontWeight: "500" },
  calSub: { fontSize: 13, color: colors.muted, marginTop: 6 },
  macroRow: { flexDirection: "row", gap: 10, marginTop: 12, marginBottom: 10 },
  macroCard: { flex: 1, padding: 14, gap: 2 },
  macroNum: { fontSize: 20, fontWeight: "800", color: colors.text },
  macroLabel: { fontSize: 12, color: colors.muted, marginBottom: 10 },
  empty: { alignItems: "center", paddingVertical: 28, gap: 6 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.text },
  emptySub: { fontSize: 14, color: colors.muted },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
    shadowOpacity: 0.2,
  },
});
