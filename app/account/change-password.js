import { useState } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "../../src/api";
import { AuthGate } from "../../src/lib/auth";
import { errorMessage, newPasswordProblem } from "../../src/lib/account";
import { adoptNewTokens } from "../../src/lib/accountSession";
import { closeScreen } from "../../src/lib/accountNav";
import { dateOnly } from "../../src/lib/format";
import { success } from "../../src/lib/haptics";
import ActionButton from "../../src/components/ActionButton";
import FormField from "../../src/components/FormField";
import FormScreen, { Body, Title } from "../../src/components/FormScreen";
import Notice from "../../src/components/Notice";

export default function ChangePasswordScreen() {
  return (
    <AuthGate title="Log in to change your password">
      {(user) => <ChangePassword user={user} />}
    </AuthGate>
  );
}

function ChangePassword({ user }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const edit = (setter) => (value) => {
    setter(value);
    setError(null);
  };

  const submit = async () => {
    const problem = newPasswordProblem({ current, next, repeat });
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.changePassword(current, next);
      // The server has signed every other device out and sent new tokens for
      // this one. Without them the next request would end this session too.
      await adoptNewTokens(queryClient, res.data);
      setCurrent("");
      setNext("");
      setRepeat("");
      setDone(true);
      success();
    } catch (e) {
      // A wrong current password is a 403 with its own sentence. The three
      // fields keep what was typed.
      setError(errorMessage(e, "Your password could not be changed. Try again."));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <FormScreen>
        <Title>Password changed</Title>
        <Body>Use the new password the next time you log in.</Body>
        <Notice kind="success">Your other devices were signed out. This device stays signed in.</Notice>
        <ActionButton label="Done" onPress={() => closeScreen(router)} style={{ marginTop: 24 }} />
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      <Title>Change password</Title>
      <Body>
        {user.password_changed_at ? `Last changed ${dateOnly(user.password_changed_at)}. ` : ""}
        Changing your password signs out your other devices. This device stays signed in.
      </Body>
      <FormField
        label="Current password"
        value={current}
        onChangeText={edit(setCurrent)}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        autoComplete="current-password"
      />
      <FormField
        label="New password"
        value={next}
        onChangeText={edit(setNext)}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        autoComplete="new-password"
        hint="At least 8 characters."
      />
      <FormField
        label="Repeat new password"
        value={repeat}
        onChangeText={edit(setRepeat)}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        autoComplete="new-password"
      />
      {error ? <Notice kind="error">{error}</Notice> : null}
      <ActionButton
        label="Change password"
        onPress={submit}
        busy={busy}
        disabled={!current || !next || !repeat}
        style={{ marginTop: 20 }}
      />
    </FormScreen>
  );
}
