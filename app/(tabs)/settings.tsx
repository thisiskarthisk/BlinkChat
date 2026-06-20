import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import {
  User,
  Settings,
  Shield,
  Palette,
  Database,
  Building,
  LogOut,
  Camera,
  ChevronRight,
  Check,
  Plus,
  Send,
  X,
  AlertTriangle,
  Download,
  Trash2,
  Lock,
  LayoutDashboard,
} from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/use-theme";
import { Themes, ThemeName } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import {
  checkAutoDeletePolicy,
  updateAutoDeletePolicy,
  backupAllData,
  performFullDataWipe,
  AutoDeleteInfo,
} from "@/services/storageService";
import { ensureCompanyChats } from "@/services/chatService";

const { width } = Dimensions.get("window");

export default function SettingsScreen() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const { themeName, setTheme, colors, isDark } = useTheme();

  // Settings state
  const [loading, setLoading] = useState(false);
  const [autoDeleteInfo, setAutoDeleteInfo] = useState<AutoDeleteInfo | null>(null);
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(false);
  const [autoDeleteDays, setAutoDeleteDays] = useState(7);
  const [countdownText, setCountdownText] = useState("");

  // PIN & Privacy state
  const [chatPin, setChatPin] = useState("");
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [showPinSetupModal, setShowPinSetupModal] = useState(false);
  const [newPin, setNewPin] = useState("");

  // Profile Edit modal
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");

  // Avatar Lightbox/Modal preview
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false);

  // Company management state
  const [showCompanySetup, setShowCompanySetup] = useState(false);
  const [companyNameInput, setCompanyNameInput] = useState("");
  const [isCompanyAdminInput, setIsCompanyAdminInput] = useState(false);
  
  // Admin dashboard state
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showUserAddModal, setShowUserAddModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState("");

  // Create Employee Account fields
  const [isCreatingNewUser, setIsCreatingNewUser] = useState(false);
  const [newEmployeeEmail, setNewEmployeeEmail] = useState("");
  const [newEmployeePassword, setNewEmployeePassword] = useState("");
  const [newEmployeeFullName, setNewEmployeeFullName] = useState("");
  const [newEmployeeUsername, setNewEmployeeUsername] = useState("");

  // Load configuration
  const loadConfig = async () => {
    if (!user?.id) return;
    try {
      // 1. Load auto-delete config
      const info = await checkAutoDeletePolicy(user.id);
      setAutoDeleteInfo(info);
      setAutoDeleteEnabled(info.enabled);
      setAutoDeleteDays(info.days);

      // 2. Load PIN & Biometrics config
      const pin = await AsyncStorage.getItem(`chat_pin_${user.id}`);
      setChatPin(pin || "");

      const bio = await AsyncStorage.getItem(`biometrics_enabled_${user.id}`);
      setBiometricsEnabled(bio === "true");

      // 3. Setup edit fields from profile
      if (profile) {
        setEditFullName(profile.full_name || "");
        setEditUsername(profile.username || "");
        setEditStatus(profile.status || "Hey there!");
        setEditAvatarUrl(profile.avatar_url || "");
        setCompanyNameInput(profile.company_name || "");
        setIsCompanyAdminInput(profile.is_company_admin);
      }

      // 4. Load company items if applicable (for both Admin and Employees)
      if (profile?.company_id) {
        loadCompanyUsers(profile.company_id);
      } else if (profile?.company_name) {
        loadCompanyUsers(profile.company_name);
      }
    } catch (e) {
      console.log("loadConfig error:", e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadConfig();
    }, [user?.id, profile])
  );

  // Auto-delete warning ticking countdown
  useEffect(() => {
    if (!autoDeleteInfo?.enabled || autoDeleteInfo.timeLeftMs <= 0) {
      setCountdownText("");
      return;
    }

    let remaining = autoDeleteInfo.timeLeftMs;
    const interval = setInterval(() => {
      remaining -= 1000;
      if (remaining <= 0) {
        clearInterval(interval);
        loadConfig();
      } else {
        const d = Math.floor(remaining / (24 * 60 * 60 * 1000));
        const h = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const m = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        const s = Math.floor((remaining % (60 * 1000)) / 1000);
        
        let label = "";
        if (d > 0) label += `${d}d `;
        label += `${h}h ${m}m ${s}s`;
        setCountdownText(label);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [autoDeleteInfo]);

  // Load company employees
  const loadCompanyUsers = async (compIdOrName: string) => {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(compIdOrName);
      
      let query = supabase.from("profiles").select("*, company:companies(*)");
      if (isUuid) {
        query = query.eq("company_id", compIdOrName);
      } else {
        const { data: comp } = await supabase.from("companies").select("id").eq("name", compIdOrName).maybeSingle();
        if (comp) {
          query = query.eq("company_id", comp.id);
        } else {
          return;
        }
      }

      const { data } = await query;
      if (data) {
        const mappedData = data.map(u => ({
          ...u,
          company_name: u.company?.name || null,
          website: u.company?.website || null,
        }));
        setCompanyUsers(mappedData);
      }
    } catch (e) {
      console.log(e);
    }
  };

  // Profile Edit save
  const handleSaveProfile = async () => {
    if (!user?.id || !editFullName.trim() || !editUsername.trim()) {
      Alert.alert("Error", "Name and Username are required.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editFullName,
          username: editUsername,
          status: editStatus,
          avatar_url: editAvatarUrl || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      updateProfile({
        full_name: editFullName,
        username: editUsername,
        status: editStatus,
        avatar_url: editAvatarUrl || null,
      });

      setShowProfileEdit(false);
      Alert.alert("Success", "Profile updated successfully.");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Enable/Disable auto-delete retention policy
  const handleToggleAutoDelete = async (value: boolean) => {
    setAutoDeleteEnabled(value);
    await updateAutoDeletePolicy(value, autoDeleteDays);
    loadConfig();
  };

  // Change retention policy period days
  const handleChangeDays = async (days: number) => {
    setAutoDeleteDays(days);
    await updateAutoDeletePolicy(autoDeleteEnabled, days);
    loadConfig();
  };

  // Backup all data to local filesystem
  const handleBackup = async () => {
    if (!user?.id) return;
    setLoading(true);
    const success = await backupAllData(user.id);
    setLoading(false);
    if (success) {
      Alert.alert("Success", "Backup generated and ready to save.");
    } else {
      Alert.alert("Error", "Failed to generate backup.");
    }
  };

  // Direct wipe of all chats & media
  const handleWipeData = () => {
    Alert.alert(
      "Wipe All Chats & Media",
      "Are you absolutely sure? This will delete all chat history and cached media files from BOTH local storage and Supabase database. This action CANNOT be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Wipe Everything",
          style: "destructive",
          onPress: async () => {
            if (!user?.id) return;
            setLoading(true);
            await performFullDataWipe(user.id);
            loadConfig();
            setLoading(false);
            Alert.alert("Success", "All chat history and media cleared.");
          },
        },
      ]
    );
  };

  // Setup Global 4-digit PIN
  const handleSavePin = async () => {
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      Alert.alert("Error", "PIN must be exactly 4 digits.");
      return;
    }
    if (!user?.id) return;
    await AsyncStorage.setItem(`chat_pin_${user.id}`, newPin);
    setChatPin(newPin);
    setNewPin("");
    setShowPinSetupModal(false);
    Alert.alert("Success", "Chat PIN updated.");
  };

  // Toggle biometrics usage
  const handleToggleBiometrics = async (value: boolean) => {
    if (!user?.id) return;
    if (value) {
      // Test if biometrics are supported/enrolled
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert("Not Supported", "Biometric enrollment not found on this device.");
        return;
      }

      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirm identity to enable Biometric Lock",
      });

      if (res.success) {
        await AsyncStorage.setItem(`biometrics_enabled_${user.id}`, "true");
        setBiometricsEnabled(true);
      }
    } else {
      await AsyncStorage.setItem(`biometrics_enabled_${user.id}`, "false");
      setBiometricsEnabled(false);
    }
  };

  // Join or register Company Name
  const handleSaveCompanySetup = async () => {
    if (!user?.id || !companyNameInput.trim()) {
      Alert.alert("Error", "Company Name cannot be empty.");
      return;
    }
    setLoading(true);
    try {
      // 1. Ensure company row exists
      let companyId: string | null = null;
      const { data: existingComp } = await supabase
        .from("companies")
        .select("id")
        .eq("name", companyNameInput.trim())
        .maybeSingle();

      if (existingComp) {
        companyId = existingComp.id;
      } else {
        const { data: newComp, error: compErr } = await supabase
          .from("companies")
          .insert({
            name: companyNameInput.trim(),
            website: profile?.website || null,
          })
          .select()
          .single();
        if (compErr) throw compErr;
        if (newComp) companyId = newComp.id;
      }

      // 2. Update user profile
      const { error } = await supabase
        .from("profiles")
        .update({
          company_id: companyId,
          is_company_admin: isCompanyAdminInput,
        })
        .eq("id", user.id);

      if (error) throw error;

      await ensureCompanyChats(companyId || companyNameInput.trim(), user.id);

      updateProfile({
        company_id: companyId,
        company_name: companyNameInput.trim(),
        is_company_admin: isCompanyAdminInput,
      });

      setShowCompanySetup(false);
      Alert.alert("Success", `Registered with ${companyNameInput.trim()}.`);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  // Find users in system to directly add to the company (Admin flow)
  const openUserAddModal = async () => {
    setAdminLoading(true);
    setShowUserAddModal(true);
    try {
      // Find all profiles not belonging to any company or another company
      const { data } = await supabase
        .from("profiles")
        .select("*, company:companies(*)")
        .neq("id", user?.id || "");
      if (data) {
        const mappedData = data.map(u => ({
          ...u,
          company_name: u.company?.name || null,
          website: u.company?.website || null,
        }));
        setAllUsers(mappedData);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setAdminLoading(false);
    }
  };

  // Directly assign user to company (Admin flow, NO request sent)
  const handleDirectAddUser = async (targetUser: any) => {
    if (!profile?.company_name) return;
    setAdminLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          company_id: profile.company_id || null,
          is_company_admin: false,
        })
        .eq("id", targetUser.id);

      if (error) throw error;

      await ensureCompanyChats(profile.company_id || profile.company_name, targetUser.id);

      // Update state local list
      setCompanyUsers((prev) => [...prev, { ...targetUser, company_id: profile.company_id, company_name: profile.company_name }]);
      setAllUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      
      Alert.alert("Success", `${targetUser.full_name || targetUser.username} added to company.`);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setAdminLoading(false);
    }
  };

  // Directly create and sign up employee account (without signing out admin)
  const handleCreateEmployeeAccount = async () => {
    if (!newEmployeeEmail.trim() || !newEmployeePassword || !newEmployeeFullName.trim() || !newEmployeeUsername.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (newEmployeePassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    if (!profile?.company_name || !profile?.company_id) {
      Alert.alert("Error", "Your company details are not set. Please update your details first.");
      return;
    }

    setAdminLoading(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Supabase credentials not configured in environment.");
      }

      // Create a temporary client that does NOT persist the session
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      // 1. Check if username is already taken
      const usernameClean = newEmployeeUsername.trim().toLowerCase().replace(/\s+/g, "_");
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", usernameClean)
        .maybeSingle();

      if (existingUser) {
        Alert.alert("Error", "Username already taken. Try another.");
        setAdminLoading(false);
        return;
      }

      // 2. SignUp the user via temporary client
      const { data, error: signUpError } = await tempClient.auth.signUp({
        email: newEmployeeEmail.trim().toLowerCase(),
        password: newEmployeePassword,
        options: {
          data: {
            full_name: newEmployeeFullName.trim(),
            username: usernameClean,
            company_name: profile.company_name,
            is_company_admin: false,
            company_id: profile.company_id,
          }
        }
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // If identities is empty, the email is already in use by another account
        if (data.user.identities && data.user.identities.length === 0) {
          Alert.alert("Error", "This email is already registered in the system.");
          setAdminLoading(false);
          return;
        }

        // 3. Insert profile manually
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: newEmployeeFullName.trim(),
          username: usernameClean,
          phone: null,
          email: newEmployeeEmail.trim().toLowerCase(),
          status: "Hey there! I am using BlinkChat",
          is_online: false,
          company_id: profile.company_id,
          is_company_admin: false,
        });

        if (profileError) throw profileError;

        // 4. Ensure Company Chats exist between them and all other company members
        await ensureCompanyChats(profile.company_id || profile.company_name, data.user.id);

        // 5. Update local state list of company users
        const newEmployee = {
          id: data.user.id,
          full_name: newEmployeeFullName.trim(),
          username: usernameClean,
          email: newEmployeeEmail.trim().toLowerCase(),
          company_name: profile.company_name,
          company_id: profile.company_id,
          is_company_admin: false,
        };
        setCompanyUsers((prev) => [...prev, newEmployee]);

        // Reset fields and close modal
        setNewEmployeeEmail("");
        setNewEmployeePassword("");
        setNewEmployeeFullName("");
        setNewEmployeeUsername("");
        setIsCreatingNewUser(false);
        setShowUserAddModal(false);

        Alert.alert("Success", `Employee account created for ${newEmployeeFullName.trim()} and added to company.`);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setAdminLoading(false);
    }
  };

  // Broadcast Notification to all employees (Company-branded)
  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim() || !profile?.company_name) {
      Alert.alert("Error", "Message cannot be empty.");
      return;
    }
    setAdminLoading(true);
    try {
      // Find all employees of the company except the admin
      const employees = companyUsers.filter((u) => u.id !== user?.id);

      if (employees.length === 0) {
        Alert.alert("Info", "No employee users in this company to broadcast to.");
        setAdminLoading(false);
        return;
      }

      // Payload structure: CompanyName|BroadcastText
      const payload = `${profile.company_name}|${broadcastMessage}`;

      const insertData = employees.map((emp) => ({
        user_id: emp.id,
        type: "company_broadcast",
        actor_id: user?.id,
        related_id: payload,
        is_read: false,
      }));

      const { error } = await supabase.from("notifications").insert(insertData);
      if (error) throw error;

      setBroadcastMessage("");
      Alert.alert("Success", `Broadcast sent to ${employees.length} employees.`);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0][0].toUpperCase();
  };

  const currentProfileName = profile?.full_name || profile?.username || "User";
  const userInitials = getInitials(currentProfileName);

  // Search filtered users in add modal
  const filteredUsers = allUsers.filter((u) => {
    const term = searchUserQuery.toLowerCase();
    const isNotInCompany = u.company_name !== profile?.company_name;
    const nameMatch = (u.full_name || "").toLowerCase().includes(term) || (u.username || "").toLowerCase().includes(term);
    return isNotInCompany && nameMatch;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Retention Policy Ticking Alert Warning */}
        {autoDeleteInfo?.enabled && autoDeleteInfo.triggerWarning && (
          <View style={[styles.warningBanner, { backgroundColor: colors.error + "20", borderColor: colors.error }]}>
            <AlertTriangle size={22} color={colors.error} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.warningTitle, { color: colors.error }]}>Data Purge Warning</Text>
              <Text style={[styles.warningDesc, { color: colors.text }]}>
                {autoDeleteInfo.warningText}
              </Text>
              <Text style={[styles.countdown, { color: colors.error }]}>
                Time Remaining: {countdownText}
              </Text>
              <TouchableOpacity style={[styles.warningBackupBtn, { backgroundColor: colors.accent }]} onPress={handleBackup}>
                <Download size={14} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.warningBackupText}>Backup Chats Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Profile Card Section */}
        <View style={[styles.profileSection, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => setShowAvatarLightbox(true)} style={styles.avatarWrapper}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.accent }]}>
                <Text style={styles.avatarInitials}>{userInitials}</Text>
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: colors.accent }]}>
              <Camera size={14} color="#FFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.profileDetails}>
            <Text style={[styles.profileName, { color: colors.text }]}>{currentProfileName}</Text>
            <Text style={[styles.profileUsername, { color: colors.textSecondary }]}>@{profile?.username || "username"}</Text>
            <Text style={[styles.profileStatus, { color: colors.textSecondary }]} numberOfLines={1}>
              {profile?.status || "Hey there! I am using BlinkChat"}
            </Text>
          </View>

          <TouchableOpacity style={[styles.editProfileBtn, { backgroundColor: colors.backgroundSelected }]} onPress={() => setShowProfileEdit(true)}>
            <Text style={[styles.editProfileText, { color: colors.text }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Themes Changer Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Palette size={20} color={colors.accent} style={{ marginRight: 10 }} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>App Palette & Theme</Text>
          </View>
          <Text style={[styles.subText, { color: colors.textSecondary }]}>
            Change the layout visuals instantly. Dark and Light configurations available.
          </Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themesRow}>
            {Object.keys(Themes).map((key) => {
              const item = Themes[key as ThemeName];
              const isSelected = themeName === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.themeChip,
                    { backgroundColor: item.background, borderColor: isSelected ? colors.accent : item.border },
                    isSelected && { borderWidth: 2 },
                  ]}
                  onPress={() => setTheme(key as ThemeName)}
                >
                  <View style={[styles.themePreviewColor, { backgroundColor: item.accent }]} />
                  <Text style={[styles.themeChipText, { color: item.text }]}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Text>
                  {isSelected && (
                    <View style={[styles.themeSelectedCheck, { backgroundColor: colors.accent }]}>
                      <Check size={10} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Data Cleanup & Retention Settings Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Database size={20} color={colors.accent} style={{ marginRight: 10 }} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Retention & Backup</Text>
          </View>

          {/* Auto delete toggle */}
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Auto-Delete App Data</Text>
              <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                Automatically clear older chats and media periodically
              </Text>
            </View>
            <Switch
              value={autoDeleteEnabled}
              onValueChange={handleToggleAutoDelete}
              thumbColor={autoDeleteEnabled ? colors.accent : "#ccc"}
              trackColor={{ true: colors.accent + "50", false: "#eee" }}
            />
          </View>

          {/* Custom days selectors */}
          {autoDeleteEnabled && (
            <View style={styles.daysSelectorSection}>
              <Text style={[styles.daysSelectorLabel, { color: colors.text }]}>Retention Period</Text>
              <View style={styles.daysContainer}>
                {[3, 7, 15, 30].map((d) => {
                  const active = autoDeleteDays === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.dayChip,
                        { backgroundColor: active ? colors.accent : colors.backgroundSelected },
                      ]}
                      onPress={() => handleChangeDays(d)}
                    >
                      <Text style={[styles.dayChipText, { color: active ? "#FFF" : colors.text }]}>
                        {d} Days
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Backup & Wipe actions */}
          <View style={styles.actionsDivider} />
          
          <TouchableOpacity style={styles.actionItem} onPress={handleBackup}>
            <View style={[styles.actionIconBg, { backgroundColor: colors.backgroundSelected }]}>
              <Download size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionItemLabel, { color: colors.text }]}>Backup All Chats & Media</Text>
              <Text style={[styles.actionItemSub, { color: colors.textSecondary }]}>
                Export your chats history to local document folder
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleWipeData}>
            <View style={[styles.actionIconBg, { backgroundColor: colors.error + "15" }]}>
              <Trash2 size={18} color={colors.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionItemLabel, { color: colors.error }]}>Wipe Local & Database Data</Text>
              <Text style={[styles.actionItemSub, { color: colors.textSecondary }]}>
                Wipe all chats and files immediately from cloud & local storage
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Privacy Lock Configuration Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Shield size={20} color={colors.accent} style={{ marginRight: 10 }} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Privacy & Locked Chats</Text>
          </View>

          {/* PIN Setup */}
          <TouchableOpacity style={styles.settingRow} onPress={() => setShowPinSetupModal(true)}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Change Global PIN</Text>
              <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                {chatPin ? "4-digit PIN is active" : "No global PIN configured"}
              </Text>
            </View>
            <Lock size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Biometrics Toggle */}
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Use FaceID / Biometric Lock</Text>
              <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                Use biometric validation to access locked conversations
              </Text>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={handleToggleBiometrics}
              thumbColor={biometricsEnabled ? colors.accent : "#ccc"}
              trackColor={{ true: colors.accent + "50", false: "#eee" }}
            />
          </View>
        </View>

        {/* Business/Company Settings Section (Only visible for Company accounts, hidden for admin since they have dedicated dashboard tab) */}
        {profile?.company_name && !profile?.is_company_admin && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Building size={20} color={colors.accent} style={{ marginRight: 10 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Company Profile Integration</Text>
            </View>

            <View style={styles.companyInfoWrapper}>
              <View style={styles.companyMeta}>
                <Text style={[styles.companyLabel, { color: colors.text }]}>Company Member</Text>
                <Text style={[styles.companyNameText, { color: colors.accent }]}>
                  {profile.company_name}
                </Text>
                <Text style={[styles.companyRole, { color: colors.textSecondary }]}>
                  Role: {profile.is_company_admin ? "Administrator" : "Employee"}
                </Text>
              </View>

              {profile.is_company_admin && (
                <TouchableOpacity style={[styles.leaveCompanyBtn, { backgroundColor: colors.backgroundSelected }]} onPress={() => setShowCompanySetup(true)}>
                  <Text style={[styles.leaveCompanyText, { color: colors.text }]}>Edit Details</Text>
                </TouchableOpacity>
              )}
              
              {/* Employee Details & Members List (visible for non-admins) */}
              {!profile.is_company_admin && (
                <View style={[styles.adminPanel, { borderColor: colors.border, marginTop: 12, padding: 12 }]}>
                  <Text style={[styles.companyLabel, { color: colors.text }]}>Company Website</Text>
                  <Text style={[styles.companyRole, { color: colors.accent, fontSize: 14, marginBottom: 12 }]}>
                    {profile.website || "Not Specified"}
                  </Text>
                  
                  <Text style={[styles.adminTitle, { color: colors.text, marginBottom: 8 }]}>
                    Company Employees ({companyUsers.length})
                  </Text>
                  <View style={{ gap: 8 }}>
                    {companyUsers.map((emp) => (
                      <View key={emp.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
                        <Text style={{ fontSize: 14, color: colors.text, fontWeight: "500" }}>{emp.full_name || emp.username}</Text>
                        <Text style={{ fontSize: 12, color: emp.is_company_admin ? colors.accent : colors.textSecondary }}>
                          {emp.is_company_admin ? "Administrator" : "Employee"}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              

            </View>
          </View>
        )}

        {/* Log Out button */}
        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: colors.error + "15", borderColor: colors.error }]} onPress={signOut}>
          <LogOut size={20} color={colors.error} style={{ marginRight: 8 }} />
          <Text style={[styles.logoutBtnText, { color: colors.error }]}>Log Out of BlinkChat</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Lightbox / Modal Avatar Preview */}
      <Modal visible={showAvatarLightbox} transparent animationType="fade" onRequestClose={() => setShowAvatarLightbox(false)}>
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setShowAvatarLightbox(false)}>
            <X size={26} color="#FFF" />
          </TouchableOpacity>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.lightboxImage} resizeMode="contain" />
          ) : (
            <View style={[styles.lightboxAvatarPlaceholder, { backgroundColor: colors.accent }]}>
              <Text style={styles.lightboxInitials}>{userInitials}</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Profile Edit Modal */}
      <Modal visible={showProfileEdit} transparent animationType="slide" onRequestClose={() => setShowProfileEdit(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile Details</Text>
              <TouchableOpacity onPress={() => setShowProfileEdit(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Full Name</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={editFullName}
                  onChangeText={setEditFullName}
                  placeholder="Enter full name..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Username</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={editUsername}
                  onChangeText={setEditUsername}
                  placeholder="Enter username..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Status / Biography</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={editStatus}
                  onChangeText={setEditStatus}
                  placeholder="Enter status..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Avatar URL (Image Source)</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={editAvatarUrl}
                  onChangeText={setEditAvatarUrl}
                  placeholder="https://example.com/avatar.jpg"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.accent }, loading && { opacity: 0.6 }]}
                onPress={handleSaveProfile}
                disabled={loading}
              >
                {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.modalSaveText}>Save Settings</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Global PIN Configuration Modal */}
      <Modal visible={showPinSetupModal} transparent animationType="fade" onRequestClose={() => setShowPinSetupModal(false)}>
        <View style={styles.pinSetupOverlay}>
          <View style={[styles.pinSetupContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.pinSetupTitle, { color: colors.text }]}>Setup Chats PIN</Text>
            <Text style={[styles.pinSetupSub, { color: colors.textSecondary }]}>
              Enter a 4-digit code to secure locked conversations and prevent unauthorized access.
            </Text>

            <TextInput
              style={[styles.pinSetupInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              value={newPin}
              onChangeText={setNewPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholder="****"
              placeholderTextColor={colors.textSecondary}
            />

            <View style={styles.pinSetupActions}>
              <TouchableOpacity style={[styles.pinSetupCancel, { backgroundColor: colors.backgroundSelected }]} onPress={() => { setShowPinSetupModal(false); setNewPin(""); }}>
                <Text style={[styles.pinSetupCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pinSetupSubmit, { backgroundColor: colors.accent }]} onPress={handleSavePin}>
                <Text style={styles.pinSetupSubmitText}>Save PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Company Setup Modal */}
      <Modal visible={showCompanySetup} transparent animationType="slide" onRequestClose={() => setShowCompanySetup(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Business Account Setup</Text>
              <TouchableOpacity onPress={() => setShowCompanySetup(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Company / Organization Name</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={companyNameInput}
                  onChangeText={setCompanyNameInput}
                  placeholder="Enter company name..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.checkboxRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.checkboxLabel, { color: colors.text }]}>I am the Administrator</Text>
                  <Text style={[styles.checkboxSub, { color: colors.textSecondary }]}>
                    Allows directly adding employee members and broadcasting announcements.
                  </Text>
                </View>
                <Switch
                  value={isCompanyAdminInput}
                  onValueChange={setIsCompanyAdminInput}
                  thumbColor={isCompanyAdminInput ? colors.accent : "#ccc"}
                  trackColor={{ true: colors.accent + "50", false: "#eee" }}
                />
              </View>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.accent }, loading && { opacity: 0.6 }]}
                onPress={handleSaveCompanySetup}
                disabled={loading}
              >
                {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.modalSaveText}>Register Profile</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>



      {/* Admin Add Employee Modal (Direct Selection) */}
      <Modal visible={showUserAddModal} transparent animationType="slide" onRequestClose={() => setShowUserAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, height: "80%" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Company Employee</Text>
              <TouchableOpacity onPress={() => setShowUserAddModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Toggle Segment Selector */}
            <View style={{ flexDirection: "row", marginBottom: 16, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 10, alignItems: "center", backgroundColor: !isCreatingNewUser ? colors.accent + "15" : "transparent" }}
                onPress={() => setIsCreatingNewUser(false)}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: !isCreatingNewUser ? colors.accent : colors.textSecondary }}>
                  Search Profiles
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 10, alignItems: "center", backgroundColor: isCreatingNewUser ? colors.accent + "15" : "transparent" }}
                onPress={() => setIsCreatingNewUser(true)}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: isCreatingNewUser ? colors.accent : colors.textSecondary }}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {isCreatingNewUser ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary }}>Full Name</Text>
                  <TextInput
                    style={[styles.modalSearchInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, marginHorizontal: 0 }]}
                    placeholder="E.g. Gowdham Kumar"
                    placeholderTextColor={colors.textSecondary}
                    value={newEmployeeFullName}
                    onChangeText={setNewEmployeeFullName}
                  />
                </View>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary }}>Username</Text>
                  <TextInput
                    style={[styles.modalSearchInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, marginHorizontal: 0 }]}
                    placeholder="E.g. gowdham"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                    value={newEmployeeUsername}
                    onChangeText={setNewEmployeeUsername}
                  />
                </View>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary }}>Email Address</Text>
                  <TextInput
                    style={[styles.modalSearchInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, marginHorizontal: 0 }]}
                    placeholder="E.g. gowdham@company.com"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={newEmployeeEmail}
                    onChangeText={setNewEmployeeEmail}
                  />
                </View>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary }}>Password</Text>
                  <TextInput
                    style={[styles.modalSearchInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, marginHorizontal: 0 }]}
                    placeholder="Minimum 6 characters"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry
                    autoCapitalize="none"
                    value={newEmployeePassword}
                    onChangeText={setNewEmployeePassword}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.logoutBtn, { backgroundColor: colors.accent, borderColor: colors.accent, marginTop: 12, marginHorizontal: 0 }]}
                  onPress={handleCreateEmployeeAccount}
                  disabled={adminLoading}
                >
                  <Text style={[styles.logoutBtnText, { color: "#FFF" }]}>
                    {adminLoading ? "Creating account..." : "Create Account & Add to Company"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <>
                <TextInput
                  style={[styles.modalSearchInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="Search user profile by name..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchUserQuery}
                  onChangeText={setSearchUserQuery}
                />

                {adminLoading ? (
                  <View style={styles.adminLoader}>
                    <ActivityIndicator size="large" color={colors.accent} />
                  </View>
                ) : filteredUsers.length === 0 ? (
                  <View style={styles.adminLoader}>
                    <Text style={{ color: colors.textSecondary }}>No available user profiles found.</Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <View style={[styles.employeeRow, { borderBottomColor: colors.border }]}>
                        <View style={styles.employeeInfo}>
                          <Text style={[styles.employeeName, { color: colors.text }]}>
                            {item.full_name || item.username}
                          </Text>
                          <Text style={[styles.employeeMetaText, { color: colors.textSecondary }]}>
                            @{item.username} {item.company_name ? `(${item.company_name})` : ""}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.employeeAddBtn, { backgroundColor: colors.accent }]}
                          onPress={() => handleDirectAddUser(item)}
                        >
                          <Text style={styles.employeeAddBtnText}>Add Direct</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    contentContainerStyle={{ paddingBottom: 20 }}
                  />
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 64,
    paddingBottom: 40,
  },
  warningBanner: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  warningDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  countdown: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  warningBackupBtn: {
    flexDirection: "row",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  warningBackupText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  profileSection: {
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 16,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "700",
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  profileDetails: {
    alignItems: "center",
    marginBottom: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    marginBottom: 6,
  },
  profileStatus: {
    fontSize: 13,
    paddingHorizontal: 20,
    textAlign: "center",
  },
  editProfileBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  subText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  themesRow: {
    gap: 12,
    paddingVertical: 4,
  },
  themeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    position: "relative",
    minWidth: 110,
  },
  themePreviewColor: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },
  themeChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  themeSelectedCheck: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  settingSub: {
    fontSize: 12,
    lineHeight: 16,
    paddingRight: 16,
  },
  daysSelectorSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
  },
  daysSelectorLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  actionsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#eee",
    marginVertical: 10,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  actionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionItemLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  actionItemSub: {
    fontSize: 11,
  },
  companyInfoWrapper: {
    paddingVertical: 6,
  },
  companyMeta: {
    marginBottom: 16,
  },
  companyLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  companyNameText: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  companyRole: {
    fontSize: 13,
  },
  leaveCompanyBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  leaveCompanyText: {
    fontSize: 13,
    fontWeight: "600",
  },
  noCompanyBox: {
    alignItems: "center",
    paddingVertical: 8,
  },
  noCompanyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 16,
  },
  joinCompanyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  joinCompanyBtnText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
  adminPanel: {
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 16,
  },
  adminTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 16,
  },
  employeeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  employeeCountText: {
    fontSize: 13,
    fontWeight: "600",
  },
  addUserBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addUserBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  broadcastBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
  },
  broadcastLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  broadcastSub: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 10,
  },
  broadcastInputWrapper: {
    flexDirection: "row",
    gap: 8,
  },
  broadcastInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    minHeight: 38,
    maxHeight: 70,
  },
  broadcastSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-end",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 24,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  lightboxImage: {
    width: width - 40,
    height: width - 40,
    borderRadius: 10,
  },
  lightboxAvatarPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxInitials: {
    color: "#FFF",
    fontSize: 72,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  modalSaveBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  modalSaveText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 15,
  },
  pinSetupOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pinSetupContent: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  pinSetupTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  pinSetupSub: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  pinSetupInput: {
    width: 140,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 24,
  },
  pinSetupActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  pinSetupCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  pinSetupCancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
  pinSetupSubmit: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  pinSetupSubmitText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 16,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  checkboxSub: {
    fontSize: 11,
  },
  modalSearchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 16,
  },
  employeeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  employeeInfo: {
    flex: 1,
    paddingRight: 8,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  employeeMetaText: {
    fontSize: 12,
  },
  employeeAddBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  employeeAddBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  adminLoader: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
