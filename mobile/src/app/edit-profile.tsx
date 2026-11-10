import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, NumberField, OptionButton } from "../components/ui";
import { CM_PER_IN, weightFromDisplay, weightToDisplay } from "../lib/nutrition.ts";
import { useStore } from "../lib/store.tsx";
import { colors } from "../lib/theme.ts";
import type { Activity, GoalType, Profile } from "../lib/types.ts";

const ACTIVITIES: { key: Activity; label: string }[] = [
  { key: "sedentary", label: "0 workouts / week" },
  { key: "light", label: "1–2 workouts / week" },
  { key: "moderate", label: "3–5 workouts / week" },
  { key: "active", label: "6+ workouts / week" },
];

export default function EditProfile() {
  const { profile, updateProfile, logWeight } = useStore();
  const [p, setP] = useState<Profile | null>(profile);
  if (!p || !profile) return null;
  const imperial = p.units === "imperial";
  const set = (patch: Partial<Profile>) => setP({ ...p, ...patch });

  const valid = p.age >= 13 && p.heightCm >= 100 && p.weightKg >= 30 && p.targetWeightKg >= 30;

  return (
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.row}>
        <NumberField label="Age" value={p.age} onChangeNumber={(age) => set({ age: Math.round(age) })} keyboardType="number-pad" />
        <NumberField
          label="Height"
          value={Math.round(imperial ? p.heightCm / CM_PER_IN : p.heightCm)}
          onChangeNumber={(h) => set({ heightCm: imperial ? h * CM_PER_IN : h })}
          suffix={imperial ? "in" : "cm"}
        />
      </View>
      <View style={s.row}>
        <NumberField
          label="Current weight"
          value={Math.round(weightToDisplay(p.weightKg, p.units) * 10) / 10}
          onChangeNumber={(w) => set({ weightKg: weightFromDisplay(w, p.units) })}
          suffix={imperial ? "lb" : "kg"}
        />
        <NumberField
          label="Goal weight"
          value={Math.round(weightToDisplay(p.targetWeightKg, p.units) * 10) / 10}
          onChangeNumber={(w) => set({ targetWeightKg: weightFromDisplay(w, p.units) })}
          suffix={imperial ? "lb" : "kg"}
        />
      </View>

      <Text style={s.label}>Gender</Text>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <OptionButton label="Male" selected={p.sex === "male"} onPress={() => set({ sex: "male" })} />
        </View>
        <View style={{ flex: 1 }}>
          <OptionButton label="Female" selected={p.sex === "female"} onPress={() => set({ sex: "female" })} />
        </View>
      </View>

      <Text style={s.label}>Goal</Text>
      <View style={s.row}>
        {(["lose", "maintain", "gain"] as GoalType[]).map((g) => (
          <View key={g} style={{ flex: 1 }}>
            <OptionButton label={g === "lose" ? "Lose" : g === "gain" ? "Gain" : "Maintain"} selected={p.goal === g} onPress={() => set({ goal: g, weeklyRateKg: g === "maintain" ? 0 : p.weeklyRateKg || 0.5 })} />
          </View>
        ))}
      </View>

      <Text style={s.label}>Activity</Text>
      {ACTIVITIES.map((a) => (
        <OptionButton key={a.key} label={a.label} selected={p.activity === a.key} onPress={() => set({ activity: a.key })} />
      ))}

      <Text style={s.small}>Saving recalculates your daily calorie and macro goals.</Text>
      <Button
        title="Save"
        disabled={!valid}
        onPress={() => {
          if (Math.abs(p.weightKg - profile.weightKg) > 0.01) logWeight(p.weightKg);
          updateProfile(p, true);
          router.back();
        }}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  row: { flexDirection: "row", gap: 10 },
  label: { fontSize: 15, fontWeight: "600", color: colors.muted, marginTop: 8 },
  small: { fontSize: 13, color: colors.muted, marginTop: 8 },
});
