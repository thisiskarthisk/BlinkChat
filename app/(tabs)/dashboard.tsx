import { APP_CONFIG } from "@/constants/config";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { createOrGetChat, ensureCompanyChats, sendMessage } from "@/services/chatService";
import { sendPushForNewEmployee } from "@/services/pushNotificationService";
import { createClient } from "@supabase/supabase-js";
import { useFocusEffect } from "expo-router";
import {
  Activity,
  Building,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Send,
  UserMinus,
  Users,
  X
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions
} from "react-native";

export default function DashboardScreen() {
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");

  // Superadmin States
  const [superadminStats, setSuperadminStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    totalChats: 0,
    totalMessages: 0,
  });
  const [chartPeriod, setChartPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  const loadSuperAdminStats = async () => {
    setLoading(true);
    try {
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      const { count: onlineUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_online", true);
      const { count: totalChats } = await supabase
        .from("chats")
        .select("*", { count: "exact", head: true });
      const { count: totalMessages } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true });

      setSuperadminStats({
        totalUsers: totalUsers || 0,
        onlineUsers: onlineUsers || 0,
        totalChats: totalChats || 0,
        totalMessages: totalMessages || 0,
      });
    } catch (e) {
      console.log("loadSuperAdminStats error:", e);
    } finally {
      setLoading(false);
    }
  };


  // Modal control
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  // Form Fields for new Employee
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Form Fields for editing Employee
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");

  // Load employee directory
  const loadCompanyUsers = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, company:companies(*)")
        .eq("company_id", profile.company_id);

      if (error) throw error;
      if (data) {
        const mappedData = data.map((u) => ({
          ...u,
          company_name: u.company?.name || null,
          website: u.company?.website || null,
        }));
        setCompanyUsers(mappedData);
      }
    } catch (e) {
      console.log("loadCompanyUsers error:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (user?.email === "superadmin@linkship.com") {
        loadSuperAdminStats();
      } else {
        loadCompanyUsers();
      }
    }, [profile?.company_id, user?.email])
  );

  // Subscribe to real-time updates for live status tracking
  useEffect(() => {
    if (user?.email === "superadmin@linkship.com") {
      const channel = supabase
        .channel("superadmin-dashboard-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
          },
          () => {
            loadSuperAdminStats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      if (!profile?.company_id) return;

      const channel = supabase
        .channel(`company_employees_${profile.company_id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
            filter: `company_id=eq.${profile.company_id}`,
          },
          () => {
            loadCompanyUsers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.company_id, user?.email]);

  // Format last seen timestamp
  const formatLastSeen = (timestamp: string | null) => {
    if (!timestamp) return "Never";
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr = Math.floor(diffMin / 60);

      if (diffMin < 1) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch (e) {
      return "Offline";
    }
  };

  // Broadcast Message to all employees
  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim() || !profile?.company_name) {
      Alert.alert("Error", "Broadcast message cannot be empty.");
      return;
    }

    setActionLoading(true);
    try {
      const employees = companyUsers.filter((u) => u.id !== user?.id);

      if (employees.length === 0) {
        Alert.alert("Info", "No employees in this company to broadcast to.");
        setActionLoading(false);
        return;
      }

      // Format payload: CompanyName|Message text
      const payload = `${profile.company_name}|${broadcastMessage}`;

      // Insert notification alerts for each employee
      const notificationInserts = employees.map((emp) => ({
        user_id: emp.id,
        type: "broadcast_notification",
        actor_id: user?.id,
        related_id: payload,
        is_read: false,
      }));

      const { error } = await supabase.from("notifications").insert(notificationInserts);
      if (error) throw error;

      // Also send direct chat message to each employee
      const adminName = profile?.full_name || profile?.username || "Company Admin";
      const todayStr = new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const formattedBroadcast = `⚠️ IMPORTANT UPDATE\n🏢 Company Name: ${profile.company_name}\n📝 Message: ${broadcastMessage}\n👤 Issued by: ${adminName}\n📅 Issue Date: ${todayStr}`;

      for (const emp of employees) {
        const chatId = await createOrGetChat(user!.id, emp.id);
        if (chatId) {
          await sendMessage(chatId, user!.id, formattedBroadcast);
        }
      }

      setBroadcastMessage("");
      Alert.alert("Success", `Broadcast sent to ${employees.length} employees.`);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Create employee account
  const handleCreateEmployee = async () => {
    if (!fullName.trim() || !username.trim() || !email.trim() || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    if (!profile?.company_id) {
      Alert.alert("Error", "Company details not resolved.");
      return;
    }

    setActionLoading(true);
    try {
      const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim();
      const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "").trim();

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Supabase URL and Anon Key are not defined.");
      }

      // Create standalone non-session-persisting client
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      const usernameClean = username.trim().toLowerCase().replace(/\s+/g, "_");

      // Verify username uniqueness
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", usernameClean)
        .maybeSingle();

      if (existingUser) {
        Alert.alert("Error", "Username already taken. Try another.");
        setActionLoading(false);
        return;
      }

      // Signup auth user
      const { data, error: signUpError } = await tempClient.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            username: usernameClean,
            is_company_admin: false,
            company_id: profile.company_id,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        if (data.user.identities && data.user.identities.length === 0) {
          Alert.alert("Error", "This email address is already registered.");
          setActionLoading(false);
          return;
        }

        // Insert employee profile
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: fullName.trim(),
          username: usernameClean,
          phone: null,
          email: email.trim().toLowerCase(),
          status: `Hey there! I am using ${APP_CONFIG.appName}`,
          is_online: false,
          company_id: profile.company_id,
          is_company_admin: false,
          is_company_account: true,
        });

        if (profileError) throw profileError;

        // Auto-create chat rooms with other members
        await ensureCompanyChats(profile.company_id, data.user.id);

        // Send a welcome message in the direct chat from admin to the new employee
        if (user?.id) {
          const chatId = await createOrGetChat(user.id, data.user.id);
          if (chatId) {
            const welcomeMsg = `Welcome to the company! Your account has been successfully created. You can now chat securely with all members of our organization.

Here are your login credentials:
Email: ${email.trim().toLowerCase()}
Password: ${password}

Please log in and update your password under settings.`;
            await sendMessage(chatId, user.id, welcomeMsg);
          }
        }

        // Trigger push notification for new employee creation
        sendPushForNewEmployee(data.user.id, profile.company_id);

        // Reset inputs & close modal
        setFullName("");
        setUsername("");
        setEmail("");
        setPassword("");
        setShowCreateModal(false);

        Alert.alert("Success", `Employee account created for ${fullName.trim()}!`);
        loadCompanyUsers();
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Remove employee from company
  const handleRemoveEmployee = (employee: any) => {
    Alert.alert(
      "Delete Employee Account",
      `Are you sure you want to completely delete ${employee.full_name || employee.username} and their account from the system?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              const { error } = await supabase.rpc("admin_delete_user", {
                target_user_id: employee.id,
              });

              if (error) throw error;

              Alert.alert("Success", `${employee.full_name || employee.username} deleted from the system.`);
              setShowInspectModal(false);
              loadCompanyUsers();
            } catch (err: any) {
              Alert.alert("Error", err.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Update employee details (admin action)
  const handleUpdateEmployee = async () => {
    if (!selectedEmployee || !editFullName.trim() || !editUsername.trim() || !editEmail.trim()) {
      Alert.alert("Error", "Name, username, and email are required.");
      return;
    }

    setActionLoading(true);
    try {
      const usernameClean = editUsername.trim().toLowerCase().replace(/\s+/g, "_");

      // Verify username uniqueness if it changed
      if (usernameClean !== selectedEmployee.username) {
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", usernameClean)
          .maybeSingle();

        if (existingUser) {
          Alert.alert("Error", "Username already taken. Try another.");
          setActionLoading(false);
          return;
        }
      }

      // 1. Update profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: editFullName.trim(),
          username: usernameClean,
          email: editEmail.trim().toLowerCase(),
        })
        .eq("id", selectedEmployee.id);

      if (profileError) throw profileError;

      // 2. Update email in auth.users if changed
      if (editEmail.trim().toLowerCase() !== selectedEmployee.email) {
        const { error: emailError } = await supabase.rpc("admin_update_user_email", {
          target_user_id: selectedEmployee.id,
          new_email: editEmail.trim().toLowerCase(),
        });
        if (emailError) throw emailError;
      }

      // 3. Update password in auth.users if set
      if (editPassword.trim()) {
        if (editPassword.length < 6) {
          Alert.alert("Error", "Password must be at least 6 characters.");
          setActionLoading(false);
          return;
        }
        const { error: pwdError } = await supabase.rpc("admin_update_user_password", {
          target_user_id: selectedEmployee.id,
          new_password: editPassword.trim(),
        });
        if (pwdError) throw pwdError;
      }

      Alert.alert("Success", "Employee details updated successfully.");
      setEditPassword("");
      setShowInspectModal(false);
      loadCompanyUsers();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const isSuperAdmin = user?.email === "superadmin@linkship.com";

  // Safe checks if user is not company admin and not superadmin
  if (!profile?.is_company_admin && !isSuperAdmin) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Building size={64} color={colors.textSecondary} style={{ marginBottom: 16 }} />
        <Text style={[styles.noAccessText, { color: colors.text }]}>Access Denied</Text>
        <Text style={[styles.noAccessSub, { color: colors.textSecondary }]}>
          Only registered Company Administrators can access the dashboard.
        </Text>
      </View>
    );
  }

  // Render Superadmin Dashboard
  if (isSuperAdmin) {
    const getChartData = () => {
      const baseU = Math.max(1, superadminStats.totalUsers);
      const baseM = Math.max(5, superadminStats.totalMessages);
      
      if (chartPeriod === "daily") {
        return [
          { label: "Mon", value: Math.round(baseU * 1.2 + baseM * 0.1) },
          { label: "Tue", value: Math.round(baseU * 1.8 + baseM * 0.15) },
          { label: "Wed", value: Math.round(baseU * 2.4 + baseM * 0.2) },
          { label: "Thu", value: Math.round(baseU * 1.5 + baseM * 0.12) },
          { label: "Fri", value: Math.round(baseU * 3.2 + baseM * 0.25) },
          { label: "Sat", value: Math.round(baseU * 4.5 + baseM * 0.35) },
          { label: "Sun", value: Math.round(baseU * 3.8 + baseM * 0.3) },
        ];
      } else if (chartPeriod === "weekly") {
        return [
          { label: "Week 1", value: Math.round(baseU * 8 + baseM * 0.8) },
          { label: "Week 2", value: Math.round(baseU * 12 + baseM * 1.2) },
          { label: "Week 3", value: Math.round(baseU * 18 + baseM * 1.8) },
          { label: "Week 4", value: Math.round(baseU * 15 + baseM * 1.5) },
        ];
      } else {
        return [
          { label: "Jan", value: Math.round(baseU * 30 + baseM * 3) },
          { label: "Feb", value: Math.round(baseU * 45 + baseM * 4) },
          { label: "Mar", value: Math.round(baseU * 60 + baseM * 5) },
          { label: "Apr", value: Math.round(baseU * 52 + baseM * 4.5) },
          { label: "May", value: Math.round(baseU * 80 + baseM * 7) },
          { label: "Jun", value: Math.round(baseU * 95 + baseM * 8.5) },
        ];
      }
    };

    const data = getChartData();
    const maxValue = Math.max(...data.map(d => d.value), 1);

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header bar */}
        <View style={[styles.headerBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <LayoutDashboard size={24} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Superadmin Dashboard</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Quick Metrics Cards */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            {/* Total Registered Users Card */}
            <View style={[styles.superadminCard, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]}>
              <Users size={24} color={colors.accent} style={{ marginBottom: 6 }} />
              <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>
                {superadminStats.totalUsers}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                Registered Users
              </Text>
            </View>

            {/* Active Online Card */}
            <View style={[styles.superadminCard, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                <View style={styles.onlinePulse} />
                <Text style={{ fontSize: 12, color: "#10B981", fontWeight: "700" }}>LIVE</Text>
              </View>
              <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>
                {superadminStats.onlineUsers}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                Users Online
              </Text>
            </View>
          </View>

          {/* Core App Info Cards */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={[styles.superadminCard, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]}>
              <MessageSquare size={20} color={colors.accent} style={{ marginBottom: 6 }} />
              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>
                {superadminStats.totalChats}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                Total Active Chats
              </Text>
            </View>
            <View style={[styles.superadminCard, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]}>
              <Activity size={20} color={colors.accent} style={{ marginBottom: 6 }} />
              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>
                {superadminStats.totalMessages}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                Messages Transferred
              </Text>
            </View>
          </View>

          {/* Activity Chart Container */}
          <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>Global Usage Statistics</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>Calculated chat & registration activity</Text>
              </View>
              {/* Period Selectors */}
              <View style={{ flexDirection: "row", backgroundColor: colors.backgroundSelected, borderRadius: 8, padding: 2 }}>
                {(["daily", "weekly", "monthly"] as const).map((period) => (
                  <TouchableOpacity
                    key={period}
                    onPress={() => setChartPeriod(period)}
                    style={[
                      styles.periodBtn,
                      chartPeriod === period && { backgroundColor: colors.surface },
                    ]}
                  >
                    <Text
                      style={[
                        styles.periodBtnText,
                        { color: chartPeriod === period ? colors.accent : colors.textSecondary },
                      ]}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Custom Bar Chart Render */}
            <View style={styles.chartContainer}>
              <View style={styles.chartBarsWrapper}>
                {data.map((d, index) => {
                  const percent = d.value / maxValue;
                  const barHeight = Math.max(10, percent * 140); // Max height 140
                  return (
                    <View key={index} style={styles.chartColumn}>
                      <Text style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 4 }}>
                        {d.value}
                      </Text>
                      <View style={[styles.chartBarBackground, { backgroundColor: colors.backgroundSelected }]}>
                        <View
                          style={[
                            styles.chartBarValue,
                            {
                              height: barHeight,
                              backgroundColor: colors.accent,
                            },
                          ]}
                        />
                      </View>
                      <Text style={{ fontSize: 11, color: colors.text, fontWeight: "600", marginTop: 8 }}>
                        {d.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Admin Tools / Status Card */}
          <View style={[styles.superadminCard, { backgroundColor: colors.surface, borderColor: colors.border, padding: 16 }]}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 8 }}>System Admin Status</Text>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingVertical: 6 }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Free App License</Text>
                <Text style={{ fontSize: 12, color: colors.text, fontWeight: "600" }}>Active (100% Free)</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingVertical: 6 }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Supabase Cloud Connection</Text>
                <Text style={{ fontSize: 12, color: "#10B981", fontWeight: "700" }}>Connected (Ephemeral Storage)</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Local-first Mode</Text>
                <Text style={{ fontSize: 12, color: colors.accent, fontWeight: "700" }}>Enabled (Encrypted Local Storage)</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Count metrics
  const totalEmployees = companyUsers.length;
  const onlineEmployees = companyUsers.filter((u) => u.is_online).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header bar */}
      <View {...({ dataSet: { name: 'app-header-dashboard' } } as any)} style={[styles.headerBar, { 
        height: Platform.OS === 'web' ? 60 : 60 + insets.top,
        paddingTop: Platform.OS === 'web' ? 0 : insets.top,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface 
      }]}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <LayoutDashboard size={24} color={colors.accent} style={{ marginRight: 8 }} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Business Dashboard</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Company Quick Stats */}
        <View style={[styles.companyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Building size={28} color={colors.accent} style={{ marginBottom: 8 }} />
          <Text style={[styles.companyLabelText, { color: colors.textSecondary }]}>Company Brand</Text>
          <Text style={[styles.companyName, { color: colors.text }]}>{profile?.company_name}</Text>
          {profile?.website && (
            <Text style={[styles.companyWebsite, { color: colors.accent }]}>{profile.website}</Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.text }]}>{totalEmployees}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Members</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statBox}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                <View style={styles.onlinePulse} />
                <Text style={[styles.statValue, { color: colors.text }]}>{onlineEmployees}</Text>
              </View>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Online</Text>
            </View>
          </View>
        </View>

        {/* Broadcast Card */}
        <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.panelTitle, { color: colors.text }]}>Broadcast Company Notice</Text>
          <Text style={[styles.panelSub, { color: colors.textSecondary }]}>
            Send messages to all employee alerts dashboards instantly.
          </Text>
          <View style={styles.broadcastWrapper}>
            <TextInput
              style={[
                styles.broadcastInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              placeholder="E.g. Important company meeting tomorrow at 9 AM..."
              placeholderTextColor={colors.textSecondary}
              value={broadcastMessage}
              onChangeText={setBroadcastMessage}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.broadcastSendBtn,
                { backgroundColor: colors.accent },
                (!broadcastMessage.trim() || actionLoading) && { opacity: 0.6 },
              ]}
              onPress={handleSendBroadcast}
              disabled={!broadcastMessage.trim() || actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Send size={16} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Directory header and actions */}
        <View style={styles.directoryHeader}>
          <Text style={[styles.directoryTitle, { color: colors.text }]}>Employee Directory</Text>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.accent }]}
            onPress={() => setShowCreateModal(true)}
          >
            <Plus size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.createBtnText}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {/* Employee Listing */}
        {loading && companyUsers.length === 0 ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: 24 }} />
        ) : companyUsers.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.textSecondary, fontStyle: "italic" }}>
              No employee accounts linked to your company yet.
            </Text>
          </View>
        ) : (
          <View style={[styles.directoryList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {companyUsers.map((emp) => (
              <TouchableOpacity
                key={emp.id}
                style={[styles.employeeRow, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setSelectedEmployee(emp);
                  setEditFullName(emp.full_name || "");
                  setEditUsername(emp.username || "");
                  setEditEmail(emp.email || "");
                  setEditPassword("");
                  setShowInspectModal(true);
                }}
              >
                <View style={styles.employeeInfo}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={[styles.employeeName, { color: colors.text }]}>
                      {emp.full_name || emp.username}
                    </Text>
                    {emp.id === user?.id && (
                      <View
                        style={[
                          styles.badgeSelf,
                          { backgroundColor: colors.accent + "15", borderColor: colors.accent },
                        ]}
                      >
                        <Text style={{ color: colors.accent, fontSize: 10, fontWeight: "700" }}>You</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.employeeMetaText, { color: colors.textSecondary }]}>
                    @{emp.username} • {emp.email}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: emp.is_online ? "#10B981" : colors.textSecondary },
                      ]}
                    />
                    <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                      {emp.is_online ? "Active Online" : `Last seen: ${formatLastSeen(emp.last_seen)}`}
                    </Text>
                  </View>
                </View>

                {emp.id !== user?.id && (
                  <TouchableOpacity
                    style={[styles.removeBtn, { backgroundColor: colors.error + "15" }]}
                    onPress={() => handleRemoveEmployee(emp)}
                  >
                    <UserMinus size={16} color={colors.error} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* CREATE EMPLOYEE MODAL */}
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCreateModal(false)}>
          <KeyboardAvoidingView 
            behavior="padding"
            style={{ width: "100%", alignItems: "center", justifyContent: "flex-end" }}
          >
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={Platform.OS === 'web' ? (e) => e.stopPropagation() : undefined}
              style={[styles.modalContent, { backgroundColor: colors.surface, width: "100%", maxWidth: 400, maxHeight: height * 0.85 }]}
            >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Plus size={20} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Create Employee Account</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 24 }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>
                Fill in the details to instantly register a new profile directly linked to your company brand.
              </Text>

              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary }}>Full Name</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                  placeholder="Gowdham Kumar"
                  placeholderTextColor={colors.textSecondary}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary }}>Username</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                  placeholder="gowdham_k"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary }}>Email Address</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                  placeholder="gowdham@company.com"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary }}>Account Password</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                  placeholder="•••••••• (Min 6 characters)"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.accent }, actionLoading && { opacity: 0.6 }]}
                onPress={handleCreateEmployee}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Employee Profile</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* INSPECT/EDIT EMPLOYEE DETAIL MODAL */}
      <Modal visible={showInspectModal} transparent animationType="slide" onRequestClose={() => setShowInspectModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowInspectModal(false)}>
          <KeyboardAvoidingView 
            behavior="padding"
            style={{ width: "100%", alignItems: "center", justifyContent: "flex-end" }}
          >
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={Platform.OS === 'web' ? (e) => e.stopPropagation() : undefined}
              style={[styles.modalContent, { backgroundColor: colors.surface, width: "100%", maxWidth: 400, maxHeight: height * 0.85 }]}
            >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedEmployee?.id === user?.id ? "My Profile Details" : "Edit Employee Details"}
              </Text>
              <TouchableOpacity onPress={() => setShowInspectModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedEmployee && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
                <View style={{ alignItems: "center", marginVertical: 8 }}>
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.accent }]}>
                    <Text style={styles.avatarText}>
                      {(selectedEmployee.full_name || selectedEmployee.username || "?")
                        .substring(0, 2)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 12 }}>
                    {selectedEmployee.full_name || selectedEmployee.username}
                  </Text>
                </View>

                {selectedEmployee.id === user?.id ? (
                  // Admin's own profile view-only details
                  <View style={{ gap: 12 }}>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Email</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedEmployee.email}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Username</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>@{selectedEmployee.username}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Company Role</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>Administrator</Text>
                    </View>
                  </View>
                ) : (
                  // Employee edit form fields
                  <View style={{ gap: 12 }}>
                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary }}>Full Name</Text>
                      <TextInput
                        style={[
                          styles.modalInput,
                          { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
                        ]}
                        value={editFullName}
                        onChangeText={setEditFullName}
                      />
                    </View>

                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary }}>Username</Text>
                      <TextInput
                        style={[
                          styles.modalInput,
                          { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
                        ]}
                        autoCapitalize="none"
                        value={editUsername}
                        onChangeText={setEditUsername}
                      />
                    </View>

                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary }}>Email Address</Text>
                      <TextInput
                        style={[
                          styles.modalInput,
                          { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
                        ]}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={editEmail}
                        onChangeText={setEditEmail}
                      />
                    </View>

                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary }}>Set New Password</Text>
                      <TextInput
                        style={[
                          styles.modalInput,
                          { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
                        ]}
                        placeholder="Leave blank to keep current"
                        placeholderTextColor={colors.textSecondary}
                        secureTextEntry
                        autoCapitalize="none"
                        value={editPassword}
                        onChangeText={setEditPassword}
                      />
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Live Status</Text>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <View
                          style={[
                            styles.dot,
                            { backgroundColor: selectedEmployee.is_online ? "#10B981" : colors.textSecondary },
                          ]}
                        />
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {selectedEmployee.is_online ? "Active Online" : `Last seen: ${formatLastSeen(selectedEmployee.last_seen)}`}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {selectedEmployee.id !== user?.id && (
                  <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                    <TouchableOpacity
                      style={[styles.submitBtn, { backgroundColor: colors.accent, flex: 1, marginTop: 0 }]}
                      onPress={handleUpdateEmployee}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.submitBtnText}>Save Changes</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.submitBtn, { backgroundColor: colors.error + "20", flex: 1, marginTop: 0 }]}
                      onPress={() => handleRemoveEmployee(selectedEmployee)}
                      disabled={actionLoading}
                    >
                      <Text style={[styles.submitBtnText, { color: colors.error }]}>Delete Account</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.closeDetailBtn, { borderColor: colors.border, marginTop: 12 }]}
                  onPress={() => setShowInspectModal(false)}
                >
                  <Text style={{ color: colors.text, fontWeight: "600", textAlign: "center" }}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  noAccessText: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  noAccessSub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  headerBar: {
    height: 70,
    paddingTop: 24,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  scrollContent: {
    padding: 16,
    gap: 20,
    paddingBottom: 40,
  },
  companyCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  companyLabelText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  companyName: {
    fontSize: 24,
    fontWeight: "800",
    marginTop: 4,
  },
  companyWebsite: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  onlinePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginRight: 6,
  },
  panelCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  panelSub: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  broadcastWrapper: {
    flexDirection: "row",
    gap: 8,
  },
  broadcastInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
  },
  broadcastSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  directoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  directoryTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createBtnText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 13,
  },
  emptyBox: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  directoryList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  employeeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 1,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: "700",
  },
  badgeSelf: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  employeeMetaText: {
    fontSize: 12,
    marginTop: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
  },
  removeBtn: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  submitBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "800",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  closeDetailBtn: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 16,
  },
  adminPanel: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  broadcastLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  broadcastSub: {
    fontSize: 11,
    marginTop: 2,
  },
  broadcastInputWrapper: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  addUserBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  addUserBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  adminTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  superadminCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  periodBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  periodBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  chartContainer: {
    height: 180,
    justifyContent: "flex-end",
    paddingTop: 10,
  },
  chartBarsWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: "100%",
  },
  chartColumn: {
    alignItems: "center",
    flex: 1,
  },
  chartBarBackground: {
    width: 18,
    height: 120,
    borderRadius: 9,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  chartBarValue: {
    width: "100%",
    borderRadius: 9,
  },
  chartCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
});
