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
  // `secondFactor` is { totp_code } or { recovery_code }. It is sent only after
  // the server answered 401 with code "two_factor_required", in a second request
  // that repeats the email and password.
  login: (email, password, secondFactor = {}) =>
    client.post("/auth/login", {
      email,
      password,
      ...(secondFactor.totp_code ? { totp_code: secondFactor.totp_code } : {}),
      ...(secondFactor.recovery_code ? { recovery_code: secondFactor.recovery_code } : {}),
    }),
  verifyEmail: (email, otp) => client.post("/auth/verify-email", { email, otp }),
  resendVerificationOtp: (email) =>
    client.post("/auth/resend-verification-otp", { email }),
  logout: () => client.post("/auth/logout"),
  me: () => client.get("/auth/me"),
  acceptConsent: () => client.post("/auth/accept-consent"),
  setPushToken: (token) => client.put("/auth/push-token", { token }),
  // Permanent. The server removes the account and everything stored for it.
  deleteAccount: (password) => client.post("/auth/delete-account", { password }),

  // ── Account settings ──────────────────────────────────────────────────────
  // A wrong password on any of these is 403, never 401: a 401 means the session
  // is over.

  // { full_name?, phone? }. Send only what changed; phone null or "" clears it.
  updateProfile: (data) => client.put("/auth/profile", data),
  // Answers with NEW tokens, because it signs every other device out. The caller
  // must store them (see adoptNewTokens in src/lib/accountSession.js).
  changePassword: (currentPassword, newPassword) =>
    client.post("/auth/change-password", { current_password: currentPassword, new_password: newPassword }),
  // Same: new tokens in the answer; this device stays signed in.
  signOutEverywhere: () => client.post("/auth/sign-out-everywhere"),

  // A 6-digit code goes to the NEW address. users.email changes only when it is confirmed.
  requestEmailChange: (newEmail, password) =>
    client.post("/auth/email/change", { new_email: newEmail, password }),
  confirmEmailChange: (otp) => client.post("/auth/email/confirm", { otp }),
  cancelEmailChange: () => client.delete("/auth/email/change"),

  // Two-factor. `secondFactor` is { code } or { recovery_code }.
  twoFactorStatus: () => client.get("/auth/2fa"),
  twoFactorSetup: (password) => client.post("/auth/2fa/setup", { password }),
  twoFactorEnable: (code) => client.post("/auth/2fa/enable", { code }),
  twoFactorDisable: (password, secondFactor = {}) =>
    client.post("/auth/2fa/disable", { password, ...secondFactor }),
  newRecoveryCodes: (password, secondFactor = {}) =>
    client.post("/auth/2fa/recovery-codes", { password, ...secondFactor }),

  // Profile photo. `form` is a FormData with one field, "file" (JPG, PNG or WebP,
  // 5 MB at most). The upload can be slow on a mobile connection.
  uploadAvatar: (form) =>
    client.post("/auth/avatar", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    }),
  // { data_uri, avatar_updated_at }; 404 when there is no photo.
  getAvatar: () => client.get("/auth/avatar", { params: { format: "json" } }),
  deleteAvatar: () => client.delete("/auth/avatar"),

  // { items: [{ id, action, label, platform, created_at }] }, newest first.
  activity: (limit = 20) => client.get("/auth/activity", { params: { limit } }),
};

export const billingApi = {
  // { items: [...] }, newest first. Needs a verified account, not Pro access.
  history: () => client.get("/billing/history"),
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
