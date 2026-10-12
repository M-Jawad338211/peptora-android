import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Stack, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../lib/theme";
import { MONO } from "../lib/typography";
import { recoveryCodesText } from "../lib/account";
import { COPY_LABEL, copyOrShare } from "../lib/accountActions";
import ActionButton from "./ActionButton";
import Notice from "./Notice";
import { Panel } from "./FormScreen";

/**
 * The ten recovery codes, shown once. The screen cannot be left until the
 * person confirms that the codes are saved: the back button, the back gesture
 * and the system back key are all held until then, because these codes are the
 * way back into the account if the authenticator app is lost.
 */
export default function RecoveryCodesPanel({ codes, email, onDone, doneLabel = "Done" }) {
  const navigation = useNavigation();
  const [saved, setSaved] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [note, setNote] = useState(null);

  useEffect(() => {
    if (saved) return undefined;
    return navigation.addListener("beforeRemove", (event) => {
      event.preventDefault();
      setBlocked(true);
    });
  }, [navigation, saved]);

  const share = async () => {
    const result = await copyOrShare(recoveryCodesText(codes, email), "Peptora recovery codes");
    if (result === "copied") setNote({ kind: "success", text: "Codes copied." });
    else if (result === "failed") setNote({ kind: "error", text: "The codes could not be copied or shared. Write them down instead." });
    else setNote(null);
  };

  return (
    <>
      <Stack.Screen options={{ headerBackVisible: saved, gestureEnabled: saved }} />
      <Notice kind="warning" title="Save these codes now">
        They are shown only once. If you lose your authenticator app, each code lets you sign in one time.
      </Notice>

      <Panel>
        <View style={s.grid} accessibilityLabel="Recovery codes">
          {codes.map((code) => (
            <View key={code} style={s.cell}>
              <Text style={s.code} selectable>{code}</Text>
            </View>
          ))}
        </View>
      </Panel>

      <ActionButton variant="secondary" icon="share-outline" label={`${COPY_LABEL} codes`} onPress={share} style={{ marginTop: 16 }} />
      {note ? <Notice kind={note.kind}>{note.text}</Notice> : null}

      <TouchableOpacity
        style={s.check}
        onPress={() => { setSaved((v) => !v); setBlocked(false); }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: saved }}
        accessibilityLabel="I have saved these codes"
        activeOpacity={0.7}
      >
        <Ionicons name={saved ? "checkbox" : "square-outline"} size={24} color={saved ? colors.teal : colors.tx2} />
        <Text style={s.checkText}>I have saved these codes</Text>
      </TouchableOpacity>
      {blocked && !saved ? (
        <Notice kind="warning">Tick the box once the codes are saved. You can leave this screen after that.</Notice>
      ) : null}

      <ActionButton label={doneLabel} onPress={onDone} disabled={!saved} style={{ marginTop: 16 }} />
    </>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "50%", paddingVertical: 7 },
  code: { color: colors.tx, fontSize: 15, fontFamily: MONO, letterSpacing: 0.5 },
  check: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20, paddingVertical: 6 },
  checkText: { color: colors.tx, fontSize: 15, flex: 1 },
});
