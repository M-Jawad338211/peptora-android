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
  // Permanent. The server removes the account and everything stored for it.
  deleteAccount: (password) => client.post("/auth/delete-account", { password }),
};

export const calculatorApi = {
  recordUse: (data) => client.post("/calculator/record-use", data),
  getHistory: () => client.get("/calculator/history"),
  getStats: () => client.get("/calculator/stats"),
};

export const iapApi = {
  // Signed StoreKit transactions (JWS strings). The server verifies Apple's
  // signature on each one and replies with the account's access state.
  verifyApple: (transactions) =>
    client.post("/iap/apple/verify", { transactions }, { timeout: 30000 }),
};

export const encyclopediaApi = {
  list: () => client.get("/peptides"),
  get: (id) => client.get(`/peptides/${id}`),
};

export const stacksApi = {
  list: () => client.get("/stacks"),
  get: (id) => client.get(`/stacks/${id}`),
};

export const trackerApi = {
  // Every log entry on the account, newest first, across all protocols.
  getLogs: () => client.get("/tracker/logs"),
};

export const protocolsApi = {
  create: (data) => client.post("/protocols", data),
  list: () => client.get("/protocols"),
  get: (id) => client.get(`/protocols/${id}`),
  update: (id, data) => client.patch(`/protocols/${id}`, data),
  delete: (id) => client.delete(`/protocols/${id}`),
  stats: () => client.get("/protocols/stats/summary"),
  // Log entries scoped to a protocol
  addLog: (protocolId, data) => client.post(`/protocols/${protocolId}/logs`, data),
  getLogs: (protocolId) => client.get(`/protocols/${protocolId}/logs`),
  deleteLog: (protocolId, logId) => client.delete(`/protocols/${protocolId}/logs/${logId}`),
};
