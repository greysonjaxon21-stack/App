import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { computeGoals, dayKey } from "./nutrition.ts";
import type { FoodEntry, Goals, Profile, Settings, WeightEntry } from "./types.ts";

const KEY = "plately:v1";

type Data = {
  profile: Profile | null;
  goals: Goals | null;
  entries: FoodEntry[];
  weights: WeightEntry[];
  settings: Settings;
};

/**
 * Default API URL. Uses EXPO_PUBLIC_API_URL when set; in development falls back to the
 * machine running the Expo dev server on port 8787 so a phone on the same Wi-Fi just works.
 */
export function defaultApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];
  if (host) return `http://${host}:8787`;
  return "http://localhost:8787";
}

const empty: Data = {
  profile: null,
  goals: null,
  entries: [],
  weights: [],
  settings: { apiUrl: "", appToken: process.env.EXPO_PUBLIC_APP_TOKEN ?? "" },
};

type Store = Data & {
  ready: boolean;
  apiUrl: string;
  completeOnboarding: (profile: Profile) => void;
  updateProfile: (profile: Profile, recalcGoals: boolean) => void;
  setGoals: (goals: Goals) => void;
  addEntry: (entry: Omit<FoodEntry, "id" | "loggedAt">) => FoodEntry;
  updateEntry: (id: string, patch: Partial<FoodEntry>) => void;
  deleteEntry: (id: string) => void;
  logWeight: (kg: number, date?: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

export function thumbKey(id: string) {
  return `plately:thumb:${id}`;
}

/** Loads an entry's thumbnail data URI (or null). */
export function useThumb(entry: Pick<FoodEntry, "id" | "hasThumb">): string | null {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    if (!entry.hasThumb) return;
    let alive = true;
    AsyncStorage.getItem(thumbKey(entry.id)).then((v) => alive && setUri(v)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [entry.id, entry.hasThumb]);
  return uri;
}

function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(empty);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Data>;
          setData({ ...empty, ...parsed, settings: { ...empty.settings, ...parsed.settings } });
        }
      })
      .catch((e) => console.warn("Failed to load data", e))
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, []);

  // Persist after every change once the initial load is done.
  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify(data)).catch((e) => console.warn("Failed to save data", e));
  }, [data]);

  const completeOnboarding = useCallback((profile: Profile) => {
    setData((d) => ({
      ...d,
      profile: { ...profile, startWeightKg: profile.weightKg },
      goals: computeGoals(profile),
      weights: [...d.weights.filter((w) => w.date !== dayKey(new Date())), { date: dayKey(new Date()), kg: profile.weightKg }],
    }));
  }, []);

  const updateProfile = useCallback((profile: Profile, recalcGoals: boolean) => {
    setData((d) => ({ ...d, profile, goals: recalcGoals || !d.goals ? computeGoals(profile) : d.goals }));
  }, []);

  const setGoals = useCallback((goals: Goals) => setData((d) => ({ ...d, goals })), []);

  const addEntry = useCallback((entry: Omit<FoodEntry, "id" | "loggedAt">) => {
    const { thumb, ...rest } = entry;
    const full: FoodEntry = { ...rest, id: newId(), loggedAt: new Date().toISOString(), hasThumb: !!thumb };
    // Thumbnails live under their own keys so the main record stays small.
    if (thumb) AsyncStorage.setItem(thumbKey(full.id), thumb).catch(() => {});
    setData((d) => ({ ...d, entries: [full, ...d.entries] }));
    return full;
  }, []);

  const updateEntry = useCallback((id: string, patch: Partial<FoodEntry>) => {
    setData((d) => ({ ...d, entries: d.entries.map((e) => (e.id === id ? { ...e, ...patch, id } : e)) }));
  }, []);

  const deleteEntry = useCallback((id: string) => {
    AsyncStorage.removeItem(thumbKey(id)).catch(() => {});
    setData((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));
  }, []);

  const logWeight = useCallback((kg: number, date = dayKey(new Date())) => {
    setData((d) => {
      const weights = [...d.weights.filter((w) => w.date !== date), { date, kg }].sort((a, b) => a.date.localeCompare(b.date));
      const latest = weights[weights.length - 1];
      // Keep the profile's current weight in sync with the most recent log.
      const profile = d.profile && latest ? { ...d.profile, weightKg: latest.kg } : d.profile;
      return { ...d, weights, profile };
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, []);

  const resetAll = useCallback(async () => {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith("plately:")));
    setData(empty);
  }, []);

  const value = useMemo<Store>(
    () => ({
      ...data,
      ready,
      apiUrl: (data.settings.apiUrl || defaultApiUrl()).replace(/\/$/, ""),
      completeOnboarding,
      updateProfile,
      setGoals,
      addEntry,
      updateEntry,
      deleteEntry,
      logWeight,
      updateSettings,
      resetAll,
    }),
    [data, ready, completeOnboarding, updateProfile, setGoals, addEntry, updateEntry, deleteEntry, logWeight, updateSettings, resetAll],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}
