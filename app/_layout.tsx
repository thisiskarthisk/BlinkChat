import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNav />
    </AuthProvider>
  );
}

function RootNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const scheme = useColorScheme();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === "(auth)";

    if (session) {
      // Logged in → go to app
      if (inAuth) router.replace("/(tabs)");
    } else {
      // Not logged in → go to login
      if (!inAuth) router.replace("/(auth)/login");
    }

    SplashScreen.hideAsync().catch(() => {});
  }, [session, loading, segments]);

  if (loading) return null;

  return (
    <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Slot />
    </ThemeProvider>
  );
}