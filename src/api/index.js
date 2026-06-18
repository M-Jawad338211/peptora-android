import { Platform } from "react-native";
import client from "./client";

export const authApi = {
  register: (email, password, confirmPassword, fullName, deviceFingerprint) =>
    client.post("/auth/register", {
      email,
      password,
      confirm_password: confirmPassword,
      full_name: fullName,
      device_fingerprint: deviceFingerprint,
    }),
  login: (email, password) => client.post("/auth/login", { email, password }),
  verifyEmail: (email, otp) => client.post("/auth/verify-email", { email, otp }),
  resendVerificationOtp: (email) =>
    client.post("/auth/resend-verification-otp", { email }),
  logout: () => client.post("/auth/logout"),
  me: () => client.get("/auth/me"),
  acceptConsent: () => client.post("/auth/accept-consent"),
  setPushToken: (token) => client.put("/auth/push-token", { token }),
};

export const calculatorApi = {
  checkTrial: (deviceFingerprint, platform = Platform.OS) =>
    client.post("/calculator/check-trial", {
      device_fingerprint: deviceFingerprint,
      platform,
    }),
  recordUse: (data) => client.post("/calculator/record-use", data),
  getHistory: () => client.get("/calculator/history"),
  getStats: () => client.get("/calculator/stats"),
};

export const subscriptionsApi = {
  createCheckout: (plan) =>
    client.post("/subscriptions/create-checkout", { plan }),
  getStatus: () => client.get("/subscriptions/status"),
};

export const aiApi = {
  chat: (message, history = []) =>
    client.post("/ai/assistant", { message, conversation_history: history }),
  stackCheck: (peptides) => client.post("/ai/stack-check", { peptides }),
};

export const encyclopediaApi = {
  list: () => client.get('/peptides'),
  get: (id) => client.get(`/peptides/${id}`),
};

export const trackerApi = {
  getLogs: () => client.get("/tracker/logs"),
  addLog: (peptide_name, dose, notes) =>
    client.post("/tracker/logs", {
      peptide_name,
      dose,
      notes: notes || null,
      taken_at: new Date().toISOString(),
    }),
  deleteLog: (id) => client.delete(`/tracker/logs/${id}`),
};

export const protocolsApi = {
  create: (data) => client.post("/protocols", data),
  list: () => client.get("/protocols"),
  get: (id) => client.get(`/protocols/${id}`),
  update: (id, data) => client.patch(`/protocols/${id}`, data),
  delete: (id) => client.delete(`/protocols/${id}`),
  stats: () => client.get("/protocols/stats/summary"),
  // Dose logs scoped to a protocol
  addLog: (protocolId, data) => client.post(`/protocols/${protocolId}/logs`, data),
  getLogs: (protocolId) => client.get(`/protocols/${protocolId}/logs`),
  deleteLog: (protocolId, logId) => client.delete(`/protocols/${protocolId}/logs/${logId}`),
};
