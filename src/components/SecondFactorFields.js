import FormField from "./FormField";
import ActionButton from "./ActionButton";
import { cleanCode } from "../lib/account";

/**
 * The password and the second factor, for the actions that ask for both:
 * turning two-factor off and getting new recovery codes. The second factor is
 * the 6-digit code, or a recovery code after "Use a recovery code instead".
 * Everything is controlled by the screen, so nothing typed is lost when a
 * request fails.
 */
export default function SecondFactorFields({
  password, onPasswordChange, passwordError,
  code, onCodeChange,
  recoveryCode, onRecoveryCodeChange,
  useRecovery, onToggleRecovery,
}) {
  return (
    <>
      <FormField
        label="Password"
        value={password}
        onChangeText={onPasswordChange}
        error={passwordError}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        autoComplete="current-password"
      />
      {useRecovery ? (
        <FormField
          label="Recovery code"
          value={recoveryCode}
          onChangeText={onRecoveryCodeChange}
          placeholder="xxxxx-xxxxx"
          autoCapitalize="none"
          autoCorrect={false}
          hint="One of the codes you saved when you turned on two-factor authentication. Each works once."
        />
      ) : (
        <FormField
          label="6-digit code"
          variant="code"
          value={code}
          onChangeText={(value) => onCodeChange(cleanCode(value))}
          placeholder="000000"
          placeholderTextColor="rgba(136,153,170,0.5)"
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          hint="The current code from your authenticator app."
        />
      )}
      <ActionButton
        variant="link"
        label={useRecovery ? "Use an authenticator code instead" : "Use a recovery code instead"}
        onPress={onToggleRecovery}
        style={{ marginTop: 4 }}
      />
    </>
  );
}
