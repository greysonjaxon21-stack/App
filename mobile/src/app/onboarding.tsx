import { useMemo, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, NumberField, OptionButton, Ring } from "../components/ui";
import { CM_PER_IN, computeGoals, formatWeight, KG_PER_LB, projectedGoalDate } from "../lib/nutrition.ts";
import { useStore } from "../lib/store.tsx";
import { colors } from "../lib/theme.ts";
import type { Activity, GoalType, Profile, Sex, Units } from "../lib/types.ts";

type Form = {
  sex?: Sex;
  activity?: Activity;
  units: Units;
  heightCm: number;
  weightKg: number;
  age: number;
  goal?: GoalType;
  targetWeightKg: number;
  weeklyRateKg: number;
};

type Step = "welcome" | "sex" | "activity" | "body" | "age" | "goal" | "target" | "pace" | "plan";

export default function Onboarding() {
  const { completeOnboarding } = useStore();
  const [form, setForm] = useState<Form>({ units: "imperial", heightCm: 0, weightKg: 0, age: 0, targetWeightKg: 0, weeklyRateKg: 0.5 });
  const [stepIdx, setStepIdx] = useState(0);
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const steps: Step[] = useMemo(() => {
    const base: Step[] = ["welcome", "sex", "activity", "body", "age", "goal"];
    if (form.goal && form.goal !== "maintain") base.push("target", "pace");
    base.push("plan");
    return base;
  }, [form.goal]);

  const step = steps[stepIdx];

  const canContinue = (() => {
    switch (step) {
      case "sex":
        return !!form.sex;
      case "activity":
        return !!form.activity;
      case "body":
        return form.heightCm >= 100 && form.heightCm <= 250 && form.weightKg >= 30 && form.weightKg <= 350;
      case "age":
        return form.age >= 13 && form.age <= 100;
      case "goal":
        return !!form.goal;
      case "target":
        if (form.targetWeightKg < 30 || form.targetWeightKg > 350) return false;
        return form.goal === "lose" ? form.targetWeightKg < form.weightKg : form.targetWeightKg > form.weightKg;
      default:
        return true;
    }
  })();

  const profile: Profile | null =
    form.sex && form.activity && form.goal
      ? {
          sex: form.sex,
          activity: form.activity,
          goal: form.goal,
          units: form.units,
          heightCm: form.heightCm,
          weightKg: form.weightKg,
          age: form.age,
          targetWeightKg: form.goal === "maintain" ? form.weightKg : form.targetWeightKg,
          weeklyRateKg: form.goal === "maintain" ? 0 : form.weeklyRateKg,
        }
      : null;

  const next = () => {
    if (step === "plan" && profile) {
      completeOnboarding(profile);
      return;
    }
    if (step === "goal" && form.goal && form.goal !== "maintain" && !form.targetWeightKg) {
      set({ targetWeightKg: Math.round(form.weightKg + (form.goal === "lose" ? -5 : 5)) });
    }
    setStepIdx((i) => Math.min(steps.length - 1, i + 1));
  };
  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {step !== "welcome" ? (
          <View style={s.header}>
            <Pressable onPress={back} style={s.backBtn} accessibilityLabel="Back">
              <Text style={{ fontSize: 22 }}>←</Text>
            </Pressable>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${(stepIdx / (steps.length - 1)) * 100}%` }]} />
            </View>
          </View>
        ) : null}
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {step === "welcome" && <Welcome />}
          {step === "sex" && (
            <Question title="Choose your gender" subtitle="This is used to calibrate your custom plan.">
              <OptionButton label="Male" selected={form.sex === "male"} onPress={() => set({ sex: "male" })} />
              <OptionButton label="Female" selected={form.sex === "female"} onPress={() => set({ sex: "female" })} />
            </Question>
          )}
          {step === "activity" && (
            <Question title="How many workouts do you do per week?" subtitle="This is used to calibrate your custom plan.">
              <OptionButton label="0" sublabel="Mostly sitting, little exercise" selected={form.activity === "sedentary"} onPress={() => set({ activity: "sedentary" })} />
              <OptionButton label="1–2" sublabel="Workouts now and then" selected={form.activity === "light"} onPress={() => set({ activity: "light" })} />
              <OptionButton label="3–5" sublabel="A few workouts per week" selected={form.activity === "moderate"} onPress={() => set({ activity: "moderate" })} />
              <OptionButton label="6+" sublabel="Dedicated athlete" selected={form.activity === "active"} onPress={() => set({ activity: "active" })} />
            </Question>
          )}
          {step === "body" && <BodyStep form={form} set={set} />}
          {step === "age" && (
            <Question title="How old are you?" subtitle="Your metabolism changes with age.">
              <NumberField label="Age" value={form.age} onChangeNumber={(age) => set({ age: Math.round(age) })} suffix="years" keyboardType="number-pad" />
            </Question>
          )}
          {step === "goal" && (
            <Question title="What is your goal?" subtitle="This helps us generate a plan for your calorie intake.">
              <OptionButton label="Lose weight" selected={form.goal === "lose"} onPress={() => set({ goal: "lose" })} />
              <OptionButton label="Maintain" selected={form.goal === "maintain"} onPress={() => set({ goal: "maintain" })} />
              <OptionButton label="Gain weight" selected={form.goal === "gain"} onPress={() => set({ goal: "gain" })} />
            </Question>
          )}
          {step === "target" && (
            <Question
              title="What is your desired weight?"
              subtitle={`Current weight: ${formatWeight(form.weightKg, form.units)}`}
            >
              <WeightInput units={form.units} kg={form.targetWeightKg} onChange={(kg) => set({ targetWeightKg: kg })} label="Target weight" />
              {!canContinue && form.targetWeightKg > 0 ? (
                <Text style={s.hint}>
                  {form.goal === "lose" ? "Target should be below your current weight." : "Target should be above your current weight."}
                </Text>
              ) : null}
            </Question>
          )}
          {step === "pace" && <PaceStep form={form} set={set} />}
          {step === "plan" && profile && <PlanStep profile={profile} />}
        </ScrollView>
        <View style={s.footer}>
          <Button title={step === "plan" ? "Let's get started!" : step === "welcome" ? "Get started" : "Continue"} onPress={next} disabled={!canContinue} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Welcome() {
  return (
    <View style={{ alignItems: "center", paddingTop: 60, gap: 18 }}>
      <Text style={{ fontSize: 80 }}>📸</Text>
      <Text style={[s.title, { textAlign: "center" }]}>Calorie tracking made easy</Text>
      <Text style={[s.subtitle, { textAlign: "center" }]}>
        Just snap a photo of your meal. Plately's AI estimates calories, protein, carbs and fats in seconds.
      </Text>
    </View>
  );
}

function Question({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.title}>{title}</Text>
      {subtitle ? <Text style={[s.subtitle, { marginBottom: 20 }]}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function UnitToggle({ units, onChange }: { units: Units; onChange: (u: Units) => void }) {
  return (
    <View style={s.toggle}>
      {(["imperial", "metric"] as const).map((u) => (
        <Pressable key={u} onPress={() => onChange(u)} style={[s.toggleItem, units === u && s.toggleItemOn]}>
          <Text style={[s.toggleText, units === u && { color: colors.primaryText }]}>{u === "imperial" ? "Imperial" : "Metric"}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function WeightInput({ units, kg, onChange, label }: { units: Units; kg: number; onChange: (kg: number) => void; label: string }) {
  return units === "imperial" ? (
    <NumberField label={label} value={kg ? Math.round((kg / KG_PER_LB) * 10) / 10 : 0} onChangeNumber={(lb) => onChange(lb * KG_PER_LB)} suffix="lb" />
  ) : (
    <NumberField label={label} value={kg ? Math.round(kg * 10) / 10 : 0} onChangeNumber={onChange} suffix="kg" />
  );
}

function BodyStep({ form, set }: { form: Form; set: (p: Partial<Form>) => void }) {
  const totalIn = form.heightCm / CM_PER_IN;
  const ft = form.heightCm ? Math.floor(Math.round(totalIn) / 12) : 0;
  const inch = form.heightCm ? Math.round(totalIn) % 12 : 0;
  return (
    <Question title="Height & weight" subtitle="This will be used to calibrate your custom plan.">
      <UnitToggle units={form.units} onChange={(units) => set({ units })} />
      {form.units === "imperial" ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <NumberField label="Height" value={ft} onChangeNumber={(f) => set({ heightCm: (Math.round(f) * 12 + inch) * CM_PER_IN })} suffix="ft" keyboardType="number-pad" />
          <NumberField label=" " value={inch} onChangeNumber={(i) => set({ heightCm: (ft * 12 + Math.min(11, Math.round(i))) * CM_PER_IN })} suffix="in" keyboardType="number-pad" />
        </View>
      ) : (
        <NumberField label="Height" value={Math.round(form.heightCm)} onChangeNumber={(heightCm) => set({ heightCm })} suffix="cm" />
      )}
      <WeightInput units={form.units} kg={form.weightKg} onChange={(weightKg) => set({ weightKg })} label="Weight" />
    </Question>
  );
}

const PACES = [0.25, 0.5, 0.75, 1];

function PaceStep({ form, set }: { form: Form; set: (p: Partial<Form>) => void }) {
  const verb = form.goal === "lose" ? "Lose" : "Gain";
  return (
    <Question title="How fast do you want to reach your goal?" subtitle={`${verb} weight speed per week`}>
      {PACES.map((kg) => (
        <OptionButton
          key={kg}
          label={formatWeight(kg, form.units, form.units === "imperial" ? 1 : 2)}
          sublabel={kg <= 0.25 ? "Slow and steady" : kg <= 0.5 ? "Recommended" : kg <= 0.75 ? "Faster" : "Aggressive — harder to sustain"}
          selected={form.weeklyRateKg === kg}
          onPress={() => set({ weeklyRateKg: kg })}
        />
      ))}
    </Question>
  );
}

function PlanStep({ profile }: { profile: Profile }) {
  const goals = computeGoals(profile);
  const date = projectedGoalDate(profile);
  return (
    <View style={{ gap: 16 }}>
      <Text style={{ fontSize: 44, textAlign: "center" }}>🎉</Text>
      <Text style={[s.title, { textAlign: "center" }]}>Your custom plan is ready!</Text>
      {date ? (
        <Text style={[s.subtitle, { textAlign: "center" }]}>
          You should reach {formatWeight(profile.targetWeightKg, profile.units)} by{" "}
          <Text style={{ fontWeight: "700", color: colors.text }}>{date.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}</Text>
        </Text>
      ) : (
        <Text style={[s.subtitle, { textAlign: "center" }]}>These targets keep you at your current weight.</Text>
      )}
      <Card style={{ gap: 14 }}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>Daily recommendation</Text>
        <Text style={s.subtitle}>You can edit this any time in Settings.</Text>
        <View style={s.planGrid}>
          <PlanTile label="Calories" value={`${goals.calories}`} color={colors.calories} />
          <PlanTile label="Carbs" value={`${goals.carbs}g`} color={colors.carbs} />
          <PlanTile label="Protein" value={`${goals.protein}g`} color={colors.protein} />
          <PlanTile label="Fats" value={`${goals.fat}g`} color={colors.fat} />
        </View>
      </Card>
    </View>
  );
}

function PlanTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={s.planTile}>
      <Text style={s.planLabel}>{label}</Text>
      <Ring size={88} stroke={7} progress={0.75} color={color}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>{value}</Text>
      </Ring>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 12, paddingTop: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  progressTrack: { flex: 1, height: 4, backgroundColor: colors.track, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, backgroundColor: colors.text },
  content: { padding: 24, paddingTop: 28, flexGrow: 1 },
  footer: { padding: 20, paddingBottom: 12 },
  title: { fontSize: 30, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: colors.muted, lineHeight: 22 },
  hint: { color: colors.danger, fontSize: 14 },
  toggle: { flexDirection: "row", backgroundColor: colors.track, borderRadius: 14, padding: 4, marginBottom: 8 },
  toggleItem: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  toggleItemOn: { backgroundColor: colors.primary },
  toggleText: { fontWeight: "600", color: colors.text },
  planGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 16 },
  planTile: { width: "48%", alignItems: "center", gap: 8, backgroundColor: colors.bg, borderRadius: 16, paddingVertical: 14 },
  planLabel: { fontSize: 14, fontWeight: "600", color: colors.muted },
});
