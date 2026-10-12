// Pure helpers for the account settings screens and the two-factor sign-in
// step. No React, no network and no native modules, so each one is easy to test.

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const NETWORK_MESSAGE = "Could not reach Peptora. Check your connection and try again.";

/**
 * The sentence to show for a failed request: the server's own `detail` when it
 * sent one. A 422 carries a list instead of a sentence, so it gets the
 * fallback, and so does anything that is not a request failure.
 */
export function errorMessage(error, fallback = "Something went wrong. Try again.") {
  const response = error?.response;
  if (!response) return error?.isAxiosError ? NETWORK_MESSAGE : fallback;
  const detail = response.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (response.status === 429) return "Too many attempts. Wait a minute and try again.";
  return fallback;
}

/** The machine-readable `code` some errors carry (two_factor_required and so on). */
export function errorCode(error) {
  const code = error?.response?.data?.code;
  return typeof code === "string" ? code : null;
}

/**
 * What a failed POST /auth/login means for the sign-in screen.
 *   required: the account has two-factor on; ask for the code
 *   invalid:  the code was wrong
 *   locked:   too many wrong codes (429)
 *   other:    anything else (wrong password, offline, ...)
 */
export function loginFailure(error) {
  const status = error?.response?.status;
  const code = errorCode(error);
  if (status === 401 && code === "two_factor_required") return { kind: "required", message: null };
  if (status === 401 && code === "two_factor_invalid") {
    return { kind: "invalid", message: errorMessage(error, "That code is not correct.") };
  }
  if (status === 429 && code === "two_factor_locked") {
    return { kind: "locked", message: errorMessage(error, "Too many incorrect codes. Try again later.") };
  }
  return { kind: "other", message: errorMessage(error, "Invalid credentials") };
}

/** Digits only and at most six, so a pasted "123 456" still works. */
export function cleanCode(text) {
  return String(text ?? "").replace(/\D/g, "").slice(0, 6);
}

export function isCompleteCode(text) {
  return /^\d{6}$/.test(String(text ?? ""));
}

/** A recovery code without spaces and dashes, lower case. */
export function normalizeRecoveryCode(text) {
  return String(text ?? "").replace(/[\s-]/g, "").toLowerCase();
}

/** Ten characters, whatever the separators: "abcde-fghjk" or "abcde fghjk". */
export function isRecoveryCodeComplete(text) {
  return normalizeRecoveryCode(text).length >= 10;
}

/**
 * The body fields that carry the second factor. `codeKey` is the name the
 * endpoint uses for the authenticator code: totp_code at sign-in, code on the
 * two-factor settings endpoints.
 */
export function secondFactorBody({ useRecovery, code, recoveryCode, codeKey = "code" }) {
  if (useRecovery) return { recovery_code: String(recoveryCode ?? "").trim() };
  return { [codeKey]: cleanCode(code) };
}

export function secondFactorReady({ useRecovery, code, recoveryCode }) {
  return useRecovery ? isRecoveryCodeComplete(recoveryCode) : isCompleteCode(cleanCode(code));
}

/** The first thing wrong with a new password, or null. The server checks again. */
export function newPasswordProblem({ current, next, repeat }) {
  if (!current) return "Enter your current password.";
  if (!next) return "Enter a new password.";
  if (next.length < 8) return "Password must be at least 8 characters";
  if (next !== repeat) return "The new passwords do not match.";
  return null;
}

/** The text that is shared or copied: one code per line. */
export function recoveryCodesText(codes, email) {
  const lines = ["Peptora recovery codes"];
  if (email) lines.push(`Account: ${email}`);
  lines.push("", ...(codes ?? []), "", "Each code works once. Keep them somewhere safe.");
  return lines.join("\n");
}

const PLATFORMS = { web: "Web", android: "Android", ios: "iOS" };

export function platformLabel(platform) {
  if (!platform) return "";
  const key = String(platform).toLowerCase();
  return PLATFORMS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/** How a billing status is coloured: good, warn, bad or muted. The text comes from the server. */
export function statusTone(status) {
  switch (status) {
    case "paid":
    case "active":
      return "good";
    case "pending":
      return "warn";
    case "rejected":
    case "refunded":
      return "bad";
    default:
      return "muted";
  }
}

/** "$29.00", or "29.00 USDT" when the currency is not one Intl knows; null without an amount. */
export function formatAmount(amount, currency) {
  if (amount == null || amount === "" || !Number.isFinite(Number(amount))) return null;
  const value = Number(amount);
  const code = currency ? String(currency).toUpperCase() : null;
  if (code) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(value);
    } catch {
      return `${value.toFixed(2)} ${code}`;
    }
  }
  return value.toFixed(2);
}

/** "Oct 8, 2026, 9:15 PM" in the phone's time zone. */
export function formatWhen(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

/** The reason an image is too big for the server, or null. */
export function avatarSizeProblem(bytes) {
  if (typeof bytes === "number" && bytes > MAX_AVATAR_BYTES) {
    return "That image is larger than 5 MB. Choose a smaller one.";
  }
  return null;
}

/** The letter shown when there is no photo. */
export function initialOf(email) {
  const first = String(email ?? "").trim().charAt(0);
  return first ? first.toUpperCase() : "?";
}
