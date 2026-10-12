import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { authApi } from "../../src/api";
import { AuthGate } from "../../src/lib/auth";
import { avatarSizeProblem, errorMessage, initialOf } from "../../src/lib/account";
import { buildAvatarForm, confirmAction } from "../../src/lib/accountActions";
import { patchSession, useAvatarUri } from "../../src/lib/accountSession";
import { success } from "../../src/lib/haptics";
import ActionButton from "../../src/components/ActionButton";
import Avatar from "../../src/components/Avatar";
import FormField from "../../src/components/FormField";
import FormScreen, { Body, Title } from "../../src/components/FormScreen";
import Notice from "../../src/components/Notice";

export default function EditProfileScreen() {
  return (
    <AuthGate title="Log in to edit your profile">
      {(user) => <EditProfile user={user} />}
    </AuthGate>
  );
}

function EditProfile({ user }) {
  const queryClient = useQueryClient();
  const avatarUri = useAvatarUri(user);

  const [name, setName] = useState(user.full_name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const [photoBusy, setPhotoBusy] = useState(null); // "upload" | "remove" | null
  const [photoMessage, setPhotoMessage] = useState(null); // { kind, text }

  const nameChanged = name.trim() !== (user.full_name ?? "");
  const phoneChanged = phone.trim() !== (user.phone ?? "");
  const dirty = nameChanged || phoneChanged;

  const edit = (setter) => (value) => {
    setter(value);
    setSaved(false);
    setError(null);
  };

  const save = async () => {
    if (!dirty || saving) return;
    // Only what changed is sent. An empty phone clears the number.
    const body = {};
    if (nameChanged) body.full_name = name.trim();
    if (phoneChanged) body.phone = phone.trim() === "" ? null : phone.trim();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await authApi.updateProfile(body);
      patchSession(queryClient, { full_name: res.data.full_name, phone: res.data.phone });
      // The server tidies the number (spaces and dashes removed); show what it kept.
      setName(res.data.full_name ?? "");
      setPhone(res.data.phone ?? "");
      setSaved(true);
      success();
    } catch (e) {
      // Whatever was typed stays in the fields.
      setError(errorMessage(e, "Your profile could not be saved. Try again."));
    } finally {
      setSaving(false);
    }
  };

  const choosePhoto = async () => {
    if (photoBusy) return;
    setPhotoMessage(null);
    let result;
    try {
      // Square crop. The system photo picker needs no permission to be opened.
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    } catch {
      setPhotoMessage({ kind: "error", text: "The photo library could not be opened." });
      return;
    }
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const tooBig = avatarSizeProblem(asset.fileSize);
    if (tooBig) {
      setPhotoMessage({ kind: "error", text: tooBig });
      return;
    }
    setPhotoBusy("upload");
    try {
      const res = await authApi.uploadAvatar(await buildAvatarForm(asset));
      // The new avatar_updated_at is part of the photo's cache key, so the
      // new picture is fetched once and shown everywhere.
      patchSession(queryClient, { avatar_updated_at: res.data.avatar_updated_at });
      setPhotoMessage({ kind: "success", text: "Photo updated." });
      success();
    } catch (e) {
      setPhotoMessage({ kind: "error", text: errorMessage(e, "The photo could not be uploaded. Try again.") });
    } finally {
      setPhotoBusy(null);
    }
  };

  const removePhoto = async () => {
    if (photoBusy) return;
    const ok = await confirmAction({
      title: "Remove photo",
      message: "Your photo will be removed. Your initial is shown instead.",
      confirmText: "Remove",
      destructive: true,
    });
    if (!ok) return;
    setPhotoBusy("remove");
    setPhotoMessage(null);
    try {
      await authApi.deleteAvatar();
      patchSession(queryClient, { avatar_updated_at: null });
      setPhotoMessage({ kind: "success", text: "Photo removed." });
    } catch (e) {
      setPhotoMessage({ kind: "error", text: errorMessage(e, "The photo could not be removed. Try again.") });
    } finally {
      setPhotoBusy(null);
    }
  };

  const hasPhoto = !!user.avatar_updated_at;

  return (
    <FormScreen>
      <Title>Edit profile</Title>
      <Body>Your photo and name are shown on your account. The phone number is for contact only.</Body>

      <View style={s.photoBlock}>
        <Avatar uri={avatarUri} initial={initialOf(user.email)} size={96} />
        <View style={s.photoButtons}>
          <ActionButton
            variant="secondary"
            icon="image-outline"
            label={hasPhoto ? "Change photo" : "Add photo"}
            onPress={choosePhoto}
            busy={photoBusy === "upload"}
            disabled={!!photoBusy}
            style={s.photoButton}
          />
          {hasPhoto ? (
            <ActionButton
              variant="quiet"
              icon="trash-outline"
              label="Remove photo"
              onPress={removePhoto}
              busy={photoBusy === "remove"}
              disabled={!!photoBusy}
              style={s.photoButton}
            />
          ) : null}
        </View>
      </View>
      {photoMessage ? <Notice kind={photoMessage.kind}>{photoMessage.text}</Notice> : null}

      <FormField
        label="Full name"
        value={name}
        onChangeText={edit(setName)}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        maxLength={255}
      />
      <FormField
        label="Phone number"
        value={phone}
        onChangeText={edit(setPhone)}
        placeholder="+14155550123"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        autoCorrect={false}
        hint="International format, starting with + and the country code. It is a contact number only and is not verified."
      />

      {error ? <Notice kind="error">{error}</Notice> : null}
      {saved ? <Notice kind="success">Profile saved.</Notice> : null}

      <ActionButton
        label="Save changes"
        onPress={save}
        busy={saving}
        disabled={!dirty}
        style={{ marginTop: 20 }}
      />
    </FormScreen>
  );
}

const s = StyleSheet.create({
  photoBlock: { alignItems: "center", marginTop: 20, gap: 14 },
  photoButtons: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, alignSelf: "stretch" },
  photoButton: { flexGrow: 1, flexBasis: 140 },
});
