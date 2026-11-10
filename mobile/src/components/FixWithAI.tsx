import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius } from "../lib/theme.ts";
import { Button, Card } from "./ui";

/** "Fix results" box: the user explains what's wrong and the AI re-estimates. */
export function FixWithAI({ onSubmit, loading }: { onSubmit: (correction: string) => void; loading: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  if (!open) {
    return <Button title="✨ Fix results" variant="secondary" onPress={() => setOpen(true)} />;
  }
  return (
    <Card style={{ gap: 10 }}>
      <Text style={s.title}>What needs fixing?</Text>
      <Text style={s.sub}>e.g. “It was a large portion”, “No cheese”, “The drink was diet soda”.</Text>
      <TextInput
        autoFocus
        multiline
        value={text}
        onChangeText={setText}
        placeholder="Describe the correction"
        placeholderTextColor={colors.muted}
        style={s.input}
      />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setOpen(false)} />
        <Button
          title="Update"
          style={{ flex: 1 }}
          loading={loading}
          disabled={!text.trim()}
          onPress={() => {
            onSubmit(text.trim());
            setText("");
            setOpen(false);
          }}
        />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  sub: { fontSize: 13, color: colors.muted },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: "top",
  },
});
