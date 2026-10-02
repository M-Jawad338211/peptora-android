import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../lib/theme";
import { success, tap, warning } from "../lib/haptics";

const TONES = {
  teal: {
    track: "rgba(0,214,143,0.14)",
    border: "rgba(0,214,143,0.55)",
    fill: colors.teal,
    text: colors.teal,
    textOnFill: "#021a0e",
  },
  danger: {
    track: "rgba(255,71,87,0.10)",
    border: "rgba(255,71,87,0.55)",
    fill: colors.red,
    text: colors.red,
    textOnFill: "#ffffff",
  },
};

/**
 * A button that has to be held, not tapped.
 *
 * The bar fills from the left while the finger stays down and the action
 * fires only when it reaches the end; letting go early cancels and the bar
 * runs back. It is used where a stray tap would be a nuisance (logging an
 * entry) or a disaster (deleting the account), and the fill doubles as the
 * confirmation that the hold registered.
 *
 * VoiceOver and TalkBack users cannot hold a control the same way, so the
 * standard activate action runs the same handler directly.
 */
export default function HoldButton({
  label,
  holdingLabel = "Keep holding",
  doneLabel,
  icon,
  duration = 900,
  tone = "teal",
  disabled = false,
  busy = false,
  onComplete,
  onProgress,
  style,
  accessibilityLabel,
}) {
  const palette = TONES[tone] ?? TONES.teal;
  const progress = useRef(new Animated.Value(0)).current;
  const [phase, setPhase] = useState("idle"); // idle | holding | done
  const [width, setWidth] = useState(0);
  const completed = useRef(false);
  const holding = useRef(false);
  const resetTimer = useRef(null);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    // Lets a caller animate something else in step with the hold (the syringe
    // filling, for one). Reported only while the finger is down; the rewind
    // after an early release is this button's own business.
    const id = progress.addListener(({ value }) => {
      if (holding.current) onProgressRef.current?.(value);
    });
    return () => {
      progress.removeListener(id);
      clearTimeout(resetTimer.current);
    };
  }, [progress]);

  const finish = () => {
    completed.current = true;
    holding.current = false;
    setPhase("done");
    if (tone === "danger") warning();
    else success();
    onProgressRef.current?.(1);
    onComplete?.();
    // Give the "done" state a moment on screen, then get ready for the next use.
    resetTimer.current = setTimeout(() => {
      completed.current = false;
      progress.setValue(0);
      setPhase("idle");
      onProgressRef.current?.(null);
    }, 1200);
  };

  const start = () => {
    if (disabled || busy || completed.current) return;
    tap();
    holding.current = true;
    setPhase("holding");
    Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) finish();
    });
  };

  const release = () => {
    if (completed.current) return;
    holding.current = false;
    progress.stopAnimation();
    setPhase("idle");
    onProgressRef.current?.(null);
    Animated.timing(progress, {
      toValue: 0,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  const fillWidth = progress.interpolate({ inputRange: [0, 1], outputRange: [0, width] });
  const text = phase === "done" ? (doneLabel ?? label) : phase === "holding" ? holdingLabel : label;
  const inactive = disabled || busy;

  return (
    <Pressable
      onPressIn={start}
      onPressOut={release}
      disabled={inactive}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint="Press and hold to confirm"
      accessibilityState={{ disabled: inactive, busy }}
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "activate" && !inactive && !completed.current) finish();
      }}
      style={[
        s.track,
        { backgroundColor: palette.track, borderColor: palette.border },
        inactive && s.inactive,
        style,
      ]}
    >
      <Animated.View style={[s.fill, { width: fillWidth, backgroundColor: palette.fill }]} />
      {/* The label is drawn twice: once in the tone colour on the track, and
          once in the contrasting colour clipped to the filled part, so the
          text stays readable as the bar passes underneath it. */}
      <View style={s.content}>
        {busy ? (
          <ActivityIndicator color={palette.text} size="small" />
        ) : (
          <>
            {icon ? <Ionicons name={phase === "done" ? "checkmark" : icon} size={17} color={palette.text} /> : null}
            <Text style={[s.label, { color: palette.text }]} numberOfLines={1}>{text}</Text>
          </>
        )}
      </View>
      {!busy && (
        <Animated.View style={[s.clip, { width: fillWidth }]} pointerEvents="none">
          <View style={[s.content, { width }]}>
            {icon ? <Ionicons name={phase === "done" ? "checkmark" : icon} size={17} color={palette.textOnFill} /> : null}
            <Text style={[s.label, { color: palette.textOnFill }]} numberOfLines={1}>{text}</Text>
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  track: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "center",
  },
  inactive: { opacity: 0.5 },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0 },
  clip: { position: "absolute", left: 0, top: 0, bottom: 0, overflow: "hidden" },
  content: {
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  label: { fontSize: 15, fontWeight: "700" },
});
