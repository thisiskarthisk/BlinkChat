import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider as CustomThemeProvider, useTheme } from "@/hooks/use-theme";
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from "@react-navigation/native";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { View, Image, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync().catch(() => {});
let isSplashHidden = false;

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CustomThemeProvider>
          <RootNav />
        </CustomThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { isDark } = useTheme();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === "(auth)";
    const isRoot = !segments[0];

    if (session) {
      if (inAuth || isRoot) {
        router.replace("/(tabs)");
      }
    } else {
      if (!inAuth) {
        router.replace("/(auth)/login");
      }
    }

    if (!isSplashHidden) {
      isSplashHidden = true;
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? "#080A10" : "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
        <Image
          source={require("../assets/images/icon.png")}
          style={{ width: 120, height: 120, borderRadius: 32, marginBottom: 24 }}
        />
        <ActivityIndicator size="large" color={isDark ? "#38BDF8" : "#2563EB"} />
      </View>
    );
  }

  return (
    <NavThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Slot />
    </NavThemeProvider>
  );
}