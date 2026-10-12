import {
  MAX_AVATAR_BYTES,
  avatarSizeProblem,
  cleanCode,
  errorCode,
  errorMessage,
  formatAmount,
  formatWhen,
  initialOf,
  isCompleteCode,
  isRecoveryCodeComplete,
  loginFailure,
  newPasswordProblem,
  normalizeRecoveryCode,
  platformLabel,
  recoveryCodesText,
  secondFactorBody,
  secondFactorReady,
  statusTone,
} from "../account";

// What axios rejects with when the server answered.
const answered = (status, data) => ({ isAxiosError: true, response: { status, data } });

describe("errorMessage", () => {
  test("shows the sentence the server sent", () => {
    expect(errorMessage(answered(403, { detail: "That password is not correct." }))).toBe(
      "That password is not correct.",
    );
  });

  test("a 422 carries a list, not a sentence, so the fallback is used", () => {
    const error = answered(422, { detail: [{ loc: ["body", "email"], msg: "value is not a valid email" }] });
    expect(errorMessage(error, "Try again.")).toBe("Try again.");
  });

  test("a request that got no answer is a connection problem", () => {
    expect(errorMessage({ isAxiosError: true, message: "Network Error" })).toMatch(/Check your connection/);
  });

  test("an error that is not a request failure gets the fallback", () => {
    expect(errorMessage(new TypeError("x is undefined"), "Something broke.")).toBe("Something broke.");
  });

  test("a 429 without a sentence still says to wait", () => {
    expect(errorMessage(answered(429, { error: "Rate limit exceeded" }))).toMatch(/Wait a minute/);
  });
});

describe("errorCode", () => {
  test("reads the code some errors carry", () => {
    expect(errorCode(answered(401, { detail: "x", code: "two_factor_required" }))).toBe("two_factor_required");
    expect(errorCode(answered(401, { detail: "x" }))).toBeNull();
    expect(errorCode(undefined)).toBeNull();
  });
});

describe("loginFailure", () => {
  test("401 with two_factor_required asks for the code", () => {
    const f = loginFailure(answered(401, { detail: "Enter the 6-digit code", code: "two_factor_required" }));
    expect(f.kind).toBe("required");
  });

  test("a wrong code is invalid and keeps the server's sentence", () => {
    const f = loginFailure(
      answered(401, { detail: "That code is not correct. Check your authenticator app and try again.", code: "two_factor_invalid" }),
    );
    expect(f).toEqual({
      kind: "invalid",
      message: "That code is not correct. Check your authenticator app and try again.",
    });
  });

  test("429 with two_factor_locked is a lock", () => {
    const f = loginFailure(answered(429, { detail: "Too many incorrect codes. Try again in 15 minutes.", code: "two_factor_locked" }));
    expect(f.kind).toBe("locked");
    expect(f.message).toBe("Too many incorrect codes. Try again in 15 minutes.");
  });

  test("a wrong password is 401 without a code and stays 'other'", () => {
    const f = loginFailure(answered(401, { detail: "Invalid email or password" }));
    expect(f).toEqual({ kind: "other", message: "Invalid email or password" });
  });

  test("the sign-in rate limit is not mistaken for a lock", () => {
    expect(loginFailure(answered(429, { detail: "Too many requests" })).kind).toBe("other");
  });
});

describe("codes", () => {
  test("cleanCode keeps six digits only", () => {
    expect(cleanCode("123 456")).toBe("123456");
    expect(cleanCode("12a3-4")).toBe("1234");
    expect(cleanCode("1234567890")).toBe("123456");
    expect(cleanCode(null)).toBe("");
  });

  test("isCompleteCode needs exactly six digits", () => {
    expect(isCompleteCode("123456")).toBe(true);
    expect(isCompleteCode("12345")).toBe(false);
    expect(isCompleteCode("12345a")).toBe(false);
  });

  test("recovery codes are compared without dashes, spaces or case", () => {
    expect(normalizeRecoveryCode(" ABCDE-fghjk ")).toBe("abcdefghjk");
    expect(isRecoveryCodeComplete("abcde-fghjk")).toBe(true);
    expect(isRecoveryCodeComplete("abcde fghjk")).toBe(true);
    expect(isRecoveryCodeComplete("abcde-fghj")).toBe(false);
  });

  test("secondFactorBody names the field the endpoint expects", () => {
    expect(secondFactorBody({ useRecovery: false, code: "123 456", codeKey: "totp_code" })).toEqual({ totp_code: "123456" });
    expect(secondFactorBody({ useRecovery: false, code: "123456" })).toEqual({ code: "123456" });
    expect(secondFactorBody({ useRecovery: true, recoveryCode: " abcde-fghjk ", code: "999999" })).toEqual({
      recovery_code: "abcde-fghjk",
    });
  });

  test("secondFactorReady follows the method in use", () => {
    expect(secondFactorReady({ useRecovery: false, code: "123456", recoveryCode: "" })).toBe(true);
    expect(secondFactorReady({ useRecovery: false, code: "12345", recoveryCode: "abcde-fghjk" })).toBe(false);
    expect(secondFactorReady({ useRecovery: true, code: "", recoveryCode: "abcde-fghjk" })).toBe(true);
    expect(secondFactorReady({ useRecovery: true, code: "123456", recoveryCode: "abc" })).toBe(false);
  });
});

