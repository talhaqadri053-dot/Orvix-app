import { FontAwesome } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { fetchGoogleSignInConfig } from "../../api/auth";
import { useAuth } from "../../hooks/useAuth";

const GOOGLE_RETURN_TO_KEY = "orvix_google_return_to";

// Module-level: survives re-renders, Strict Mode double effects and remounts.
// A Google/backend code can be used only once.
const handledGoogleCodes = new Set();

function isSafePath(value) {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
  );
}

function getGoogleStartUrl(apiBaseUrl, redirectUri) {
  const backendBaseUrl = apiBaseUrl.replace(/\/api\/v1\/?$/, "");
  return `${backendBaseUrl}/mobile/google/redirect?redirect_uri=${encodeURIComponent(redirectUri)}`;
}

function getPostLoginDestination(user, returnTo) {
  if (user?.email_verified === false) return "/account/email-verification";
  if (isSafePath(returnTo)) return returnTo;
  return "/";
}

export default function LoginScreen() {
  const { login, googleLogin } = useAuth();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleApiBaseUrl, setGoogleApiBaseUrl] = useState("");
  const [isGoogleConfigLoading, setIsGoogleConfigLoading] = useState(true);
  const [googleConfigError, setGoogleConfigError] = useState("");

  // Load Google config
  useEffect(() => {
    let isActive = true;

    fetchGoogleSignInConfig(Platform.OS === "web" ? "web" : "native")
      .then((config) => {
        if (isActive) {
          setGoogleApiBaseUrl(config.api_base_url || "");
          setGoogleConfigError("");
        }
      })
      .catch((requestError) => {
        if (isActive) {
          setGoogleConfigError(
            requestError?.message ||
              "Google sign-in configuration is unavailable.",
          );
        }
      })
      .finally(() => {
        if (isActive) setIsGoogleConfigLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  // Handle the redirect back from Google (web). Runs once on mount only.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const callbackUrl = new URL(window.location.href);
    const code = callbackUrl.searchParams.get("google_code");
    const authError = callbackUrl.searchParams.get("google_error");
    if (!code && !authError) return;

    // Remove params from the URL immediately so a refresh can't reuse the code
    callbackUrl.searchParams.delete("google_code");
    callbackUrl.searchParams.delete("google_error");
    window.history.replaceState(
      null,
      document.title,
      `${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`,
    );

    const key = code || authError;
    if (handledGoogleCodes.has(key)) return;
    handledGoogleCodes.add(key);

    const savedReturnTo =
      window.sessionStorage.getItem(GOOGLE_RETURN_TO_KEY) || undefined;
    window.sessionStorage.removeItem(GOOGLE_RETURN_TO_KEY);

    if (authError) {
      setError(authError);
      return;
    }

    setIsSubmitting(true);
    fetchGoogleSignInConfig("web")
      .then((config) => {
        if (!config.api_base_url)
          throw new Error(
            "Google sign-in is not configured on the Laravel server.",
          );
        return googleLogin(code, config.api_base_url);
      })
      .then((loggedUser) =>
        router.replace(getPostLoginDestination(loggedUser, savedReturnTo)),
      )
      .catch((requestError) => {
        const serverMessage = requestError?.response?.data?.message;
        setError(
          serverMessage ||
            requestError?.message ||
            "Google sign-in failed. Please try again.",
        );
      })
      .finally(() => setIsSubmitting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      router.replace(isSafePath(returnTo) ? returnTo : "/");
    } catch (err) {
      setError(
        err?.message || "Login failed. Check your credentials and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    if (!googleApiBaseUrl) {
      setError(
        isGoogleConfigLoading
          ? "Loading Google sign-in configuration. Try again in a moment."
          : googleConfigError ||
              "Google sign-in is not configured on the Laravel server.",
      );
      return;
    }

    const redirectUri =
      Platform.OS === "web"
        ? `${window.location.origin}/login`
        : Linking.createURL("google-auth");
    const startUrl = getGoogleStartUrl(googleApiBaseUrl, redirectUri);

    if (Platform.OS === "web") {
      window.sessionStorage.setItem(
        GOOGLE_RETURN_TO_KEY,
        isSafePath(returnTo) ? returnTo : "",
      );
      window.location.assign(startUrl);
      return;
    }

    try {
      setIsSubmitting(true);
      await WebBrowser.openBrowserAsync(startUrl);
    } catch (err) {
      setError(err?.message || "Google sign-in failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>Welcome ORVIX ONE</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable
        style={styles.button}
        onPress={handleLogin}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Log In</Text>
        )}
      </Pressable>

      <View style={styles.separator}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>OR</Text>
        <View style={styles.separatorLine} />
      </View>

      <Pressable
        style={styles.googleButton}
        onPress={handleGoogleSignIn}
        disabled={isSubmitting || isGoogleConfigLoading}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#4285F4" />
        ) : (
          <>
            <FontAwesome name="google" size={18} color="#4285F4" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </>
        )}
      </Pressable>

      <Link
        href={{
          pathname: "/register",
          params: typeof returnTo === "string" ? { returnTo } : {},
        }}
        style={styles.link}
      >
        Don't have an account? Register
      </Link>
      <Link href="/forgot-password" style={styles.link}>
        Forgot password?
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "#f3f7fc",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 28,
  },
  input: {
    borderWidth: 1,
    borderColor: "#dbe4f0",
    borderRadius: 12,
    minHeight: 50,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#1d4ed8",
    borderRadius: 10,
    minHeight: 50,
    justifyContent: "center",
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  separator: { flexDirection: "row", alignItems: "center", marginTop: 22 },
  separatorLine: { flex: 1, height: 1, backgroundColor: "#e5e7eb" },
  separatorText: { color: "#6b7280", fontSize: 12, marginHorizontal: 12 },
  googleButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#dbe4f0",
    borderRadius: 10,
    minHeight: 48,
    paddingVertical: 13,
    marginTop: 14,
  },
  googleButtonText: { color: "#111827", fontSize: 15, fontWeight: "600" },
  error: { color: "#d33", marginBottom: 12 },
  link: {
    marginTop: 20,
    textAlign: "center",
    color: "#1e40af",
    fontWeight: "600",
  },
});
