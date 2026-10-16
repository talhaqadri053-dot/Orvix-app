import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { deleteAccount } from "../../api/sidebar";
import { useAuth } from "../../hooks/useAuth";
import { toUploadFile } from "../../utils/upload-file";

export function AccountToolsScreen() {
  const router = useRouter();
  const { user, updateProfile, changePassword, logout } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [whatsappPhone, setWhatsappPhone] = useState(
    user?.whatsapp_phone || "",
  );
  const [address, setAddress] = useState(user?.address || "");
  const [country, setCountry] = useState(user?.country || "");
  const [designation, setDesignation] = useState(user?.designation || "");
  const [aboutMe, setAboutMe] = useState(user?.about_me || "");
  const [avatar, setAvatar] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  async function saveProfile() {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("phone", phone.trim());
      form.append("whatsapp_phone", whatsappPhone.trim());
      form.append("address", address.trim());
      form.append("country", country.trim());
      form.append("designation", designation.trim());
      form.append("about_me", aboutMe.trim());
      if (avatar) {
        form.append("image", await toUploadFile(avatar));
      }
      await updateProfile(form);
      setAvatar(null);
      router.replace("/dashboard");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Could not update profile.");
    } finally {
      setBusy(false);
    }
  }

  async function chooseAvatar() {
    try {
      const ImagePicker = await import("expo-image-picker");
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Please allow access to your photos to upload a profile photo.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled) setAvatar(result.assets[0]);
    } catch (error: any) {
      Alert.alert(
        "Photo picker unavailable",
        error?.message || "Could not open your photo library.",
      );
    }
  }

  async function savePassword() {
    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      Alert.alert(
        "Saved",
        "Password changed successfully. A confirmation email has been sent to your email address.",
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Could not change password.",
      );
    } finally {
      setBusy(false);
    }
  }

  function removeAccount() {
    setDeletePassword("");
    setDeleteDialogVisible(true);
  }

  async function confirmRemoveAccount() {
    if (!deletePassword.trim()) return;
    setBusy(true);
    try {
      const result = await deleteAccount(deletePassword);
      if (result?.enabled === false) {
        Alert.alert(
          "Unavailable",
          result.message || "Account deletion is temporarily unavailable.",
        );
        return;
      }
      setDeleteDialogVisible(false);
      await logout();
      router.replace("/(auth)/login");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Could not delete account.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Account settings</Text>

        <Text style={styles.heading}>Edit profile</Text>
        <Pressable
          onPress={chooseAvatar}
          style={styles.avatarButton}
          disabled={busy}
        >
          {avatar?.uri || user?.avatar_url ? (
            <Image
              source={{ uri: avatar?.uri || user?.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>?</Text>
            </View>
          )}
          <Text style={styles.avatarAction}>Choose profile photo</Text>
        </Pressable>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>WhatsApp Number</Text>
          <TextInput
            style={styles.input}
            value={whatsappPhone}
            onChangeText={setWhatsappPhone}
            placeholder="Enter WhatsApp phone"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Enter your address"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Country</Text>
          <TextInput
            style={styles.input}
            value={country}
            onChangeText={setCountry}
            placeholder="Enter your country"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Designation / Title</Text>
          <TextInput
            style={styles.input}
            value={designation}
            onChangeText={setDesignation}
            placeholder="e.g. Sales Executive, Dealer, Owner"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>About Me</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={aboutMe}
            onChangeText={setAboutMe}
            placeholder="Tell buyers about yourself"
            placeholderTextColor="#94a3b8"
            multiline
          />
        </View>

        <Pressable style={styles.button} onPress={saveProfile} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save profile</Text>
          )}
        </Pressable>

        <Text style={styles.heading}>Change password</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Current Password</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
          />
        </View>

        <Pressable style={styles.button} onPress={savePassword} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Change password</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.deleteButton}
          onPress={removeAccount}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#dc2626" />
          ) : (
            <Text style={styles.deleteText}>Delete account</Text>
          )}
        </Pressable>
      </ScrollView>

      <Modal
        visible={deleteDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteDialogVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete account</Text>
            <Text style={styles.modalMessage}>
              Enter your password to permanently delete your account.
            </Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={deletePassword}
                onChangeText={setDeletePassword}
                placeholder="Current password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setDeleteDialogVisible(false)}
                disabled={busy}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmRemoveAccount}
                disabled={busy || !deletePassword.trim()}
                style={styles.confirmDeleteButton}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Delete account</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
    </Modal>
    </SafeAreaView>
  );
}

export default AccountToolsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3f7fc",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(16, 25, 21, 0.58)",
    justifyContent: "center",
    padding: 22,
  },
  modalCard: { backgroundColor: "#fff", borderRadius: 10, padding: 20 },
  modalTitle: { color: "#111827", fontSize: 20, fontWeight: "800" },
  modalMessage: {
    color: "#64748b",
    lineHeight: 20,
    marginTop: 7,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  cancelButton: { paddingHorizontal: 12, paddingVertical: 10 },
  cancelText: { color: "#475569", fontWeight: "700" },
  confirmDeleteButton: {
    minHeight: 40,
    backgroundColor: "#dc2626",
    borderRadius: 7,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmDeleteText: { color: "#fff", fontWeight: "700" },
  container: {
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
    flexGrow: 1,
    padding: 24,
    paddingBottom: 48,
    backgroundColor: "#f3f7fc",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 28,
  },
  heading: {
    fontSize: 17,
    fontWeight: "800",
    color: "#172554",
    marginTop: 18,
    marginBottom: 12,
  },
  input: {
    minHeight: 48,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe4f0",
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0f172a",
  },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  avatarButton: { alignItems: "center", marginBottom: 14 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e2e8f0",
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#64748b", fontSize: 24, fontWeight: "700" },
  avatarAction: { color: "#1d4ed8", fontWeight: "700", marginTop: 8 },
  button: {
    backgroundColor: "#1d4ed8",
    borderRadius: 10,
    minHeight: 48,
    padding: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  deleteButton: {
    borderWidth: 1,
    borderColor: "#dc2626",
    borderRadius: 10,
    minHeight: 48,
    padding: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  deleteText: { color: "#dc2626", fontWeight: "700" },
});
