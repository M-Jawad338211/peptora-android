import { Platform } from "react-native";

// A fixed-width face for setup keys and recovery codes. theme.js names
// "Courier", which Android does not have and would draw in the normal face.
export const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });
