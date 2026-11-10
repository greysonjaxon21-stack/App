import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../lib/theme.ts";
import type { FoodItem } from "../lib/types.ts";
import { Card, Field, NumberField } from "./ui";

export type Draft = {
  name: string;
  servings: number;
  /** Per-serving values. */
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  healthScore?: number;
  items?: FoodItem[];
  notes?: string;
};

export function NutritionEditor({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  const total = (n: number) => Math.round(n * draft.servings);

  return (
    <View style={{ gap: 14 }}>
      <Field label="Name" value={draft.name} onChangeText={(name) => set({ name })} placeholder="Meal name" />

      <View style={s.servingsRow}>
        <Text style={s.servingsLabel}>Servings</Text>
        <View style={s.stepper}>
          <Pressable
            accessibilityLabel="Decrease servings"
            onPress={() => set({ servings: Math.max(0.5, draft.servings - 0.5) })}
            style={s.stepBtn}
          >
            <Text style={s.stepText}>−</Text>
          </Pressable>
          <Text style={s.servings}>{draft.servings}</Text>
          <Pressable accessibilityLabel="Increase servings" onPress={() => set({ servings: draft.servings + 0.5 })} style={s.stepBtn}>
            <Text style={s.stepText}>+</Text>
          </Pressable>
        </View>
      </View>

      <Card style={s.calCard}>
        <Text style={s.calIcon}>🔥</Text>
        <View>
          <Text style={s.calLabel}>Calories</Text>
          <Text style={s.calValue}>{total(draft.calories)}</Text>
        </View>
      </Card>

      <View style={s.macroRow}>
        <MacroTotal label="Protein" color={colors.protein} value={total(draft.protein)} />
        <MacroTotal label="Carbs" color={colors.carbs} value={total(draft.carbs)} />
        <MacroTotal label="Fats" color={colors.fat} value={total(draft.fat)} />
      </View>

      {draft.healthScore != null ? (
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={s.hsLabel}>💚 Health score</Text>
            <Text style={s.hsLabel}>{draft.healthScore}/10</Text>
          </View>
          <View style={s.bar}>
            <View
              style={[
                s.barFill,
                {
                  width: `${draft.healthScore * 10}%`,
                  backgroundColor: draft.healthScore >= 7 ? colors.accent : draft.healthScore >= 4 ? colors.carbs : colors.danger,
                },
              ]}
            />
          </View>
        </Card>
      ) : null}

      {draft.items && draft.items.length > 0 ? (
        <Card style={{ gap: 10 }}>
          <Text style={s.hsLabel}>Ingredients</Text>
          {draft.items.map((it, i) => (
            <View key={i} style={s.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemName}>{it.name}</Text>
                <Text style={s.itemSub}>
                  {it.quantity} · P {it.protein_g}g · C {it.carbs_g}g · F {it.fat_g}g
                </Text>
              </View>
              <Text style={s.itemCal}>{Math.round(it.calories)} kcal</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {draft.notes ? <Text style={s.notes}>{draft.notes}</Text> : null}

      <Text style={s.editTitle}>Edit per serving</Text>
      <View style={s.grid}>
        <NumberField label="Calories" value={draft.calories} onChangeNumber={(calories) => set({ calories })} suffix="kcal" />
        <NumberField label="Protein" value={draft.protein} onChangeNumber={(protein) => set({ protein })} suffix="g" />
      </View>
      <View style={s.grid}>
        <NumberField label="Carbs" value={draft.carbs} onChangeNumber={(carbs) => set({ carbs })} suffix="g" />
        <NumberField label="Fats" value={draft.fat} onChangeNumber={(fat) => set({ fat })} suffix="g" />
      </View>
    </View>
  );
}

function MacroTotal({ label, color, value }: { label: string; color: string; value: number }) {
  return (
    <Card style={s.macroCard}>
      <Text style={[s.macroLabel, { color }]}>● {label}</Text>
      <Text style={s.macroValue}>{value}g</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  servingsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  servingsLabel: { fontSize: 16, fontWeight: "600", color: colors.text },
  stepper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 24, backgroundColor: colors.card },
  stepBtn: { width: 44, height: 40, alignItems: "center", justifyContent: "center" },
  stepText: { fontSize: 22, color: colors.text },
  servings: { minWidth: 36, textAlign: "center", fontSize: 17, fontWeight: "600" },
  calCard: { flexDirection: "row", alignItems: "center", gap: 14 },
  calIcon: { fontSize: 30 },
  calLabel: { fontSize: 14, color: colors.muted },
  calValue: { fontSize: 32, fontWeight: "800", color: colors.text },
  macroRow: { flexDirection: "row", gap: 10 },
  macroCard: { flex: 1, padding: 14 },
  macroLabel: { fontSize: 13, fontWeight: "600" },
  macroValue: { fontSize: 20, fontWeight: "700", marginTop: 4, color: colors.text },
  hsLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
  bar: { height: 8, backgroundColor: colors.track, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  itemName: { fontSize: 15, fontWeight: "500", color: colors.text },
  itemSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  itemCal: { fontSize: 14, fontWeight: "600", color: colors.text },
  notes: { fontSize: 13, color: colors.muted, lineHeight: 18, paddingHorizontal: 4 },
  editTitle: { fontSize: 15, fontWeight: "600", color: colors.muted, marginTop: 6 },
  grid: { flexDirection: "row", gap: 10 },
});

