import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { logger } from "../lib/logger";

const TAG = "API";
const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.peptora.io";

const SENSITIVE_KEYS = new Set(["password", "confirm_password", "new_password", "otp", "token", "secret"]);

function sanitizeBody(data) {
  if (!data || typeof data !== "object") return data;
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, SENSITIVE_KEYS.has(k) ? "***" : v])
  );
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  config.metadata = { startTime: Date.now() };
  try {
    const token =
      Platform.OS === "web"
        ? sessionStorage.getItem("access_token")
        : await SecureStore.getItemAsync("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}

  const url = (config.baseURL || "") + (config.url || "");
  const body = config.data ? sanitizeBody(
    typeof config.data === "string" ? JSON.parse(config.data) : config.data
  ) : undefined;

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
      response.data,
    );
    return response;
  },
  async (err) => {
    const duration = Date.now() - (err.config?.metadata?.startTime ?? Date.now());
    const { method, url, baseURL } = err.config ?? {};
    if (err.response) {
      logger.warn(
        TAG,
        `✗ ${err.response.status} ${method?.toUpperCase()} ${baseURL}${url} (${duration}ms)`,
        err.response.data,
      );
      if (err.response.status === 401) await clearTokens();
    } else {
      logger.error(TAG, `✗ ${method?.toUpperCase()} ${baseURL}${url} (${duration}ms) — ${err.message}`);
    }
    return Promise.reject(err);
  },
);

export const saveTokens = async (access, refresh) => {
  if (Platform.OS === "web") {
    sessionStorage.setItem("access_token", access);
    sessionStorage.setItem("refresh_token", refresh);
  } else {
    await SecureStore.setItemAsync("access_token", access);
    await SecureStore.setItemAsync("refresh_token", refresh);
  }
};

export const clearTokens = async () => {
  if (Platform.OS === "web") {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
  } else {
    await SecureStore.deleteItemAsync("access_token").catch(() => {});
    await SecureStore.deleteItemAsync("refresh_token").catch(() => {});
  }
};

export const getStoredToken = async () => {
  if (Platform.OS === "web") return sessionStorage.getItem("access_token");
  return SecureStore.getItemAsync("access_token");
};

export default api;
