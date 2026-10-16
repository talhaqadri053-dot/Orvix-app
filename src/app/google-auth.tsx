import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchGoogleSignInConfig } from "../api/auth";
import { useAuth } from "../hooks/useAuth";
function getPostLoginDestination(user: any): string {
  return user?.email_verified === false
    ? "/account/email-verification"
    : "/dashboard";
}
export default function GoogleAuthCallbackScreen() {
  const params = useLocalSearchParams<{
    google_code?: string;
    google_error?: string;
  }>();
  const router = useRouter();
  const { googleLogin } = useAuth();
  const handled = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = Array.isArray(params.google_code)
      ? params.google_code[0]
      : params.google_code;
    const authError = Array.isArray(params.google_error)
      ? params.google_error[0]
      : params.google_error;

    if (authError) {
      setError(authError);
      return;
    }
    if (!code) {
      setError("Google did not return a sign-in code. Please try again.");
      return;
    }

    (async () => {
      try {
        const config = await fetchGoogleSignInConfig("native");
        if (!config.api_base_url) {
          throw new Error(
            "Google sign-in is not configured on the Laravel server.",
          );
        }
        const user = await googleLogin(code, config.api_base_url);
        router.replace(getPostLoginDestination(user));
      } catch (requestError: any) {
        setError(
          requestError?.message || "Google sign-in failed. Please try again.",
        );
      }
    })();
  }, [googleLogin, params.google_code, params.google_error, router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {error ? (
          <>
            <Text style={styles.title}>Google sign-in failed</Text>
            <Text style={styles.error}>{error}</Text>
            <Pressable
              onPress={() => router.replace("/login")}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Return to login</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#1d4ed8" />
            <Text style={styles.title}>Finishing sign-in...</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7fc" },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe4f0",
    borderRadius: 16,
    marginVertical: 24,
  },
  title: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 18,
    textAlign: "center",
  },
  error: { color: "#b91c1c", textAlign: "center", marginTop: 10 },
  button: {
    backgroundColor: "#1d4ed8",
    borderRadius: 10,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 20,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
