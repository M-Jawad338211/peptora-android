import { useState } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "../../src/api";
import { AuthGate } from "../../src/lib/auth";
import { errorMessage, secondFactorBody, secondFactorReady } from "../../src/lib/account";
import { closeScreen } from "../../src/lib/accountNav";
import { success } from "../../src/lib/haptics";
import ActionButton from "../../src/components/ActionButton";
import FormScreen, { Body, Title } from "../../src/components/FormScreen";
import Notice from "../../src/components/Notice";
import RecoveryCodesPanel from "../../src/components/RecoveryCodesPanel";
import SecondFactorFields from "../../src/components/SecondFactorFields";

export default function RecoveryCodesScreen() {
  return (
    <AuthGate title="Log in to get new recovery codes">
      {(user) => <RecoveryCodes user={user} />}
    </AuthGate>
  );
}

function RecoveryCodes({ user }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [codes, setCodes] = useState(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.newRecoveryCodes(
        password,
        secondFactorBody({ useRecovery, code, recoveryCode, codeKey: "code" }),
      );
      setCodes(res.data.recovery_codes ?? []);
      setPassword("");
      setCode("");
      setRecoveryCode("");
      queryClient.invalidateQueries({ queryKey: ["account", "2fa"] });
      success();
    } catch (e) {
      // A wrong password (403), a wrong code (400) or a lock (429): the
      // server's sentence is shown and the fields keep what was typed.
      setError(errorMessage(e, "New codes could not be created. Try again."));
    } finally {
      setBusy(false);
    }
  };

  if (codes) {
    return (
      <FormScreen>
        <Title>Your new recovery codes</Title>
        <Body>The old codes no longer work.</Body>
        <RecoveryCodesPanel codes={codes} email={user.email} onDone={() => closeScreen(router)} />
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      <Title>Get new recovery codes</Title>
      <Body>
        This creates 10 new codes. The old ones stop working, whether you used them or not. Enter your password
        and a code to confirm.
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
        label="Get new recovery codes"
        onPress={submit}
        busy={busy}
        disabled={!password || !secondFactorReady({ useRecovery, code, recoveryCode })}
        style={{ marginTop: 20 }}
      />
    </FormScreen>
  );
}
