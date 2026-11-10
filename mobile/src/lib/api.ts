import type { Analysis } from "./types.ts";

export type AnalyzeRequest = {
  imageBase64?: string;
  mediaType?: "image/jpeg";
  description?: string;
  correction?: string;
  previous?: Analysis;
};

export async function analyzeFood(apiUrl: string, appToken: string, body: AnalyzeRequest): Promise<Analysis> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  let res: Response;
  try {
    res = await fetch(`${apiUrl}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(appToken ? { "X-App-Token": appToken } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error("The analysis took too long. Please try again.");
    throw new Error(`Can't reach the Plately server at ${apiUrl}. Check the server address in Settings.`);
  } finally {
    clearTimeout(timer);
  }
  let json: { analysis?: Analysis; error?: string } = {};
  try {
    json = await res.json();
  } catch {
    // fall through to the generic error below
  }
  if (!res.ok || !json.analysis) {
    throw new Error(json.error ?? `Server error (${res.status}).`);
  }
  return json.analysis;
}

export async function checkServer(apiUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiUrl}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
