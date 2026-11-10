import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, radius, shadow } from "../lib/theme.ts";

export function Ring({
  size,
  stroke,
  progress,
  color,
  track = colors.track,
  children,
}: {
  size: number;
  stroke: number;
  progress: number;
  color: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - p)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === "primary" ? colors.primary : variant === "danger" ? "#FDECEC" : colors.card;
  const fg = variant === "primary" ? colors.primaryText : variant === "danger" ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        variant === "secondary" && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function OptionButton({
  label,
  sublabel,
  selected,
  onPress,
}: {
  label: string;
  sublabel?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.option, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}
    >
      <Text style={[styles.optionLabel, selected && { color: colors.primaryText }]}>{label}</Text>
      {sublabel ? <Text style={[styles.optionSub, selected && { color: "#C9C9D1" }]}>{sublabel}</Text> : null}
    </Pressable>
  );
}

export function Field({ label, suffix, ...props }: TextInputProps & { label?: string; suffix?: string }) {
  return (
    <View style={{ gap: 6, flex: 1 }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={styles.field}>
        <TextInput placeholderTextColor={colors.muted} style={styles.fieldInput} {...props} />
        {suffix ? <Text style={styles.fieldSuffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

/** A button that asks for a second tap before running a destructive action. */
export function ConfirmButton({ title, confirmTitle, onConfirm, style }: { title: string; confirmTitle: string; onConfirm: () => void; style?: StyleProp<ViewStyle> }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button
      title={armed ? confirmTitle : title}
      variant="danger"
      style={style}
      onPress={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    />
  );
}

/** Numeric input that keeps the raw text while typing (so "12." stays editable). */
export function NumberField({
  value,
  onChangeNumber,
  ...props
}: Omit<TextInputProps, "value" | "onChangeText"> & { label?: string; suffix?: string; value: number; onChangeNumber: (n: number) => void }) {
  const [text, setText] = useState(value ? String(Math.round(value * 10) / 10) : "");
  useEffect(() => {
    const parsed = parseFloat(text.replace(",", "."));
    if ((Number.isFinite(parsed) ? parsed : 0) !== value) setText(value ? String(Math.round(value * 10) / 10) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Field
      keyboardType="decimal-pad"
      {...props}
      value={text}
      onChangeText={(t) => {
        setText(t);
        const n = parseFloat(t.replace(",", "."));
        onChangeNumber(Number.isFinite(n) && n >= 0 ? n : 0);
      }}
    />
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
    ...shadow,
  },
  button: {
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  buttonText: { fontSize: 17, fontWeight: "600" },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  optionLabel: { fontSize: 17, fontWeight: "600", color: colors.text },
  optionSub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  fieldLabel: { fontSize: 14, color: colors.muted, fontWeight: "500" },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 54,
  },
  fieldInput: { flex: 1, fontSize: 18, color: colors.text, height: "100%" },
  fieldSuffix: { fontSize: 16, color: colors.muted, marginLeft: 6 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: 8, marginBottom: 10 },
});
