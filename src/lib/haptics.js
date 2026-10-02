import { Platform } from "react-native";

// Haptics are a nicety. Every call here is wrapped so that a device without a
// taptic engine, a simulator, or a build made before expo-haptics was added
// simply stays silent instead of throwing.
let Haptics = null;
if (Platform.OS === "ios" || Platform.OS === "android") {
  try {
    Haptics = require("expo-haptics");
  } catch {
    Haptics = null;
  }
}

function run(fn) {
  if (!Haptics) return;
  try {
    const result = fn();
    if (result && typeof result.catch === "function") result.catch(() => {});
  } catch {
    // Intentionally silent.
  }
}

/** A light tick, for a value passing a mark while dragging or holding. */
export function tick() {
  run(() => Haptics.selectionAsync());
}

/** A soft tap, for the start of a press-and-hold. */
export function tap() {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** The "done" pattern, when a hold completes or something is saved. */
export function success() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** The "careful" pattern, for a destructive action completing. */
export function warning() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
