import { AntDesign, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? "#60a5fa" : "#1d4ed8",
        tabBarInactiveTintColor: isDark ? "#a8b4c7" : "#64748b",
        tabBarActiveBackgroundColor: isDark ? "#172554" : "#dbeafe",
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
        tabBarItemStyle: {
          borderRadius: 10,
          marginHorizontal: 4,
          marginVertical: 5,
        },
        tabBarStyle: {
          backgroundColor: isDark ? "#101827" : "#fff",
          borderTopColor: isDark ? "#334155" : "#dbe4f0",
          borderTopWidth: 1,
          paddingTop: 5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarAccessibilityLabel: "Home, browse listings",
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="home" size={size + 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarAccessibilityLabel: "Dashboard, account overview",
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="dashboard" size={size + 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="listing"
        options={{
          title: "Listings",
          tabBarAccessibilityLabel: "Listings, manage your listings",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="list" size={size + 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarAccessibilityLabel: "Account, profile and settings",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="user" size={size + 1} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
