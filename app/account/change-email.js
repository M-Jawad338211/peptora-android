import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "../../src/api";
import { AuthGate } from "../../src/lib/auth";
import { cleanCode, errorMessage, isCompleteCode } from "../../src/lib/account";
import { patchSession } from "../../src/lib/accountSession";
import { closeScreen } from "../../src/lib/accountNav";
import { success } from "../../src/lib/haptics";
import ActionButton from "../../src/components/ActionButton";
import FormField from "../../src/components/FormField";
import FormScreen, { Body, Title } from "../../src/components/FormScreen";
import Notice from "../../src/components/Notice";

export default function ChangeEmailScreen() {
  return (
    <AuthGate title="Log in to change your email">
      {(user) => <ChangeEmail user={user} />}
    </AuthGate>
  );
}

// Three views of one flow:
//   pending  a change is waiting for its code (opened from the session)
//   form     the new address and the password; sends the code
//   code     the 6-digit code that was sent to the new address
//   done     the address has changed
function ChangeEmail({ user }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [view, setView] = useState(user.pending_email ? "pending" : "form");
  const [newEmail, setNewEmail] = useState(user.pending_email ?? "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(null); // "send" | "confirm" | "cancel" | null
  const [error, setError] = useState(null);
  const [changedTo, setChangedTo] = useState(null);

  const pending = user.pending_email;

  const sendCode = async () => {
    const address = newEmail.trim();
    if (!address || !password) {
      setError("Enter the new email address and your current password.");
      return;
    }
    setBusy("send");
    setError(null);
    try {
      const res = await authApi.requestEmailChange(address, password);
      patchSession(queryClient, { pending_email: res.data.pending_email });
      setNewEmail(res.data.pending_email);
      setPassword("");
      setCode("");
      setView("code");
    } catch (e) {
      // The address and the password stay in the fields.
      setError(errorMessage(e, "The code could not be sent. Try again."));
    } finally {
      setBusy(null);
    }
  };

  const confirm = async () => {
    if (!isCompleteCode(code)) {
      setError("Enter the 6-digit code.");
      return;
    }
    setBusy("confirm");
    setError(null);
    try {
      const res = await authApi.confirmEmailChange(code);
      patchSession(queryClient, { email: res.data.email, pending_email: null });
      setChangedTo(res.data.email);
      setCode("");
      setView("done");
      success();
    } catch (e) {
      setError(errorMessage(e, "That code could not be checked. Try again."));
    } finally {
      setBusy(null);
    }
  };

  const cancelChange = async () => {
    setBusy("cancel");
    setError(null);
    try {
      await authApi.cancelEmailChange();
      patchSession(queryClient, { pending_email: null });
      setNewEmail("");
      setCode("");
      setPassword("");
      setView("form");
    } catch (e) {
      setError(errorMessage(e, "The change could not be cancelled. Try again."));
    } finally {
      setBusy(null);
    }
  };

  const newCode = () => {
    // A new code needs the password again.
    setError(null);
    setPassword("");
    setView("form");
  };

  if (view === "done") {
    return (
      <FormScreen>
        <Title>Email address updated</Title>
        <Body>You now sign in with {changedTo}.</Body>
        <ActionButton label="Done" onPress={() => closeScreen(router)} style={{ marginTop: 24 }} />
      </FormScreen>
    );
  }

  if (view === "pending") {
    return (
      <FormScreen>
        <Title>Email address</Title>
        <Body>Your current address is {user.email}.</Body>
        <Notice kind="info" title={`Waiting for confirmation of ${pending}`}>
          A 6-digit code was sent to that address. Your email changes when you enter it.
        </Notice>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <View style={s.stack}>
          <ActionButton label="Enter code" onPress={() => { setError(null); setView("code"); }} />
          <ActionButton variant="secondary" label="Send a new code" onPress={newCode} disabled={busy === "cancel"} />
          <ActionButton variant="danger" label="Cancel email change" onPress={cancelChange} busy={busy === "cancel"} />
        </View>
      </FormScreen>
    );
  }

  if (view === "code") {
    return (
      <FormScreen>
        <Title>Enter the code</Title>
        <Body>We sent a 6-digit code to {pending || newEmail}. It works for 10 minutes. Check your spam folder if it does not arrive.</Body>
        <FormField
          label="6-digit code"
          variant="code"
          value={code}
          onChangeText={(v) => { setCode(cleanCode(v)); setError(null); }}
          placeholder="000000"
          placeholderTextColor="rgba(136,153,170,0.5)"
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
        />
        {error ? <Notice kind="error">{error}</Notice> : null}
        <ActionButton
          label="Confirm new email"
          onPress={confirm}
          busy={busy === "confirm"}
          disabled={!isCompleteCode(code)}
          style={{ marginTop: 20 }}
        />
        <View style={s.stack}>
          <ActionButton variant="secondary" label="Send a new code" onPress={newCode} disabled={busy === "confirm"} />
          <ActionButton variant="link" label="Cancel email change" onPress={cancelChange} busy={busy === "cancel"} />
        </View>
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      <Title>Change email</Title>
      <Body>
        Your current address is {user.email}. We send a 6-digit code to the new address, and your email changes when you enter it.
      </Body>
      <FormField
        label="New email address"
        value={newEmail}
        onChangeText={(v) => { setNewEmail(v); setError(null); }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
      />
      <FormField
        label="Current password"
        value={password}
        onChangeText={(v) => { setPassword(v); setError(null); }}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        autoComplete="current-password"
        hint="Your password confirms that it is you."
      />
      {error ? <Notice kind="error">{error}</Notice> : null}
      <ActionButton
        label="Send code"
        onPress={sendCode}
        busy={busy === "send"}
        disabled={!newEmail.trim() || !password}
        style={{ marginTop: 20 }}
      />
      {pending ? (
        <ActionButton
          variant="link"
          label="Back to the pending change"
          onPress={() => { setError(null); setView("pending"); }}
          style={{ marginTop: 8 }}
        />
      ) : null}
    </FormScreen>
  );
}

const s = StyleSheet.create({
  stack: { gap: 10, marginTop: 16 },
});
