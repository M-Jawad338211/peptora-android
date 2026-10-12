import { useQuery } from "@tanstack/react-query";
import { authApi } from "../api";
import { saveTokens } from "../api/client";
import { AUTH_SESSION_KEY, invalidateAuthSession } from "./auth";

/** Merge fields into the cached session, so every screen shows them at once. */
export function patchSession(queryClient, patch) {
  queryClient.setQueryData(AUTH_SESSION_KEY, (user) => (user ? { ...user, ...patch } : user));
}

/**
 * Changing the password and "sign out other devices" end every OTHER session by
 * moving the account's token version on, and answer with new tokens for this
 * one. They have to be stored: the old pair no longer works, and the app would
 * sign itself out on its next request. The session is then fetched again with
 * the new token, which also puts right anything a request that was in flight
 * during the change reported as "signed out".
 */
export async function adoptNewTokens(queryClient, data) {
  if (data?.access_token) await saveTokens(data.access_token, data.refresh_token);
  await invalidateAuthSession(queryClient);
}

/**
 * The profile photo as a data URI, or null. Cached under a key that holds
 * `avatar_updated_at`, so a new photo is fetched once and an unchanged one is
 * never fetched again.
 */
export function useAvatarUri(user) {
  const stamp = user?.avatar_updated_at ?? null;
  const { data } = useQuery({
    queryKey: ["avatar", stamp],
    queryFn: () => authApi.getAvatar().then((r) => r.data?.data_uri ?? null),
    enabled: !!user && !!stamp,
    staleTime: Infinity,
    retry: (count, error) => error?.response?.status !== 404 && count < 1,
  });
  return stamp ? data ?? null : null;
}
