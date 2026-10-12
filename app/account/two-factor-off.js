import { useState } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "../../src/api";
import { AuthGate } from "../../src/lib/auth";
import { errorMessage, secondFactorBody, secondFactorReady } from "../../src/lib/account";
import { closeScreen } from "../../src/lib/accountNav";
import { patchSession } from "../../src/lib/accountSession";
import ActionButton from "../../src/components/ActionButton";
import FormScreen, { Body, Title } from "../../src/components/FormScreen";
import Notice from "../../src/components/Notice";
import SecondFactorFields from "../../src/components/SecondFactorFields";

export default function TwoFactorOffScreen() {
  return (
    <AuthGate title="Log in to turn off two-factor authentication">
      {() => <TwoFactorOff />}
    </AuthGate>
  );
}

function TwoFactorOff() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await authApi.twoFactorDisable(
        password,
        secondFactorBody({ useRecovery, code, recoveryCode, codeKey: "code" }),
      );
      patchSession(queryClient, { two_factor_enabled: false });
      queryClient.invalidateQueries({ queryKey: ["account", "2fa"] });
      setPassword("");
      setCode("");
      setRecoveryCode("");
      setDone(true);
    } catch (e) {
      setError(errorMessage(e, "Two-factor authentication could not be turned off. Try again."));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <FormScreen>
        <Title>Two-factor authentication is off</Title>
        <Body>You will no longer be asked for a code when you log in. You can turn it on again at any time.</Body>
        <ActionButton label="Done" onPress={() => closeScreen(router)} style={{ marginTop: 24 }} />
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      <Title>Turn off two-factor authentication</Title>
      <Body>
        Your account will be protected by your password alone, and your recovery codes will stop working. Enter
        your password and a code to confirm.
      </Body>
      <SecondFactorFields
        password={password}
        onPasswordChange={(v) => { setPassword(v); setError(null); }}
        code={code}
        onCodeChange={(v) => { setCode(v); setError(null); }}
        recoveryCode={recoveryCode}
        onRecoveryCodeChange={(v) => { setRecoveryCode(v); setError(null); }}
        useRecovery={useRecovery}
        onToggleRecovery={() => { setUseRecovery((v) => !v); setError(null); }}
      />
      {error ? <Notice kind="error">{error}</Notice> : null}
      <ActionButton
        variant="danger"
        label="Turn off two-factor authentication"
        onPress={submit}
        busy={busy}
        disabled={!password || !secondFactorReady({ useRecovery, code, recoveryCode })}
        style={{ marginTop: 20 }}
      />
    </FormScreen>
  );
}
