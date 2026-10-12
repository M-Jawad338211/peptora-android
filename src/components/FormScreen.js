import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../lib/theme";

/**
 * The frame of a settings screen: scrolls, keeps the keyboard from covering
 * the field, and leaves a tap on a button alone while the keyboard is up.
 */
export default function FormScreen({ children, refreshing, onRefresh }) {
  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.teal} colors={[colors.teal]} />
        ) : undefined}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Title({ children, style }) {
  return <Text style={[s.title, style]} accessibilityRole="header">{children}</Text>;
}

export function Body({ children, style }) {
  return <Text style={[s.body, style]}>{children}</Text>;
}

/** A small uppercase heading, like the section labels of the Profile tab. */
export function SectionLabel({ children, style }) {
  return <Text style={[s.sectionLabel, style]}>{children}</Text>;
}

/** A bordered box for a group of related content. */
export function Panel({ children, style }) {
  return <View style={[s.panel, style]}>{children}</View>;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  content: { padding: 20, paddingBottom: 48 },
  title: { color: colors.tx, fontSize: 22, fontWeight: "800", marginBottom: 8 },
  body: { color: colors.tx2, fontSize: 14, lineHeight: 21 },
  sectionLabel: {
    color: colors.tx2, fontSize: 12, fontWeight: "700", textTransform: "uppercase",
    letterSpacing: 0.5, marginBottom: 8, marginTop: 4,
  },
  panel: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border, marginTop: 16,
  },
});
