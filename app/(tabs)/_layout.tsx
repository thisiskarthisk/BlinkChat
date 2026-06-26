// import { Tabs } from 'expo-router';
// import { Home, Settings, LayoutDashboard, User } from 'lucide-react-native';
// import { useTheme } from '@/hooks/use-theme';
// import { useAuth } from '@/hooks/useAuth';
// import { Platform, useWindowDimensions } from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';

// export default function TabLayout() {
//   const { colors } = useTheme();
//   const { user, profile } = useAuth();
//   const { width } = useWindowDimensions();
//   const insets = useSafeAreaInsets();
//   const isDesktop = Platform.OS === 'web' && width >= 768;

//   const isDashboardVisible = profile?.is_company_admin || user?.email === "superadmin@linkship.com";

//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: false,
//         tabBarActiveTintColor: colors.accent,
//         tabBarInactiveTintColor: colors.textSecondary,
//         tabBarStyle: {
//           backgroundColor: colors.surface,
//           borderTopColor: colors.border,
//           height: Platform.OS === 'web'
//             ? 'calc(60px + env(safe-area-inset-bottom, 0px))' as any
//             : 60 + (insets.bottom > 0 ? insets.bottom - 4 : 0),
//           paddingBottom: Platform.OS === 'web'
//             ? 'calc(8px + env(safe-area-inset-bottom, 0px))' as any
//             : (insets.bottom > 0 ? insets.bottom : 8),
//           paddingTop: 8,
//           display: isDesktop ? 'none' : 'flex',
//         },
//         tabBarLabelStyle: {
//           fontSize: 12,
//           fontWeight: '600',
//         },
//       }}
//     >
//       <Tabs.Screen
//         name="index"
//         options={{
//           title: 'Chats',
//           tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
//         }}
//       />
//       <Tabs.Screen
//         name="dashboard"
//         options={{
//           title: 'Dashboard',
//           href: isDashboardVisible ? undefined : null,
//           tabBarIcon: ({ size, color }) => <LayoutDashboard size={size} color={color} />,
//         }}
//       />
//       <Tabs.Screen
//         name="profile"
//         options={{
//           title: 'Profile',
//           tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
//         }}
//       />
//       <Tabs.Screen
//         name="settings"
//         options={{
//           title: 'Settings',
//           href: null,
//           tabBarIcon: ({ size, color }) => <Settings size={size} color={color} />,
//         }}
//       />
//     </Tabs>
//   );
// }


import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/useAuth";
import { Tabs } from "expo-router";
import {
  Home,
  LayoutDashboard,
  Settings,
  User,
} from "lucide-react-native";
import { Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const isDesktop = Platform.OS === "web" && width >= 768;

  const isDashboardVisible =
    profile?.is_company_admin ||
    user?.email === "superadmin@linkship.com";

  const bottomInset =
    Platform.OS === "web"
      ? Math.max(insets.bottom, 10)
      : insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarHideOnKeyboard: true,

        tabBarActiveTintColor: colors.accent,

        tabBarInactiveTintColor: colors.textSecondary,

        tabBarStyle: {
          backgroundColor: colors.surface,

          borderTopColor: colors.border,

          borderTopWidth: 1,

          elevation: 15,

          shadowColor: "#000",

          shadowOffset: {
            width: 0,
            height: -3,
          },

          shadowOpacity: 0.08,

          shadowRadius: 8,

          height: 70 + bottomInset,

          paddingBottom: bottomInset,

          paddingTop: 8,

          display: isDesktop ? "none" : "flex",
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Chats",
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          href: isDashboardVisible ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}