describe("newPasswordProblem", () => {
  test("asks for each field in turn", () => {
    expect(newPasswordProblem({ current: "", next: "x", repeat: "x" })).toMatch(/current password/);
    expect(newPasswordProblem({ current: "old", next: "", repeat: "" })).toMatch(/new password/);
  });

  test("a short password uses the server's own wording", () => {
    expect(newPasswordProblem({ current: "old", next: "short", repeat: "short" })).toBe(
      "Password must be at least 8 characters",
    );
  });

  test("the repeat has to match", () => {
    expect(newPasswordProblem({ current: "old", next: "longenough1", repeat: "longenough2" })).toMatch(/do not match/);
  });

  test("a good password passes", () => {
    expect(newPasswordProblem({ current: "old", next: "longenough1", repeat: "longenough1" })).toBeNull();
  });
});

describe("recoveryCodesText", () => {
  test("lists one code per line under the account", () => {
    const text = recoveryCodesText(["aaaaa-bbbbb", "ccccc-ddddd"], "me@example.com");
    const lines = text.split("\n");
    expect(lines[0]).toBe("Peptora recovery codes");
    expect(lines[1]).toBe("Account: me@example.com");
    expect(lines).toContain("aaaaa-bbbbb");
    expect(lines).toContain("ccccc-ddddd");
  });

  test("uses plain punctuation only", () => {
    const text = recoveryCodesText(["aaaaa-bbbbb"], "me@example.com");
    expect(text).not.toMatch(/[–—→…]/);
  });
});

describe("display helpers", () => {
  test("platformLabel", () => {
    expect(platformLabel("web")).toBe("Web");
    expect(platformLabel("android")).toBe("Android");
    expect(platformLabel("ios")).toBe("iOS");
    expect(platformLabel("tv")).toBe("Tv");
    expect(platformLabel(null)).toBe("");
  });

  test("statusTone groups the billing statuses", () => {
    expect(["paid", "active"].map(statusTone)).toEqual(["good", "good"]);
    expect(statusTone("pending")).toBe("warn");
    expect(["rejected", "refunded"].map(statusTone)).toEqual(["bad", "bad"]);
    expect(["cancelled", "expired", "other"].map(statusTone)).toEqual(["muted", "muted", "muted"]);
  });

  test("formatAmount", () => {
    expect(formatAmount(29, "usd")).toBe("$29.00");
    expect(formatAmount("12.5", "USD")).toBe("$12.50");
    expect(formatAmount(10, "USDTX")).toBe("10.00 USDTX"); // not a currency code Intl accepts
    expect(formatAmount(10, null)).toBe("10.00");
    expect(formatAmount(null, "USD")).toBeNull();
    expect(formatAmount("abc", "USD")).toBeNull();
  });

  test("formatWhen shows the year and survives bad input", () => {
    expect(formatWhen("2026-10-08T12:00:00Z")).toMatch(/Oct 8, 2026/);
    expect(formatWhen("not a date")).toBe("");
    expect(formatWhen(null)).toBe("");
  });

  test("initialOf", () => {
    expect(initialOf("mobile@example.com")).toBe("M");
    expect(initialOf("")).toBe("?");
    expect(initialOf(undefined)).toBe("?");
  });
});

describe("avatarSizeProblem", () => {
  test("accepts anything up to 5 MB and unknown sizes", () => {
    expect(avatarSizeProblem(MAX_AVATAR_BYTES)).toBeNull();
    expect(avatarSizeProblem(undefined)).toBeNull();
  });

  test("refuses more than 5 MB with the server's wording", () => {
    expect(avatarSizeProblem(MAX_AVATAR_BYTES + 1)).toMatch(/^That image is larger than 5 MB\./);
  });
});
