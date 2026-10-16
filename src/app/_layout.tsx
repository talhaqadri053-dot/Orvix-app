import {
    DarkTheme,
    DefaultTheme,
    Stack,
    ThemeProvider,
    useLocalSearchParams,
    usePathname,
    useRouter,
    useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, View, useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  useEffect(() => {
    if (isLoading) return;

    const authScreens = [
      "login",
      "register",
      "forgot-password",
      "reset-password",
      "google-auth",
    ];
    const first = segments[0] as string | undefined;

    const isAuthScreen =
      first === "(auth)" || (first ? authScreens.includes(first) : false);
    const isPublicTabRoute =
      first === "(tabs)" &&
      ["index", "explore"].includes((segments[1] as string) || "index");
    const isPublicDataRoute =
      first === "seller" || first === "listing" || first === "category";
    const hasSafeReturnTo =
      typeof returnTo === "string" &&
      returnTo.startsWith("/") &&
      !returnTo.startsWith("//");
    const isEmailVerificationRoute = pathname === "/account/email-verification";

    if (!user && !isAuthScreen && !isPublicDataRoute && !isPublicTabRoute) {
      router.replace({ pathname: "/login", params: { returnTo: pathname } });
    } else if (
      user &&
      user.email_verified === false &&
      !isEmailVerificationRoute
    ) {
      router.replace("/account/email-verification");
    } else if (
      user &&
      isEmailVerificationRoute &&
      user.email_verified === true
    ) {
      router.replace("/dashboard");
    } else if (user && isAuthScreen && !hasSafeReturnTo) {
      router.replace("/dashboard");
    }
  }, [isLoading, pathname, returnTo, router, segments, user]);

  // While we check for a stored token, show a centered spinner.
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f3f7fc",
        }}
      >
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  // Guests can browse Home, Explore, categories, listings, and seller profiles.
  if (!user) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="google-auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="seller/[identifier]" />
        <Stack.Screen name="listing/[id]" />
        <Stack.Screen name="category/[id]" />
      </Stack>
    );
  }

  // Logged in -> main app
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="google-auth" />
      <Stack.Screen name="account/[section]" />
      <Stack.Screen name="account/create-listing" />
      <Stack.Screen name="account/listing-success" />
      <Stack.Screen name="account/email-verification" />
      <Stack.Screen name="account/notifications" />
      <Stack.Screen name="account/tools" />
      <Stack.Screen name="account/subscription-plans" />
      <Stack.Screen name="account/edit-listing/[id]" />
      <Stack.Screen name="account/promote-listing/[id]" />
      <Stack.Screen name="account/support-ticket/[id]" />
      <Stack.Screen name="listing/[id]" />
      <Stack.Screen name="seller/[identifier]" />
      <Stack.Screen name="category/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AnimatedSplashOverlay />
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
