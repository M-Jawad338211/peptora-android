import { colors } from "./theme";
import { COPY, IAP_SKUS } from "./config";
import { dateOnly } from "./format";

/** One line that says what the account has, in plain words. */
export function planSummary(access) {
  if (!access) return { label: "Free", detail: null, color: colors.tx3 };
  if (access.is_revoked) return { label: "Pro turned off", detail: null, color: colors.red };
  if (access.is_lifetime) return { label: "Pro, lifetime", detail: "Nothing to renew", color: colors.teal };
  if (access.is_subscription) {
    const yearly = access.subscription_product === IAP_SKUS.yearly;
    const monthly = access.subscription_product === IAP_SKUS.monthly;
    const name = yearly ? "Pro, yearly" : monthly ? "Pro, monthly" : "Pro";
    const when = access.subscription_expires_at ? dateOnly(access.subscription_expires_at) : null;
    const detail = when
      ? `${access.subscription_auto_renew === false ? "Ends" : "Renews"} ${when}`
      : null;
    return { label: access.subscription_is_trial ? `${name} (free trial)` : name, detail, color: colors.teal };
  }
  if (access.is_trial) {
    const d = access.days_remaining;
    return {
      label: "Pro, account trial",
      detail: d == null ? null : d === 0 ? "Ends today" : `${d} day${d === 1 ? "" : "s"} left`,
      color: colors.teal,
    };
  }
  if (access.has_access) return { label: "Pro", detail: null, color: colors.teal };
  return { label: "Free", detail: COPY.freeTier, color: colors.tx3 };
}
