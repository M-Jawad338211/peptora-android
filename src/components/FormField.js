import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../lib/theme";

/**
 * A labelled text input with an optional hint and an error line under it.
 * `variant="code"` is the large centred box used for 6-digit codes.
 */
export default function FormField({ label, hint, error, variant, style, inputStyle, ...inputProps }) {
  return (
    <View style={[s.wrap, style]}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, variant === "code" && s.code, error ? s.inputError : null, inputStyle]}
        placeholderTextColor={colors.tx3}
        accessibilityLabel={label}
        {...inputProps}
      />
      {error ? <Text style={s.error} accessibilityLiveRegion="polite">{error}</Text> : null}
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 16 },
  label: { color: colors.tx2, fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 14, color: colors.tx,
    fontSize: 15, borderWidth: 1, borderColor: colors.border,
  },
  code: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  inputError: { borderColor: "rgba(255,71,87,0.6)" },
  error: { color: colors.red, fontSize: 13, lineHeight: 18, marginTop: 6 },
  hint: { color: colors.tx3, fontSize: 12, lineHeight: 17, marginTop: 6 },
});
