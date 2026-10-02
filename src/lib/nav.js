/**
 * Close the modal on top of the stack (paywall, delete account, auth).
 * Falls back to going home when there is nothing underneath, which happens
 * when a modal was opened by a deep link.
 */
export function closeModal(router) {
  if (typeof router.canDismiss === "function" && router.canDismiss()) {
    router.dismiss();
  } else if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/(tabs)");
  }
}

/**
 * Leave the sign-in screens once a session exists. `user` is the session that
 * was just loaded.
 *
 * Log in, sign up and verify are modals over the rest of the app. Closing the
 * modal puts the person back where they were, now signed in: on the paywall
 * if that is where they were asked for an account, otherwise on their tab.
 * Replacing the modal with the tabs instead would stack a second copy of the
 * whole tab bar on top of the first one.
 *
 * A new account accepts the terms before anything else, so it goes to the
 * consent screen with nothing left underneath it.
 */
export function afterSignIn(router, user) {
  if (user && !user.consent_accepted) {
    if (typeof router.canDismiss === "function" && router.canDismiss()) router.dismissAll();
    router.replace("/consent");
    return;
  }
  closeModal(router);
}
