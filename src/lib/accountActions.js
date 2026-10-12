import { Alert, Linking, Platform, Share } from "react-native";

/**
 * Ask before something that cannot be taken back. Alert.alert does nothing on
 * the web build, so there it falls back to the browser's own dialog.
 * Resolves to true when the person confirms.
 */
export function confirmAction({ title, message, confirmText = "OK", cancelText = "Cancel", destructive = false }) {
  if (Platform.OS === "web") {
    const ask = typeof window !== "undefined" && typeof window.confirm === "function" ? window.confirm : null;
    return Promise.resolve(ask ? ask.call(window, message ? `${title}\n\n${message}` : title) : false);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: "cancel", onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

// No clipboard module is installed (and none may be added), so on a phone
// "copy" is the system share sheet, which has a Copy action of its own. The
// browser build can copy directly.
export const COPY_LABEL = Platform.OS === "web" ? "Copy" : "Copy or share";

/**
 * Put text on the clipboard (web) or open the share sheet (phones).
 * Resolves to "copied", "shared", "dismissed" or "failed".
 */
export async function copyOrShare(text, title) {
  if (Platform.OS === "web") {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return "copied";
      }
    } catch {
      // fall through to the share sheet
    }
  }
  try {
    const result = await Share.share({ message: text, title });
    return result?.action === Share.dismissedAction ? "dismissed" : "shared";
  } catch {
    return "failed";
  }
}

/** Open the authenticator app on this phone through the otpauth:// link. False when nothing can. */
export async function openAuthenticator(uri) {
  try {
    await Linking.openURL(uri);
    return true;
  } catch {
    return false;
  }
}

/**
 * The multipart body for POST /auth/avatar. On a phone the picker gives a file
 * uri, which React Native uploads as it is; in the browser the file itself (or
 * a blob read from its uri) is attached.
 */
export async function buildAvatarForm(asset) {
  const form = new FormData();
  const type = asset.mimeType || "image/jpeg";
  const name = asset.fileName || (type === "image/png" ? "photo.png" : "photo.jpg");
  if (Platform.OS === "web") {
    const blob = asset.file ?? (await (await fetch(asset.uri)).blob());
    form.append("file", blob, name);
  } else {
    form.append("file", { uri: asset.uri, name, type });
  }
  return form;
}
