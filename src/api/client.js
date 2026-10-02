import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { logger } from "../lib/logger";
import { queryClient } from "../lib/queryClient";

const TAG = "API";
const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.peptora.io";
const IS_WEB = Platform.OS === "web";

const SENSITIVE_KEYS = new Set([
  "password", "confirm_password", "new_password", "otp", "token", "secret",
  "refresh_token", "access_token", "transactions",
]);

function sanitizeBody(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, SENSITIVE_KEYS.has(k) ? "***" : v])
  );
}

// The library endpoints return large payloads (100+ peptides, or a single
// peptide with dozens of nested benefits/risks/references/protocols).
// Dumping the full body on every fetch just floods the log, so log a short
// summary instead. Everything else is logged with its tokens masked, the same
// as request bodies.
function summarizeForLog(url, data) {
  if (!data) return data;
  if (!/\/(peptides|stacks)(\/|$)/.test(url || "")) return sanitizeBody(data);
  if (Array.isArray(data)) return `[${data.length} entries]`;
  if (typeof data === "object" && data.name) return `{entry: ${data.name}}`;
  return data;
}

// Endpoints whose 401 is a real answer rather than an expired token.
// Retrying these after a refresh would be meaningless at best and could
// resubmit a login at worst.
const NO_REFRESH_RETRY = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/verify-email",
  "/auth/resend-verification-otp",
  "/auth/logout",
];

const api = axios.create({
  baseURL: API_URL,
  // The native app authenticates with the Bearer token it stores, never with
  // cookies. Leaving cookie handling on would let a stale cookie from an
  // earlier account ride along with requests after the tokens were cleared.
  withCredentials: IS_WEB,
  timeout: 15000,
});

async function readItem(key) {
  if (IS_WEB) return sessionStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function writeItem(key, value) {
  if (IS_WEB) sessionStorage.setItem(key, value);
  else await SecureStore.setItemAsync(key, value);
}

async function removeItem(key) {
  if (IS_WEB) sessionStorage.removeItem(key);
  else await SecureStore.deleteItemAsync(key).catch(() => {});
}

export const saveTokens = async (access, refresh) => {
  await writeItem("access_token", access);
  if (refresh) await writeItem("refresh_token", refresh);
};

export const clearTokens = async () => {
  await removeItem("access_token");
  await removeItem("refresh_token");
};

export const getStoredToken = () => readItem("access_token");

/**
 * Single-flight token refresh.
 *
 * Access tokens last fifteen minutes. Without this the app signed people out
 * a quarter of an hour after login: the first expired token came back 401 and
 * the session was thrown away, even though the refresh token stored next to
 * it was good for thirty days.
 *
 * The guard is load-bearing. Home fires several queries at once, and an
 * expired token would otherwise start one refresh per query.
 *
 * Resolves to the new access token, to "invalid" when the server refused the
 * refresh token (the session really is over), or to "offline" when the
 * request never got an answer (keep the session and try again later).
 */
let refreshInFlight = null;

function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refresh = await readItem("refresh_token").catch(() => null);
      if (!refresh) return "invalid";
      try {
        // A bare axios call, not `api`, so it bypasses the interceptors below.
        const res = await axios.post(
          `${API_URL}/auth/refresh`,
          { refresh_token: refresh },
          { timeout: 15000, withCredentials: IS_WEB },
        );
        const access = res.data?.access_token;
        if (!access) return "invalid";
        await writeItem("access_token", access);
        return access;
      } catch (e) {
        return e.response ? "invalid" : "offline";
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

api.interceptors.request.use(async (config) => {
  config.metadata = { startTime: Date.now() };
  try {
    const token = await getStoredToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  config.headers["X-Platform"] = Platform.OS;

  const url = (config.baseURL || "") + (config.url || "");
  let body;
  try {
    body = config.data
      ? sanitizeBody(typeof config.data === "string" ? JSON.parse(config.data) : config.data)
      : undefined;
  } catch {
    body = undefined;
  }

  logger.info(TAG, `→ ${config.method?.toUpperCase()} ${url}`, body ?? "");

  return config;
});

api.interceptors.response.use(
  (response) => {
    const duration = Date.now() - (response.config.metadata?.startTime ?? Date.now());
    const { method, url, baseURL } = response.config;
    logger.info(
      TAG,
      `← ${response.status} ${method?.toUpperCase()} ${baseURL}${url} (${duration}ms)`,
      summarizeForLog(url, response.data),
    );
    return response;
  },
  async (err) => {
    const original = err.config ?? {};
    const duration = Date.now() - (original.metadata?.startTime ?? Date.now());
    const { method, url, baseURL } = original;
    const status = err.response?.status;

    if (err.response) {
      logger.warn(
        TAG,
        `✗ ${status} ${method?.toUpperCase()} ${baseURL}${url} (${duration}ms)`,
        summarizeForLog(url, err.response.data),
      );
    } else {
      logger.error(TAG, `✗ ${method?.toUpperCase()} ${baseURL}${url} (${duration}ms): ${err.message}`);
    }

    if (status === 401 && !original._retried && !NO_REFRESH_RETRY.includes(url)) {
      original._retried = true;
      const result = await refreshAccessToken();
      if (result !== "invalid" && result !== "offline") {
        // The request interceptor attaches the freshly stored token.
        return api(original);
      }
      if (result === "invalid") {
        // The server refused the refresh token: this session is over. Drop
        // the tokens and tell the screens, so they show their signed-out
        // state instead of a list of failed requests.
        await clearTokens();
        queryClient.setQueryData(["auth", "session"], null);
      }
    }

    if (status === 402) {
      // The server says this account has no Peptora Pro access right now, so
      // whatever the app has cached about the session is out of date. Refetch
      // it and the screens re-gate themselves.
      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
    }

    return Promise.reject(err);
  },
);

export default api;
