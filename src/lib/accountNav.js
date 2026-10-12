/**
 * Leave a settings screen that was pushed from the Profile tab. Goes back one
 * screen, and falls back to the Profile tab when the screen was opened
 * directly (a deep link, or a reload in the browser build) and has nothing
 * underneath it.
 */
export function closeScreen(router) {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)/profile");
}
