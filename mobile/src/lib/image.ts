import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

export type PreparedImage = {
  /** JPEG, max 1024px wide, base64 without prefix - sent to the AI. */
  base64: string;
  /** Data URI preview shown while analyzing. */
  previewUri: string;
  /** Small data URI stored with the log entry. */
  thumb: string;
};

async function resizeToBase64(uri: string, width: number, compress: number): Promise<string> {
  const ref = await ImageManipulator.manipulate(uri).resize({ width }).renderAsync();
  const result = await ref.saveAsync({ base64: true, compress, format: SaveFormat.JPEG });
  if (!result.base64) throw new Error("Could not read the photo.");
  return result.base64.replace(/^data:image\/\w+;base64,/, "");
}

export async function prepareImage(uri: string, width: number): Promise<PreparedImage> {
  const base64 = await resizeToBase64(uri, Math.min(1024, width || 1024), 0.7);
  const thumbB64 = await resizeToBase64(uri, 160, 0.5);
  return {
    base64,
    previewUri: `data:image/jpeg;base64,${base64}`,
    thumb: `data:image/jpeg;base64,${thumbB64}`,
  };
}

/** Opens the camera (or library) and returns the picked asset, or null if cancelled. */
export async function pickImage(source: "camera" | "library"): Promise<ImagePicker.ImagePickerAsset | null> {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error("Camera permission is needed to scan food. Enable it in your phone's settings.");
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    return res.canceled ? null : res.assets[0];
  }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
  return res.canceled ? null : res.assets[0];
}
