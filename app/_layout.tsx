import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider as CustomThemeProvider, useTheme } from "@/hooks/use-theme";
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from "@react-navigation/native";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <CustomThemeProvider>
        <RootNav />
      </CustomThemeProvider>
    </AuthProvider>
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

    SplashScreen.hideAsync().catch(() => {});
  }, [session, loading, segments]);

  if (loading) return null;

  return (
    <NavThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Slot />
    </NavThemeProvider>
  );
}