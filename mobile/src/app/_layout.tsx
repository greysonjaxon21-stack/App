import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StoreProvider, useStore } from "../lib/store.tsx";
import { colors } from "../lib/theme.ts";

function RootStack() {
  const { ready, profile } = useStore();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }
  const onboarded = !!profile;
  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: colors.bg }, contentStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text }}>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add" options={{ presentation: "modal", title: "Log food" }} />
        <Stack.Screen name="analyze" options={{ title: "Nutrition", headerBackTitle: "Back" }} />
        <Stack.Screen name="manual" options={{ presentation: "modal", title: "Log manually" }} />
        <Stack.Screen name="food/[id]" options={{ title: "Nutrition", headerBackTitle: "Back" }} />
        <Stack.Screen name="edit-profile" options={{ title: "Personal details", headerBackTitle: "Back" }} />
        <Stack.Screen name="edit-goals" options={{ title: "Adjust goals", headerBackTitle: "Back" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <RootStack />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
