import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "../../src/api";
import { AuthGate } from "../../src/lib/auth";
import { errorMessage } from "../../src/lib/account";
import { adoptNewTokens } from "../../src/lib/accountSession";
import { success } from "../../src/lib/haptics";
import ActionButton from "../../src/components/ActionButton";
import FormScreen, { Body, Title } from "../../src/components/FormScreen";
import Notice from "../../src/components/Notice";

export default function DevicesScreen() {
  return (
    <AuthGate title="Log in to manage your devices">
      {() => <Devices />}
    </AuthGate>
  );
}

function Devices() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const signOutOthers = async () => {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const res = await authApi.signOutEverywhere();
      // New tokens for this device; the old pair stopped working with the others.
      await adoptNewTokens(queryClient, res.data);
      setDone(true);
      success();
    } catch (e) {
      setError(errorMessage(e, "Your other devices could not be signed out. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormScreen>
      <Title>Other devices</Title>
      <Body>
        Signing out of your other devices ends every other session on this account, on the web and on other
        phones. This device stays signed in. Use it if you lost a phone, or logged in on a device you do not own.
      </Body>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {done ? <Notice kind="success">Signed out of your other devices.</Notice> : null}
      <ActionButton
        variant="danger"
        icon="log-out-outline"
        label="Sign out of all other devices"
        onPress={signOutOthers}
        busy={busy}
        style={{ marginTop: 20 }}
      />
    </FormScreen>
  );
}
