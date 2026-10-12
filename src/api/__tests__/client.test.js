// The request and response logs must never print a secret. These are the keys
// the account settings and two-factor endpoints send or return.
jest.mock("expo-secure-store", () => ({}));
jest.mock("../../lib/queryClient", () => ({ queryClient: {} }));

import { SENSITIVE_KEYS, sanitizeBody } from "../client";

describe("log masking", () => {
  test("hides every secret of the account endpoints", () => {
    for (const key of [
      "current_password", "new_password", "password", "totp_code", "recovery_code", "code", "otp",
      "recovery_codes", "secret", "secret_grouped", "otpauth_uri", "qr_png_data_uri", "data_uri",
      "access_token", "refresh_token",
    ]) {
      expect(SENSITIVE_KEYS.has(key)).toBe(true);
    }
  });

  test("masks a login request that carries a code", () => {
    expect(sanitizeBody({ email: "a@example.com", password: "Password123", totp_code: "123456" })).toEqual({
      email: "a@example.com", password: "***", totp_code: "***",
    });
  });

  test("masks the setup response and the recovery codes", () => {
    const setup = sanitizeBody({
      secret: "ABCDEFGH", secret_grouped: "ABCD EFGH", otpauth_uri: "otpauth://totp/x?secret=ABCDEFGH",
      qr_png_data_uri: "data:image/png;base64,AAAA", issuer: "Peptora", account: "a@example.com",
    });
    expect(setup).toEqual({
      secret: "***", secret_grouped: "***", otpauth_uri: "***", qr_png_data_uri: "***",
      issuer: "Peptora", account: "a@example.com",
    });
    expect(sanitizeBody({ enabled: true, recovery_codes: ["aaaaa-bbbbb"] })).toEqual({
      enabled: true, recovery_codes: "***",
    });
  });

  test("masks the photo and the new tokens", () => {
    expect(sanitizeBody({ data_uri: "data:image/jpeg;base64,AAAA", avatar_updated_at: "2026-10-08T12:00:00Z" })).toEqual({
      data_uri: "***", avatar_updated_at: "2026-10-08T12:00:00Z",
    });
    expect(sanitizeBody({ message: "Password changed", access_token: "a", refresh_token: "b" })).toEqual({
      message: "Password changed", access_token: "***", refresh_token: "***",
    });
  });

  test("does not print the contents of an uploaded file", () => {
    const form = new FormData();
    form.append("file", "not really a file");
    expect(sanitizeBody(form)).toBe("[multipart form]");
  });
});
