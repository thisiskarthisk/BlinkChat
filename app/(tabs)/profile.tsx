import { APP_CONFIG } from "@/constants/config";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  getAcceptedFriends,
  getPendingRequests,
  getSentPendingRequests,
  rejectFriendRequest,
} from "@/services/friendService";
import { getCachedMessages } from "@/services/storageService";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import {
  Camera,
  ChevronDown,
  ChevronRight,
  Key,
  LogOut,
  Pencil,
  Plus,
  Settings as SettingsIcon,
  UserCheck,
  Users,
  X
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { decode as decodeBase64 } from "base64-arraybuffer";
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  return decodeBase64(base64);
}

/** Hook: smoothly animates a translateY offset when the keyboard shows/hides inside a Modal. */
function useKeyboardModalOffset() {
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === "web") {
      // On Web, the shrunken visual viewport automatically keeps the centered modal visible.
      // Doing manual translation would push it off the top of the screen.
      return;
    }

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(offset, {
        toValue: -(e.endCoordinates.height),
        duration: e.duration || 250,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(offset, {
        toValue: 0,
        duration: (e as any)?.duration || 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [offset]);

  return offset;
}

export default function ProfileScreen() {
  const { width, height } = useWindowDimensions();
  const isWebOrTablet = width > 768;

  // Keyboard offset for profile edit & password modals
  const kbOffset = useKeyboardModalOffset();
  const { user, profile, updateProfile, signOut, savedAccounts, addAccount, switchAccount } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [showAccountSwitchModal, setShowAccountSwitchModal] = useState(false);

  const handleAddAccountClick = async () => {
    if (Platform.OS === 'web') {
      const ok = window.confirm("Do you want to log in to another account? Your current session will be saved.");
      if (ok) {
        await addAccount();
      }
    } else {
      Alert.alert(
        "Add Account",
        "Do you want to log in to another account? Your current session will be saved.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Log In", 
            onPress: async () => {
              await addAccount();
            } 
          }
        ]
      );
    }
  };

  // Active sub-tab (Chats list or Media grid)
  const [activeTab, setActiveTab] = useState<"chats" | "media">("chats");

  // Stat counts
  const [chatsCount, setChatsCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [requestsCount, setRequestsCount] = useState(0);

  // Content lists
  const [chatsList, setChatsList] = useState<any[]>([]);
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [sentPendingRequests, setSentPendingRequests] = useState<any[]>([]);
  const [activeRequestTab, setActiveRequestTab] = useState<"received" | "sent">("received");

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal displays
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [selectedMediaUri, setSelectedMediaUri] = useState<string | null>(null);

  // Form inputs
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (showProfileEdit && profile) {
      setEditFullName(profile.full_name || "");
      setEditUsername(profile.username || "");
      setEditStatus(profile.status || `Hey there! I am using ${APP_CONFIG.appName}`);
      setEditAvatarUrl(profile.avatar_url || "");
    }
  }, [showProfileEdit, profile]);

  useEffect(() => {
    if (showPasswordChange) {
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [showPasswordChange]);

  // Initials generator
  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0][0].toUpperCase();
  };

  const currentProfileName = profile?.full_name || profile?.username || "User";
  const userInitials = getInitials(currentProfileName);

  // Load stats and contents
  const loadProfileStatsAndContent = async () => {
    if (!user?.id) return;
    setLoadingContent(true);
    try {
      // 1. Fetch friend counts
      const friends = await getAcceptedFriends(user.id);
      setFriendsList(friends);
      setFriendsCount(friends.length);

      const requests = await getPendingRequests(user.id);
      setPendingRequests(requests);
      setRequestsCount(requests.length);

      const sentRequests = await getSentPendingRequests(user.id);
      setSentPendingRequests(sentRequests);

      // 2. Fetch chats count and build chats/media lists from local caches
      const { data: myChats } = await supabase
        .from("chat_members")
        .select("chat_id")
        .eq("user_id", user.id);

      if (!myChats || myChats.length === 0) {
        setChatsList([]);
        setMediaList([]);
        setChatsCount(0);
        setLoadingContent(false);
        return;
      }

      setChatsCount(myChats.length);

      const resolvedChats: any[] = [];
      const resolvedMedia: any[] = [];

      for (const chat of myChats) {
        const chatId = chat.chat_id;

        // Get details of the other member in the chat room
        const { data: otherMember } = await supabase
          .from("chat_members")
          .select("user_id")
          .eq("chat_id", chatId)
          .neq("user_id", user.id)
          .maybeSingle();

        if (!otherMember) continue;

        const { data: otherProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", otherMember.user_id)
          .maybeSingle();

        if (!otherProfile) continue;

        // Read local storage cache for messages
        const cachedMessages = await getCachedMessages(chatId);
        
        resolvedChats.push({
          chatId,
          profile: otherProfile,
          messagesCount: cachedMessages.length,
          lastMessageText: cachedMessages.length > 0 ? cachedMessages[cachedMessages.length - 1].message : "No messages",
        });

        // Filter and compile images/videos sent/received
        for (const msg of cachedMessages) {
          if (msg.message_type === "image" && msg.message) {
            resolvedMedia.push({
              id: msg.id,
              chatId,
              uri: msg.message,
              created_at: msg.created_at,
              senderName: msg.sender_id === user.id ? "You" : otherProfile.full_name || otherProfile.username,
            });
          }
        }
      }

      setChatsList(resolvedChats);
      // Sort media archive by date descending
      resolvedMedia.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setMediaList(resolvedMedia);
    } catch (e) {
      console.log("loadProfileStatsAndContent error:", e);
    } finally {
      setLoadingContent(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadProfileStatsAndContent();
    }, [user?.id])
  );

  // Select picture from image picker and upload to Supabase Storage
  const pickAndUploadAvatar = async () => {
    if (!user?.id) return;

    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow library access to change your profile picture.");
      return;
    }

    // Launch Image Picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    const uri = asset.uri;
    const mimeType = asset.mimeType || "image/jpeg";

    setUploadingAvatar(true);
    try {
      // Get file extension
      let ext = "jpg";
      if (mimeType.includes("png")) {
        ext = "png";
      } else if (mimeType.includes("gif")) {
        ext = "gif";
      } else {
        const parts = uri.split(".");
        const candidate = parts[parts.length - 1]?.split("?")[0] || "";
        if (candidate && /^[a-zA-Z0-9]{2,5}$/.test(candidate)) {
          ext = candidate;
        }
      }

      const fileName = `${user.id}_${Date.now()}.${ext}`;
      const filePath = `avatars/${fileName}`;

      let uploadBody: any;
      if (Platform.OS === "web") {
        const response = await fetch(uri);
        uploadBody = await response.blob();
      } else {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
        uploadBody = base64ToArrayBuffer(base64);
      }

      // Upload to Supabase Storage bucket 'chat-media'
      const { error: uploadError } = await supabase.storage
        .from("chat-media")
        .upload(filePath, uploadBody, { contentType: mimeType, upsert: false });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("chat-media")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update profiles table in Supabase
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (profileError) {
        throw profileError;
      }

      // Update local context profile state
      updateProfile({ avatar_url: publicUrl });
      setEditAvatarUrl(publicUrl);

      Alert.alert("Success", "Profile picture updated successfully!");
    } catch (error: any) {
      console.error("pickAndUploadAvatar error:", error);
      Alert.alert("Error", error.message || "Failed to upload avatar image.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarPress = () => {
    if (Platform.OS === "web") {
      setShowAvatarMenu(true);
    } else {
      Alert.alert(
        "Profile Photo",
        "Would you like to view your photo or change it?",
        [
          {
            text: "View Photo",
            onPress: () => setShowAvatarLightbox(true),
          },
          {
            text: "Change Photo",
            onPress: pickAndUploadAvatar,
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
    }
  };

  // Setup form fields on edit open
  const handleOpenEdit = () => {
    if (profile) {
      setShowProfileEdit(true);
    }
  };

  // Save profile edits
  const handleSaveProfile = async () => {
    if (!user?.id) return;
    if (!editFullName.trim() || !editUsername.trim()) {
      Alert.alert("Error", "Name and username are required.");
      return;
    }

    const usernameClean = editUsername.trim().toLowerCase().replace(/\s+/g, "_");
    setLoading(true);

    try {
      // 1. Verify username uniqueness if it changed
      if (usernameClean !== profile?.username) {
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", usernameClean)
          .maybeSingle();

        if (existingUser) {
          Alert.alert("Error", "Username already taken. Please try another one.");
          setLoading(false);
          return;
        }
      }

      // 2. Update profiles table
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editFullName.trim(),
          username: usernameClean,
          status: editStatus.trim(),
          avatar_url: editAvatarUrl.trim() || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      // 3. Update locally in context state
      updateProfile({
        full_name: editFullName.trim(),
        username: usernameClean,
        status: editStatus.trim(),
        avatar_url: editAvatarUrl.trim() || null,
      });

      setShowProfileEdit(false);
      Alert.alert("Success", "Profile updated successfully.");
      loadProfileStatsAndContent();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  // Save password updates
  const handleSavePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in both fields.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      Alert.alert("Success", "Password updated successfully!");
      setShowPasswordChange(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to change password.");
    } finally {
      setActionLoading(false);
    }
  };

  // Real-time friend requests syncing
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel(`profile-friend-requests-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests" },
        () => {
          loadProfileStatsAndContent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user?.id]);

  // Accept a friend request
  const handleAcceptRequest = async (requestId: number) => {
    setActionLoading(true);
    const result = await acceptFriendRequest(requestId);
    setActionLoading(false);
    if (result.success) {
      Alert.alert("Success", "Friend request accepted.");
      loadProfileStatsAndContent();
    } else {
      Alert.alert("Error", result.error || "Failed to accept request.");
    }
  };

  // Reject a friend request
  const handleRejectRequest = async (requestId: number) => {
    setActionLoading(true);
    const result = await rejectFriendRequest(requestId);
    setActionLoading(false);
    if (result.success) {
      Alert.alert("Success", "Friend request declined.");
      loadProfileStatsAndContent();
    } else {
      Alert.alert("Error", result.error || "Failed to decline request.");
    }
  };

  // Cancel an outgoing friend request
  const handleCancelRequest = async (requestId: number) => {
    setActionLoading(true);
    const result = await cancelFriendRequest(requestId);
    setActionLoading(false);
    if (result.success) {
      Alert.alert("Success", "Friend request cancelled.");
      loadProfileStatsAndContent();
    } else {
      Alert.alert("Error", result.error || "Failed to cancel request.");
    }
  };

  // Navigate to Chat room directly
  const handleOpenChat = (chatId: string, otherProfile: any) => {
    setShowFriendsModal(false);
    router.push({
      pathname: "/chat/[id]",
      params: { id: chatId, name: otherProfile.full_name || otherProfile.username },
    });
  };

  const cardBgColor = colors.dark ? "rgba(30, 41, 59, 0.45)" : "rgba(255, 255, 255, 0.75)";
  const cardBorderColor = colors.dark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)";

  const gridGap = 8;
  const numColumns = isWebOrTablet ? 4 : 3;
  const contentWidth = isWebOrTablet ? (width * 0.6 - 48) : (width - 32);
  const cellSize = (contentWidth - (numColumns - 1) * gridGap) / numColumns;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Dynamic Depth Gradient Background */}
      <LinearGradient
        colors={[colors.accent + "15", colors.accent + "02", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.8 }}
      />

      {/* 1. Futuristic Glass Header */}
      <View {...({ dataSet: { name: 'app-header-profile' } } as any)} style={[styles.glassHeader, { 
        height: Platform.OS === 'web' ? 60 : 60 + insets.top, 
        paddingTop: Platform.OS === 'web' ? 0 : insets.top, 
        backgroundColor: cardBgColor, 
        borderBottomColor: cardBorderColor 
      }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerGreeting, { color: colors.textSecondary }]}>Account Dashboard</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[styles.headerTitle, { color: colors.text, marginRight: 6 }]} numberOfLines={1}>
              @{profile?.username || "username"}
            </Text>
            
            {savedAccounts.length > 1 ? (
              <TouchableOpacity onPress={() => setShowAccountSwitchModal(true)} style={{ padding: 4 }}>
                <ChevronDown size={18} color={colors.text} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setShowAccountSwitchModal(true)} style={{ padding: 4 }}>
                <ChevronDown size={18} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/settings")}
          style={[styles.settingsButton, { backgroundColor: colors.accent + "15" }]}
        >
          <SettingsIcon size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={isWebOrTablet ? styles.webLayoutContainer : styles.mobileLayoutContainer}>
          <View style={styles.mobileFullWidth}>
            
            {/* WhatsApp-style Profile Card */}
            <View>
              <View style={[styles.profileGlassCard, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
                {/* Cover Banner */}
                <View style={styles.coverBanner}>
                  <LinearGradient
                    colors={["#075E54", "#128C7E"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                </View>

                {/* Avatar Center Row */}
                <View style={{ alignItems: "center", marginTop: -60, marginBottom: 12 }}>
                  <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarWrapperContainer} disabled={uploadingAvatar}>
                    <View style={[styles.avatarBorderGlow, { borderColor: colors.background }]}>
                      {profile?.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                      ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.accent }]}>
                          <Text style={styles.avatarInitials}>{userInitials}</Text>
                        </View>
                      )}
                    </View>
                    {uploadingAvatar ? (
                      <View style={[StyleSheet.absoluteFill, styles.avatarLoaderContainer]}>
                        <ActivityIndicator size="small" color="#FFF" />
                      </View>
                    ) : (
                      <View style={[styles.editBadge, { backgroundColor: "#128C7E" }]}>
                        <Camera size={12} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Info Rows */}
                <View style={styles.infoSection}>
                  {/* Full Name Row */}
                  <TouchableOpacity style={styles.infoRow} onPress={handleOpenEdit} activeOpacity={0.7}>
                    <View style={styles.infoRowLeft}>
                      <Text style={[styles.infoRowLabel, { color: "#128C7E" }]}>Name</Text>
                      <Text style={[styles.infoRowValue, { color: colors.text }]}>{currentProfileName}</Text>
                      <Text style={[styles.infoRowDesc, { color: colors.textSecondary }]}>This is not your username or PIN. This name will be visible to your BlinkChat contacts.</Text>
                    </View>
                    <Pencil size={16} color="#128C7E" style={{ marginLeft: 8 }} />
                  </TouchableOpacity>

                  <View style={styles.infoRowDivider} />

                  {/* Username Row */}
                  <View style={styles.infoRow}>
                    <View style={styles.infoRowLeft}>
                      <Text style={[styles.infoRowLabel, { color: "#128C7E" }]}>Username</Text>
                      <Text style={[styles.infoRowValue, { color: colors.text }]}>@{profile?.username || "username"}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRowDivider} />

                  {/* About/Status Row */}
                  <TouchableOpacity style={styles.infoRow} onPress={handleOpenEdit} activeOpacity={0.7}>
                    <View style={styles.infoRowLeft}>
                      <Text style={[styles.infoRowLabel, { color: "#128C7E" }]}>About</Text>
                      <Text style={[styles.infoRowValue, { color: colors.text }]} numberOfLines={2}>
                        {profile?.status || `Hey there! I am using ${APP_CONFIG.appName}`}
                      </Text>
                    </View>
                    <Pencil size={16} color="#128C7E" style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* WhatsApp-Style Settings Menu */}
            <View style={[styles.settingsMenu, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
              <TouchableOpacity style={styles.menuItem} onPress={() => setShowFriendsModal(true)} activeOpacity={0.7}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconWrapper, { backgroundColor: "#E3F2FD" }]}>
                    <Users size={20} color="#2196F3" />
                  </View>
                  <View style={styles.menuItemTextContainer}>
                    <Text style={[styles.menuItemTitle, { color: colors.text }]}>Friends List</Text>
                    <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>View and manage your friends ({friendsCount})</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              <View style={styles.infoRowDivider} />

              <TouchableOpacity style={styles.menuItem} onPress={() => setShowRequestsModal(true)} activeOpacity={0.7}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconWrapper, { backgroundColor: "#E8F5E9" }]}>
                    <UserCheck size={20} color="#4CAF50" />
                  </View>
                  <View style={styles.menuItemTextContainer}>
                    <Text style={[styles.menuItemTitle, { color: colors.text }]}>Friend Requests</Text>
                    <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>Review pending friend alerts ({requestsCount})</Text>
                  </View>
                </View>
                {requestsCount > 0 && (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{requestsCount}</Text>
                  </View>
                )}
                <ChevronRight size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              <View style={styles.infoRowDivider} />

              <TouchableOpacity style={styles.menuItem} onPress={() => setShowPasswordChange(true)} activeOpacity={0.7}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconWrapper, { backgroundColor: "#FFF3E0" }]}>
                    <Key size={20} color="#FF9800" />
                  </View>
                  <View style={styles.menuItemTextContainer}>
                    <Text style={[styles.menuItemTitle, { color: colors.text }]}>Account Password</Text>
                    <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>Change your security credentials</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              <View style={styles.infoRowDivider} />

              <TouchableOpacity style={styles.menuItem} onPress={signOut} activeOpacity={0.7}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconWrapper, { backgroundColor: "#FFEBEE" }]}>
                    <LogOut size={20} color="#F44336" />
                  </View>
                  <View style={styles.menuItemTextContainer}>
                    <Text style={[styles.menuItemTitle, { color: "#F44336" }]}>Log Out</Text>
                    <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>Sign out of this session</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* MODAL 1: Friends List */}
      <Modal visible={showFriendsModal} animationType="slide" transparent={false} onRequestClose={() => setShowFriendsModal(false)}>
        <View style={[styles.modalFullScreen, { backgroundColor: colors.background }]}>
          <View style={[styles.modalFullScreenHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalFullScreenTitle, { color: colors.text }]}>Friends ({friendsList.length})</Text>
            <TouchableOpacity onPress={() => setShowFriendsModal(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {friendsList.length === 0 ? (
            <View style={styles.centerView}>
              <Users size={48} color={colors.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Friends Yet</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Search and connect with friends from the chat dashboard.
              </Text>
            </View>
          ) : (
            <FlatList
              data={friendsList}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const name = item.friendProfile?.full_name || item.friendProfile?.username || "User";
                const isOnline = item.friendProfile?.is_online;
                return (
                  <View style={[styles.friendRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.friendRowLeft}>
                      {item.friendProfile?.avatar_url ? (
                        <Image source={{ uri: item.friendProfile.avatar_url }} style={styles.friendAvatar} />
                      ) : (
                        <View style={[styles.friendAvatarPlaceholder, { backgroundColor: colors.accent }]}>
                          <Text style={styles.friendAvatarText}>{getInitials(name)}</Text>
                        </View>
                      )}
                      <View>
                        <Text style={[styles.friendName, { color: colors.text }]}>{name}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                          <View style={[styles.statusDot, { backgroundColor: isOnline ? "#10B981" : colors.textSecondary }]} />
                          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                            {isOnline ? "Online" : "Offline"}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.friendChatBtn, { backgroundColor: colors.accent }]}
                      onPress={async () => {
                        const { data: existingChat } = await supabase
                          .from("chat_members")
                          .select("chat_id")
                          .eq("user_id", user!.id);
                        
                        let targetChatId = null;
                        if (existingChat) {
                          for (const c of existingChat) {
                            const { data: checkOther } = await supabase
                              .from("chat_members")
                              .select("user_id")
                              .eq("chat_id", c.chat_id)
                              .eq("user_id", item.friendProfile.id)
                              .maybeSingle();
                            if (checkOther) {
                              targetChatId = c.chat_id;
                              break;
                            }
                          }
                        }

                        if (targetChatId) {
                          handleOpenChat(targetChatId, item.friendProfile);
                        } else {
                          // Create chat
                          const { data: newChat } = await supabase.from("chats").insert({}).select().single();
                          if (newChat) {
                            await supabase.from("chat_members").insert([
                              { chat_id: newChat.id, user_id: user!.id },
                              { chat_id: newChat.id, user_id: item.friendProfile.id },
                            ]);
                            handleOpenChat(newChat.id, item.friendProfile);
                          }
                        }
                      }}
                    >
                      <Text style={styles.friendChatBtnText}>Chat</Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}
        </View>
      </Modal>

      {/* MODAL 2: Pending Requests (Received & Sent tabs) */}
      <Modal visible={showRequestsModal} animationType="slide" transparent={false} onRequestClose={() => setShowRequestsModal(false)}>
        <View style={[styles.modalFullScreen, { backgroundColor: colors.background }]}>
          <View style={[styles.modalFullScreenHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalFullScreenTitle, { color: colors.text }]}>Friend Requests</Text>
            <TouchableOpacity onPress={() => setShowRequestsModal(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Tab Selector Bar */}
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
            <TouchableOpacity 
              style={{ 
                flex: 1, 
                paddingVertical: 12, 
                alignItems: "center", 
                borderBottomWidth: activeRequestTab === "received" ? 2 : 0, 
                borderBottomColor: colors.accent 
              }}
              onPress={() => setActiveRequestTab("received")}
            >
              <Text style={{ fontWeight: "bold", color: activeRequestTab === "received" ? colors.accent : colors.textSecondary }}>
                Received ({pendingRequests.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ 
                flex: 1, 
                paddingVertical: 12, 
                alignItems: "center", 
                borderBottomWidth: activeRequestTab === "sent" ? 2 : 0, 
                borderBottomColor: colors.accent 
              }}
              onPress={() => setActiveRequestTab("sent")}
            >
              <Text style={{ fontWeight: "bold", color: activeRequestTab === "sent" ? colors.accent : colors.textSecondary }}>
                Sent ({sentPendingRequests.length})
              </Text>
            </TouchableOpacity>
          </View>

          {activeRequestTab === "received" ? (
            pendingRequests.length === 0 ? (
              <View style={styles.centerView}>
                <UserCheck size={48} color={colors.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Pending Requests</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  Incoming request notifications will appear here.
                </Text>
              </View>
            ) : (
              <FlatList
                data={pendingRequests}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => {
                  const senderName = item.sender?.full_name || item.sender?.username || "Someone";
                  return (
                    <View style={[styles.requestRow, { borderBottomColor: colors.border }]}>
                      <View style={styles.requestRowLeft}>
                        {item.sender?.avatar_url ? (
                          <Image source={{ uri: item.sender.avatar_url }} style={styles.requestAvatar} />
                        ) : (
                          <View style={[styles.requestAvatarPlaceholder, { backgroundColor: colors.accent }]}>
                            <Text style={styles.requestAvatarText}>{getInitials(senderName)}</Text>
                          </View>
                        )}
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={[styles.requestName, { color: colors.text }]} numberOfLines={1}>{senderName}</Text>
                          <Text style={{ fontSize: 11, color: colors.textSecondary }}>@{item.sender?.username}</Text>
                        </View>
                      </View>

                      <View style={styles.requestActions}>
                        <TouchableOpacity
                          style={[styles.requestBtn, { backgroundColor: colors.accent }]}
                          onPress={() => handleAcceptRequest(item.id)}
                          disabled={actionLoading}
                        >
                          <Text style={styles.requestBtnText}>Accept</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.requestBtn, { backgroundColor: colors.error + "20" }]}
                          onPress={() => handleRejectRequest(item.id)}
                          disabled={actionLoading}
                        >
                          <Text style={[styles.requestBtnText, { color: colors.error }]}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            )
          ) : (
            sentPendingRequests.length === 0 ? (
              <View style={styles.centerView}>
                <UserCheck size={48} color={colors.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Sent Requests</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  Your pending outgoing friend requests will appear here.
                </Text>
              </View>
            ) : (
              <FlatList
                data={sentPendingRequests}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => {
                  const receiverName = item.receiver?.full_name || item.receiver?.username || "Someone";
                  return (
                    <View style={[styles.requestRow, { borderBottomColor: colors.border }]}>
                      <View style={styles.requestRowLeft}>
                        {item.receiver?.avatar_url ? (
                          <Image source={{ uri: item.receiver.avatar_url }} style={styles.requestAvatar} />
                        ) : (
                          <View style={[styles.requestAvatarPlaceholder, { backgroundColor: colors.accent }]}>
                            <Text style={styles.requestAvatarText}>{getInitials(receiverName)}</Text>
                          </View>
                        )}
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={[styles.requestName, { color: colors.text }]} numberOfLines={1}>{receiverName}</Text>
                          <Text style={{ fontSize: 11, color: colors.textSecondary }}>@{item.receiver?.username}</Text>
                        </View>
                      </View>

                      <View style={styles.requestActions}>
                        <TouchableOpacity
                          style={[styles.requestBtn, { backgroundColor: colors.error + "20" }]}
                          onPress={() => handleCancelRequest(item.id)}
                          disabled={actionLoading}
                        >
                          <Text style={[styles.requestBtnText, { color: colors.error }]}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            )
          )}
        </View>
      </Modal>

      {/* MODAL 3: Edit Profile */}
      <Modal visible={showProfileEdit} transparent animationType="fade" onRequestClose={() => { Keyboard.dismiss(); setShowProfileEdit(false); }}>
        <TouchableOpacity style={[styles.modalOverlay, { justifyContent: "center", alignItems: "center" }]} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setShowProfileEdit(false); }}>
          <Animated.View style={[{ width: "90%", maxWidth: 500 }, { transform: [{ translateY: kbOffset }] }]}>
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={Platform.OS === 'web' ? (e) => e.stopPropagation() : undefined}
              style={[styles.modalContent, { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, maxHeight: height * 0.8 }]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile Details</Text>
                <TouchableOpacity onPress={() => { Keyboard.dismiss(); setShowProfileEdit(false); }}>
                  <X size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                    autoCapitalize="none"
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

                {/* <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Avatar URL (Image Source)</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={editAvatarUrl}
                    onChangeText={setEditAvatarUrl}
                    placeholder="Paste URL link to image..."
                    placeholderTextColor={colors.textSecondary}
                  />
                </View> */}

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                  onPress={handleSaveProfile}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Settings</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 4: Change Password */}
      <Modal visible={showPasswordChange} transparent animationType="fade" onRequestClose={() => { Keyboard.dismiss(); setShowPasswordChange(false); }}>
        <TouchableOpacity style={[styles.modalOverlay, { justifyContent: "center", alignItems: "center" }]} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setShowPasswordChange(false); }}>
          <Animated.View style={[{ width: "90%", maxWidth: 500 }, { transform: [{ translateY: kbOffset }] }]}>
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={Platform.OS === 'web' ? (e) => e.stopPropagation() : undefined}
              style={[styles.modalContent, { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, maxHeight: height * 0.8 }]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Change Account Password</Text>
                <TouchableOpacity onPress={() => { Keyboard.dismiss(); setShowPasswordChange(false); }}>
                  <X size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>New Secure Password</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    placeholder="Minimum 6 characters..."
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm New Password</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    placeholder="Re-type password..."
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                  onPress={handleSavePassword}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 5: Avatar Lightbox preview */}
      <Modal visible={showAvatarLightbox} transparent animationType="fade" onRequestClose={() => setShowAvatarLightbox(false)}>
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setShowAvatarLightbox(false)}>
            <X size={28} color="#FFF" />
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

      {/* MODAL 6: Avatar Options Menu for Web/PWA */}
      <Modal
        visible={showAvatarMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAvatarMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowAvatarMenu(false)}
        >
          <View style={[styles.avatarMenuContent, { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1 }]}>
            <Text style={[styles.avatarMenuTitle, { color: colors.text }]}>Profile Photo</Text>
            
            <TouchableOpacity 
              style={[styles.avatarMenuItem, { borderBottomColor: colors.border, borderBottomWidth: 0.5 }]} 
              onPress={() => {
                setShowAvatarMenu(false);
                setShowAvatarLightbox(true);
              }}
            >
              <Text style={[styles.avatarMenuItemText, { color: colors.accent }]}>View Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.avatarMenuItem, { borderBottomColor: colors.border, borderBottomWidth: 0.5 }]} 
              onPress={() => {
                setShowAvatarMenu(false);
                pickAndUploadAvatar();
              }}
            >
              <Text style={[styles.avatarMenuItemText, { color: colors.accent }]}>Change Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.avatarMenuItem} 
              onPress={() => setShowAvatarMenu(false)}
            >
              <Text style={[styles.avatarMenuItemText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 6: Media grid Lightbox */}
      <Modal visible={selectedMediaUri !== null} transparent animationType="fade" onRequestClose={() => setSelectedMediaUri(null)}>
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setSelectedMediaUri(null)}>
            <X size={28} color="#FFF" />
          </TouchableOpacity>
          {selectedMediaUri && (
            <Image source={{ uri: selectedMediaUri }} style={styles.lightboxImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* BOTTOM MODAL: Account Switcher */}
      <Modal
        visible={showAccountSwitchModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAccountSwitchModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowAccountSwitchModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={Platform.OS === 'web' ? (e) => e.stopPropagation() : undefined}
            style={[styles.bottomSheetContent, { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1 }]}
          >
            <View style={styles.bottomSheetHeader}>
              <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>Accounts</Text>
              <TouchableOpacity onPress={() => setShowAccountSwitchModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              {savedAccounts.map((acc) => {
                const isActive = user?.id === acc.userId;
                return (
                  <TouchableOpacity
                    key={acc.userId}
                    style={[
                      styles.accountRow,
                      { borderBottomColor: colors.border, borderBottomWidth: 0.5 }
                    ]}
                    onPress={async () => {
                      if (isActive) return;
                      setShowAccountSwitchModal(false);
                      try {
                        await switchAccount(acc.userId);
                      } catch (err: any) {
                        const msg = err?.message || "Session expired. Please log in again.";
                        if (Platform.OS === "web") {
                          window.alert(`Could not switch account: ${msg}`);
                        } else {
                          Alert.alert("Switch Failed", msg);
                        }
                      }
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                      {acc.profile?.avatar_url ? (
                        <Image source={{ uri: acc.profile.avatar_url }} style={styles.accountAvatar} />
                      ) : (
                        <View style={[styles.accountAvatarPlaceholder, { backgroundColor: colors.accent }]}>
                          <Text style={styles.accountAvatarText}>
                            {(acc.profile?.full_name || acc.profile?.username || "?")[0].toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={{ marginLeft: 12 }}>
                        <Text style={[styles.accountName, { color: colors.text, fontWeight: isActive ? "700" : "500" }]}>
                          {acc.profile?.full_name || acc.profile?.username || "User"}
                        </Text>
                        <Text style={[styles.accountEmail, { color: colors.textSecondary }]}>
                          {acc.email}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.radioButton, { borderColor: colors.accent }]}>
                      {isActive && <View style={[styles.radioButtonInner, { backgroundColor: colors.accent }]} />}
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.accountRow, { marginTop: 12 }]}
                onPress={async () => {
                  setShowAccountSwitchModal(false);
                  setTimeout(handleAddAccountClick, 300);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View style={[styles.accountAvatarPlaceholder, { backgroundColor: colors.border }]}>
                    <Plus size={20} color={colors.text} />
                  </View>
                  <Text style={[styles.accountName, { color: colors.text, marginLeft: 12, fontWeight: "600" }]}>
                    Add Account
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarMenuContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  avatarMenuTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  avatarMenuItem: {
    width: "100%",
    paddingVertical: 16,
    alignItems: "center",
  },
  avatarMenuItemText: {
    fontSize: 16,
    fontWeight: "600",
  },
  container: {
    flex: 1,
  },
  glassHeader: {
    height: 95,
    paddingTop: 45,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "column",
    flex: 1,
  },
  headerGreeting: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 1,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Responsive Containers
  webLayoutContainer: {
    padding: 24,
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },
  mobileLayoutContainer: {
    padding: 16,
    gap: 16,
    width: "100%",
  },
  mobileFullWidth: {
    width: "100%",
    gap: 16,
  },

  // Cards
  // profileGlassCard: {
  //   borderRadius: 24,
  //   borderWidth: 1.5,
  //   paddingBottom: 20,
  //   shadowColor: "#000",
  //   shadowOffset: { width: 0, height: 10 },
  //   shadowOpacity: 0.08,
  //   shadowRadius: 15,
  //   elevation: 4,
  //   overflow: "hidden",
  // },

  profileGlassCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    paddingBottom: 20,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },

  coverBanner: {
    height: 120,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
    position: "relative",
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
  profileHeroRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    marginTop: -40,
    gap: 16,
  },
  avatarWrapperContainer: {
    position: "relative",
    zIndex: 5,
  },
  avatarBorderGlow: {
    borderRadius: 44,
    borderWidth: 4,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLoaderContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  avatarInitials: {
    color: "#FFF",
    fontSize: 26,
    fontWeight: "800",
  },
  editBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
    zIndex: 6,
  },

  // WhatsApp Profile Section Styles
  infoSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  infoRowLeft: {
    flex: 1,
  },
  infoRowLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  infoRowValue: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
  },
  infoRowDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  infoRowDivider: {
    height: 0.5,
    backgroundColor: "rgba(120, 144, 156, 0.2)",
  },

  // Settings Menu List
  settingsMenu: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    paddingBottom: 20,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  menuItemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  menuBadge: {
    backgroundColor: "#F44336",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
  },
  menuBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },

  // Lightbox overlay styles
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxImage: {
    width: "90%",
    height: "80%",
  },
  lightboxCloseBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  lightboxCloseText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  profileTextInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
    marginBottom: 4,
  },
  profileDisplayName: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  usernamePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  usernamePillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusBubble: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  statusBubbleText: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: "italic",
  },
  companyBadgeGlass: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 16,
  },
  companyBadgeTextGlass: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Interactive Stats cards
  statsCardGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statGlassCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    position: "relative",
  },
  statBadgeDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  statCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  statCardActionText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // Quick Action Buttons
  quickActionsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  glassActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  glassActionBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Content console Card
  contentGlassCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
    minHeight: 350,
  },
  pillTabBar: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 4,
    marginBottom: 18,
  },
  pillTabItem: {
    flex: 1,
    flexDirection: "row",
    height: 38,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  pillTabText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Chat tiles in glass dashboard
  chatsWrapper: {
    gap: 10,
  },
  chatTileGlass: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  chatTileLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  chatTileAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  chatTileAvatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  chatTileAvatarText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },
  chatTileInfo: {
    marginLeft: 12,
    flex: 1,
    gap: 2,
  },
  chatTileName: {
    fontSize: 14,
    fontWeight: "700",
  },
  chatTileSub: {
    fontSize: 12,
  },
  chatTileRight: {
    paddingLeft: 8,
  },

  // Media vault grid
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mediaCardCell: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mediaCardCellImage: {
    width: "100%",
    flex: 1,
  },
  mediaCardBottomPlate: {
    padding: 6,
    height: 40,
    justifyContent: "center",
  },
  mediaCardSenderText: {
    fontSize: 10,
    fontWeight: "700",
  },
  mediaCardDateText: {
    fontSize: 8,
    marginTop: 1,
  },

  // Modals full-screen
  modalFullScreen: {
    flex: 1,
  },
  modalFullScreenHeader: {
    height: 90,
    paddingTop: 45,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 0.5,
  },
  modalFullScreenTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  centerView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  friendRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  friendAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  friendAvatarText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },
  friendName: {
    fontSize: 14,
    fontWeight: "700",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  friendChatBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  friendChatBtnText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 12,
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  requestRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  requestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  requestAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  requestAvatarText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },
  requestName: {
    fontSize: 14,
    fontWeight: "700",
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  requestBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: "center",
  },
  requestBtnText: {
    color: "#FFF",
    fontSize: 11,
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
    padding: 20,
    maxHeight: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  inputContainer: {
    marginBottom: 16,
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  lightboxClose: {
    position: "absolute",
    top: 45,
    right: 20,
    padding: 8,
    zIndex: 10,
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
    fontSize: 64,
    fontWeight: "800",
  },
  emptyView: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  bottomSheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "60%",
  },
  bottomSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  accountAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  accountAvatarText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  accountName: {
    fontSize: 15,
  },
  accountEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
