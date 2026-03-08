import AsyncStorage from "@react-native-async-storage/async-storage";

export const DEMO_CURRENT_LOCATION_KEY = "@dailo/demo_current_location";

export type DemoLocation = { latitude: number; longitude: number };

export async function getDemoLocation(): Promise<DemoLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(DEMO_CURRENT_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoLocation;
    if (
      parsed &&
      Number.isFinite(parsed.latitude) &&
      Number.isFinite(parsed.longitude)
    ) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function setDemoLocation(lat: number, lng: number): Promise<void> {
  await AsyncStorage.setItem(
    DEMO_CURRENT_LOCATION_KEY,
    JSON.stringify({ latitude: lat, longitude: lng })
  );
}

export async function clearDemoLocation(): Promise<void> {
  await AsyncStorage.removeItem(DEMO_CURRENT_LOCATION_KEY);
}
