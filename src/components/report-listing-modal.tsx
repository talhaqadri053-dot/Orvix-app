import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { reportListing } from "../api/reports";
import { useAuth } from "../hooks/useAuth";

interface ReportListingModalProps {
  visible: boolean;
  listingId: number | string | null;
  onClose: () => void;
}

export default function ReportListingModal({
  visible,
  listingId,
  onClose,
}: ReportListingModalProps) {
  const { isAuthenticated } = useAuth();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    if (submitting) return;
    setReason("");
    setDescription("");
    setError("");
    onClose();
  };

  const submit = async () => {
    if (!isAuthenticated) {
      Alert.alert("Sign in required", "Please sign in to report a listing.");
      return;
    }
    if (!listingId || !reason.trim()) {
      setError("Please enter a report reason.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await reportListing(listingId, {
        reason: reason.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      if (response?.enabled === false) {
        setError(response.message || "Reporting is temporarily unavailable.");
        return;
      }
      Alert.alert(
        "Report submitted",
        response?.message || "Your report was submitted successfully.",
      );
      close();
    } catch (requestError) {
      const fieldErrors = Object.values(requestError?.errors || {})
        .flat()
        .join("\n");
      setError(
        fieldErrors || requestError?.message || "Unable to submit this report.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Report listing</Text>
          <Text style={styles.helper}>
            Describe the issue with this listing.
          </Text>
          <TextInput
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            placeholder="Reason *"
            maxLength={255}
            editable={!submitting}
          />
          <TextInput
            style={[styles.input, styles.description]}
            value={description}
            onChangeText={setDescription}
            placeholder="Additional details (optional)"
            maxLength={5000}
            multiline
            editable={!submitting}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              onPress={close}
              disabled={submitting}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={submitting}
              style={styles.submitButton}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Submit report</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(16, 25, 21, 0.48)",
  },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 18 },
  title: { color: "#111827", fontSize: 20, fontWeight: "800" },
  helper: { color: "#64748b", fontSize: 13, marginTop: 5, marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd9d0",
    borderRadius: 8,
    padding: 11,
    color: "#111827",
    marginBottom: 10,
  },
  description: { minHeight: 100, textAlignVertical: "top" },
  error: { color: "#b91c1c", marginBottom: 10 },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  cancelButton: { paddingHorizontal: 12, paddingVertical: 10 },
  cancelText: { color: "#475569", fontWeight: "700" },
  submitButton: {
    backgroundColor: "#b91c1c",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 110,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "700" },
});
