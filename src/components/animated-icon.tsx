import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Image, Platform, StyleSheet, View } from "react-native";

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(Platform.OS !== "web");

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    const timer = setTimeout(() => setVisible(false), 700);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.splashOverlay}>
      <Image
        style={styles.image}
        source={require("../../assets/images/splash-icon.png")}
        resizeMode="contain"
      />
    </View>
  );
}

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Image
        style={styles.image}
        source={require("../../assets/images/splash-icon.png")}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 128,
    height: 128,
  },
  image: {
    width: 200,
    height: 200,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F3F7FC",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
});
