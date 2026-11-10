import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BarChart, LineChart } from "../../components/Charts";
import { Button, Card, NumberField, SectionTitle } from "../../components/ui";
import {
  addDays,
  bmi,
  bmiCategory,
  dayKey,
  entryTotals,
  formatWeight,
  parseDayKey,
  streak,
  weightFromDisplay,
  weightToDisplay,
} from "../../lib/nutrition.ts";
import { useStore } from "../../lib/store.tsx";
import { colors } from "../../lib/theme.ts";

export default function Progress() {
  const { profile, goals, weights, entries, logWeight } = useStore();
  const [logging, setLogging] = useState(false);
  const [newWeight, setNewWeight] = useState(0);
  const units = profile?.units ?? "metric";

  const weekBars = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i - 6);
      const key = dayKey(d);
      const value = entries.filter((e) => e.date === key).reduce((a, e) => a + entryTotals(e).calories, 0);
      return { label: d.toLocaleDateString([], { weekday: "narrow" }), value };
    });
  }, [entries]);

  if (!profile || !goals) return null;

  const current = profile.weightKg;
  const start = profile.startWeightKg ?? weights[0]?.kg ?? current;
  const target = profile.targetWeightKg;
  const totalChange = Math.abs(target - start);
  const done = Math.abs(current - start);
  const movingRightWay = profile.goal === "lose" ? current <= start : current >= start;
  const goalProgress = profile.goal === "maintain" || totalChange === 0 ? 1 : movingRightWay ? Math.min(1, done / totalChange) : 0;
  const b = bmi(current, profile.heightCm);
  const loggedDays = weekBars.filter((x) => x.value > 0);
  const avg = loggedDays.length ? Math.round(loggedDays.reduce((a, x) => a + x.value, 0) / loggedDays.length) : 0;

  const chartPoints = weights.slice(-30).map((w) => ({
    label: parseDayKey(w.date).toLocaleDateString([], { month: "short", day: "numeric" }),
    value: weightToDisplay(w.kg, units),
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.h1}>Progress</Text>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Card style={{ flex: 1 }}>
            <Text style={s.label}>My weight</Text>
            <Text style={s.big}>{formatWeight(current, units)}</Text>
            <Text style={s.small}>Goal {formatWeight(target, units)}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={s.label}>Day streak</Text>
            <Text style={s.big}>🔥 {streak(entries)}</Text>
            <Text style={s.small}>Days in a row logged</Text>
          </Card>
        </View>

        <Card style={{ gap: 10 }}>
          <View style={s.rowBetween}>
            <Text style={s.cardTitle}>Goal progress</Text>
            <Text style={s.cardTitle}>{Math.round(goalProgress * 100)}%</Text>
          </View>
          <View style={s.track}>
            <View style={[s.fill, { width: `${goalProgress * 100}%` }]} />
          </View>
          <Text style={s.small}>
            Started at {formatWeight(start, units)} · {profile.goal === "maintain" ? "Maintaining" : `${formatWeight(Math.abs(target - current), units)} to go`}
          </Text>
          {logging ? (
            <View style={{ gap: 10 }}>
              <NumberField value={newWeight} onChangeNumber={setNewWeight} suffix={units === "imperial" ? "lb" : "kg"} placeholder="Today's weight" autoFocus />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setLogging(false)} />
                <Button
                  title="Save"
                  style={{ flex: 1 }}
                  disabled={newWeight <= 0}
                  onPress={() => {
                    logWeight(weightFromDisplay(newWeight, units));
                    setLogging(false);
                  }}
                />
              </View>
            </View>
          ) : (
            <Button
              title="Log weight"
              onPress={() => {
                setNewWeight(Math.round(weightToDisplay(current, units) * 10) / 10);
                setLogging(true);
              }}
            />
          )}
        </Card>

        <SectionTitle>Weight</SectionTitle>
        <Card>
          <LineChart points={chartPoints} goal={weightToDisplay(target, units)} format={(n) => n.toFixed(0)} />
        </Card>

        <SectionTitle>This week's calories</SectionTitle>
        <Card style={{ gap: 8 }}>
          <View style={s.rowBetween}>
            <Text style={s.small}>Daily average {avg} kcal</Text>
            <Text style={[s.small, { color: colors.accent }]}>Goal {goals.calories}</Text>
          </View>
          <BarChart bars={weekBars} goal={goals.calories} />
        </Card>

        <SectionTitle>Your BMI</SectionTitle>
        <Card style={{ gap: 10 }}>
          <View style={s.rowBetween}>
            <Text style={s.big}>{b.toFixed(1)}</Text>
            <Text style={[s.badge, { backgroundColor: b < 18.5 ? colors.fat : b < 25 ? colors.accent : b < 30 ? colors.carbs : colors.danger }]}>
              {bmiCategory(b)}
            </Text>
          </View>
          <View style={s.bmiBar}>
            {[colors.fat, colors.accent, colors.carbs, colors.danger].map((c) => (
              <View key={c} style={{ flex: 1, backgroundColor: c }} />
            ))}
            <View style={[s.bmiMarker, { left: `${Math.min(100, Math.max(0, ((b - 15) / 20) * 100))}%` }]} />
          </View>
          <Text style={s.small}>Underweight &lt;18.5 · Healthy 18.5–24.9 · Overweight 25–29.9 · Obese 30+</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  h1: { fontSize: 30, fontWeight: "800", color: colors.text, marginBottom: 4 },
  label: { fontSize: 13, color: colors.muted, fontWeight: "500" },
  big: { fontSize: 26, fontWeight: "800", color: colors.text, marginVertical: 4 },
  small: { fontSize: 13, color: colors.muted },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  track: { height: 10, backgroundColor: colors.track, borderRadius: 5, overflow: "hidden" },
  fill: { height: 10, backgroundColor: colors.text, borderRadius: 5 },
  badge: { color: "#fff", fontWeight: "700", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: "hidden" },
  bmiBar: { flexDirection: "row", height: 10, borderRadius: 5, overflow: "visible" },
  bmiMarker: { position: "absolute", top: -4, width: 4, height: 18, marginLeft: -2, backgroundColor: colors.text, borderRadius: 2 },
});
