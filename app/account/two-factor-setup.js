import { useState } from "react";
import { Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "../../src/api";
import { AuthGate } from "../../src/lib/auth";
import { cleanCode, errorMessage, isCompleteCode } from "../../src/lib/account";
import { COPY_LABEL, copyOrShare, openAuthenticator } from "../../src/lib/accountActions";
import { closeScreen } from "../../src/lib/accountNav";
import { patchSession } from "../../src/lib/accountSession";
import { success } from "../../src/lib/haptics";
import { colors } from "../../src/lib/theme";
import { MONO } from "../../src/lib/typography";
import ActionButton from "../../src/components/ActionButton";
import FormField from "../../src/components/FormField";
import FormScreen, { Body, Panel, SectionLabel, Title } from "../../src/components/FormScreen";
import Notice from "../../src/components/Notice";
import RecoveryCodesPanel from "../../src/components/RecoveryCodesPanel";

export default function TwoFactorSetupScreen() {
  return (
    <AuthGate title="Log in to turn on two-factor authentication">
      {(user) => <Setup user={user} />}
    </AuthGate>
  );
}

const NO_APP_MESSAGE =
  "No app on this phone could open the link. Install an authenticator app such as Google Authenticator, " +
  "Microsoft Authenticator, Authy or 1Password and try again, or use the setup key below.";

// Three steps: the password, the setup (open the app, copy the key or scan the
// code, then type a code to prove it works), and the recovery codes.
//
// The setup key and the recovery codes live in this component's state and
// nowhere else. They are not put in the query cache, which is saved to the
// phone, and they are dropped as soon as they are no longer needed.
function Setup({ user }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();

  const [step, setStep] = useState("password"); // password | scan | codes
  const [password, setPassword] = useState("");
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [openNote, setOpenNote] = useState(null);
  const [keyNote, setKeyNote] = useState(null);

  // Screen padding, panel padding and the white frame around the code.
  const qrSize = Math.max(160, Math.min(220, width - 40 - 32 - 24));

  const start = async () => {
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.twoFactorSetup(password);
      setSetup(res.data);
      setPassword("");
      setCode("");
      setStep("scan");
    } catch (e) {
      setError(errorMessage(e, "Setup could not be started. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const openApp = async () => {
    setOpenNote(null);
    const opened = await openAuthenticator(setup.otpauth_uri);
    if (!opened) setOpenNote(NO_APP_MESSAGE);
  };

  const copyKey = async () => {
    setKeyNote(null);
    // The key without spaces: every authenticator app takes it.
    const result = await copyOrShare(setup.secret, "Peptora setup key");
    if (result === "copied") setKeyNote({ kind: "success", text: "Setup key copied." });
    else if (result === "failed") setKeyNote({ kind: "error", text: "The key could not be copied. Select it on the screen and copy it by hand." });
  };

  const enable = async () => {
    if (!isCompleteCode(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.twoFactorEnable(code);
      setCodes(res.data.recovery_codes ?? []);
      // The key is no longer needed anywhere on this phone.
      setSetup(null);
      setCode("");
      patchSession(queryClient, { two_factor_enabled: true });
      queryClient.invalidateQueries({ queryKey: ["account", "2fa"] });
      setStep("codes");
      success();
    } catch (e) {
      // The code stays in the box so that one wrong digit can be fixed.
      setError(errorMessage(e, "The code could not be checked. Try again."));
    } finally {
      setBusy(false);
    }
  };

  if (step === "codes") {
    return (
      <FormScreen>
        <Title>Two-factor authentication is on</Title>
        <Body>You will be asked for a code from your authenticator app each time you log in. Save your recovery codes before you leave.</Body>
        <RecoveryCodesPanel codes={codes} email={user.email} onDone={() => closeScreen(router)} />
      </FormScreen>
    );
  }

  if (step === "scan" && setup) {
    return (
      <FormScreen>
        <Title>Add Peptora to your authenticator app</Title>
        <Body>Use an authenticator app such as Google Authenticator, Microsoft Authenticator, Authy or 1Password.</Body>

        <Panel>
          <SectionLabel>On this phone</SectionLabel>
          <Body>If the app is installed on this phone, this adds Peptora to it in one step.</Body>
          <ActionButton
            icon="open-outline"
            label="Open authenticator app"
            onPress={openApp}
            style={{ marginTop: 12 }}
          />
          {openNote ? <Notice kind="warning">{openNote}</Notice> : null}
        </Panel>

        <Panel>
          <SectionLabel>Or enter the setup key</SectionLabel>
          <Body>In the app, choose to enter a setup key. Pick time based if it asks.</Body>
          <View style={s.keyBox}>
            <Text style={s.key} selectable accessibilityLabel={`Setup key ${setup.secret_grouped}`}>
              {setup.secret_grouped}
            </Text>
          </View>
          <ActionButton variant="secondary" icon="copy-outline" label={`${COPY_LABEL} key`} onPress={copyKey} style={{ marginTop: 12 }} />
          {keyNote ? <Notice kind={keyNote.kind}>{keyNote.text}</Notice> : null}
          <Text style={s.small}>Account: {setup.account}</Text>
        </Panel>

        <Panel>
          <SectionLabel>Or scan the QR code</SectionLabel>
          <Body>For setting up on another device. Scan this code with the authenticator app there.</Body>
          <View style={s.qrFrame}>
            <Image
              source={{ uri: setup.qr_png_data_uri }}
              style={{ width: qrSize, height: qrSize }}
              resizeMode="contain"
              accessibilityLabel="QR code for your authenticator app"
            />
          </View>
        </Panel>

        <Panel>
          <SectionLabel>Then enter a code</SectionLabel>
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
            hint="The current code shown in the app for Peptora. A code from an earlier attempt will not work."
          />
          {error ? <Notice kind="error">{error}</Notice> : null}
          <ActionButton
            label="Turn on two-factor authentication"
            onPress={enable}
            busy={busy}
            disabled={!isCompleteCode(code)}
            style={{ marginTop: 16 }}
          />
        </Panel>
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      <Title>Turn on two-factor authentication</Title>
      <Body>
        Confirm your password to start. Next you add Peptora to an authenticator app, then enter a code from it.
      </Body>
      <FormField
        label="Password"
        value={password}
        onChangeText={(v) => { setPassword(v); setError(null); }}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        autoComplete="current-password"
      />
      {error ? <Notice kind="error">{error}</Notice> : null}
      <ActionButton label="Continue" onPress={start} busy={busy} disabled={!password} style={{ marginTop: 20 }} />
    </FormScreen>
  );
}

const s = StyleSheet.create({
  keyBox: {
    marginTop: 12, backgroundColor: colors.navy, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  key: { color: colors.tx, fontSize: 17, fontFamily: MONO, fontWeight: "700", letterSpacing: 1, lineHeight: 26 },
  small: { color: colors.tx3, fontSize: 12, lineHeight: 17, marginTop: 12 },
  qrFrame: {
    alignSelf: "center", backgroundColor: "#ffffff", borderRadius: 12, padding: 12, marginTop: 14,
  },
});
