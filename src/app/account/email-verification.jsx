import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";

export default function EmailVerificationScreen() {
  const { emailSent } = useLocalSearchParams();
  const { emailVerificationStatus, resendVerification, refreshUser } =
    useAuth();
  const [verified, setVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const status = await emailVerificationStatus();
      setVerified(Boolean(status.verified));
    } catch (requestError) {
      setError(requestError?.message || "Unable to load verification status.");
    } finally {
      setIsLoading(false);
    }
  }, [emailVerificationStatus]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleResend = async () => {
    setMessage("");
    setError("");
    setIsSubmitting(true);
    try {
      const response = await resendVerification();
      setMessage(response?.message || "Verification email sent.");
    } catch (requestError) {
      setError(
        requestError?.message || "Unable to send the verification email.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    await refreshUser();
    await loadStatus();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>ACCOUNT SECURITY</Text>
        <Text style={styles.title}>Email verification</Text>
        {isLoading ? (
          <ActivityIndicator color="#1d4ed8" />
        ) : (
          <Text style={verified ? styles.success : styles.warning}>
            {verified ? "Email verified" : "Email not verified"}
          </Text>
        )}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!isLoading && !verified ? (
          <>
            <Text style={styles.body}>
              {emailSent === "false"
                ? "We could not send the verification email. Check your email address, then try resending it."
                : "Check your inbox and spam folder for the verification link. If it has not arrived, use the resend button below."}
            </Text>
            <Pressable
              style={styles.button}
              onPress={handleResend}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Resend verification email</Text>
              )}
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handleRefresh}>
              <Text style={styles.secondaryText}>Refresh status</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f3f7fc" },
  content: { width: "100%", maxWidth: 760, alignSelf: "center", padding: 24 },
  eyebrow: {
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  title: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 5,
    marginBottom: 22,
  },
  body: { color: "#64748b", lineHeight: 21, marginTop: 16 },
  success: { color: "#16803c", marginTop: 12 },
  warning: { color: "#a16207", marginTop: 12 },
  error: { color: "#b91c1c", marginTop: 12 },
  button: {
    backgroundColor: "#1d4ed8",
    borderRadius: 10,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  secondaryButton: { alignItems: "center", paddingVertical: 14, marginTop: 8 },
  secondaryText: { color: "#1d4ed8", fontWeight: "600" },
});
