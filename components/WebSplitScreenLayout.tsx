import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Home,
  Settings as SettingsIcon,
  LayoutDashboard,
  LogOut,
  Search,
  Send,
  Paperclip,
  Camera,
} from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/lib/supabase";
import { createOrGetChat } from "@/services/chatService";

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : parts[0][0].toUpperCase();
}

function formatTime(isoString?: string) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  }
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

export default function WebSplitScreenLayout() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const { colors } = useTheme();

  // Tab State: 'chats' | 'dashboard' | 'settings'
  const [activeTab, setActiveTab] = useState<"chats" | "dashboard" | "settings">("chats");

  // Chat States
  const [chats, setChats] = useState<any[]>([]);
  const [filteredChats, setFilteredChats] = useState<any[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [chatsSearch, setChatsSearch] = useState("");
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // Settings / All Users States
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [editFullName, setEditFullName] = useState(profile?.full_name || "");
  const [editUsername, setEditUsername] = useState(profile?.username || "");
  const [editStatus, setEditStatus] = useState(profile?.status || "");
  const [editAvatarUrl, setEditAvatarUrl] = useState(profile?.avatar_url || "");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Dashboard / Admin States
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  // Ref
  const messageEndRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // Realtime subscription for background logout
  useEffect(() => {
    let dbChannel: any = null;
    let broadcastChannel: any = null;

    const setupLogoutListener = async () => {
      try {
        const token = await AsyncStorage.getItem("device_session_token");
        if (!token) return;

        // 1. Verify session token is still valid in database on mount
        const { data, error: checkError } = await supabase
          .from("device_links")
          .select("id")
          .eq("session_token", token)
          .maybeSingle();

        if (checkError || !data) {
          console.log("Device session is invalid or deleted, logging out...");
          await AsyncStorage.removeItem("device_session_token");
          await signOut();
          return;
        }

        // 2. Listen to database DELETE postgres_changes (replica identity full fallback)
        dbChannel = supabase
          .channel(`device-logout-db-${token}`)
          .on(
            "postgres_changes",
            {
              event: "DELETE",
              schema: "public",
              table: "device_links",
              filter: `session_token=eq.${token}`,
            },
            async () => {
              console.log("Device unlinked from mobile (DB event), logging out...");
              await AsyncStorage.removeItem("device_session_token");
              await signOut();
            }
          )
          .subscribe();

        // 3. Listen to realtime Broadcast logout event for immediate remote logout
        broadcastChannel = supabase.channel(`device-logout-channel-${token}`);
        broadcastChannel
          .on("broadcast", { event: "logout" }, async () => {
            console.log("Device unlinked from mobile (Broadcast event), logging out...");
            await AsyncStorage.removeItem("device_session_token");
            await signOut();
          })
          .subscribe();

      } catch (e) {
        console.error("setupLogoutListener error:", e);
      }
    };

    setupLogoutListener();

    return () => {
      if (dbChannel) supabase.removeChannel(dbChannel);
      if (broadcastChannel) supabase.removeChannel(broadcastChannel);
    };
  }, [signOut]);

  // Update profile fields when profile loads
  useEffect(() => {
    if (profile) {
      setEditFullName(profile.full_name || "");
      setEditUsername(profile.username || "");
      setEditStatus(profile.status || "Hey there! I am using BlinkChat");
      setEditAvatarUrl(profile.avatar_url || "");
      if (profile.company_id || profile.company_name) {
        loadCompanyUsers(profile.company_id || profile.company_name || "");
      }
    }
  }, [profile]);

  const handleWebLogout = async () => {
    try {
      const token = await AsyncStorage.getItem("device_session_token");
      if (token) {
        // Delete the device link from the database so the slot is freed
        await supabase.from("device_links").delete().eq("session_token", token);
        await AsyncStorage.removeItem("device_session_token");
      }
    } catch (e) {
      console.error("handleWebLogout error:", e);
    } finally {
      await signOut();
    }
  };

  // Load Chats
  const loadChats = async (silent = false) => {
    if (!user?.id) return;
    try {
      if (!silent && chats.length === 0) {
        setChatsLoading(true);
      }
      const { data: myChats, error } = await supabase
        .from("chat_members")
        .select("chat_id")
        .eq("user_id", user.id);

      if (error || !myChats?.length) {
        setChats([]);
        setFilteredChats([]);
        return;
      }

      const result: any[] = [];
      const seenProfileIds = new Set<string>();

      for (const chat of myChats) {
        const { data: otherMember } = await supabase
          .from("chat_members")
          .select("user_id")
          .eq("chat_id", chat.chat_id)
          .neq("user_id", user.id)
          .maybeSingle();

        if (!otherMember) continue;
        if (seenProfileIds.has(otherMember.user_id)) continue;
        seenProfileIds.add(otherMember.user_id);

        const { data: otherProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", otherMember.user_id)
          .maybeSingle();

        if (!otherProfile) continue;

        // Latest Message
        const { data: lastMessage } = await supabase
          .from("messages")
          .select("*")
          .eq("chat_id", chat.chat_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Unread Count
        const { count: unreadCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("chat_id", chat.chat_id)
          .eq("is_seen", false)
          .neq("sender_id", user.id);

        result.push({
          chat_id: chat.chat_id,
          profile: otherProfile,
          lastMessage,
          unreadCount: unreadCount || 0,
        });
      }

      // Sort: Latest message first
      result.sort((a, b) => {
        const tA = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0;
        const tB = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0;
        return tB - tA;
      });

      setChats(result);
      applyChatsSearch(result, chatsSearch);

      // Save to cache for instant loading next time
      await AsyncStorage.setItem(`cached_chats_${user.id}`, JSON.stringify(result));
    } catch (e) {
      console.error("loadChats error:", e);
    } finally {
      setChatsLoading(false);
    }
  };

  const applyChatsSearch = (data: any[], query: string) => {
    if (!query.trim()) {
      setFilteredChats(data);
      return;
    }
    const q = query.toLowerCase();
    setFilteredChats(
      data.filter(
        (c) =>
          c.profile?.full_name?.toLowerCase().includes(q) ||
          c.profile?.username?.toLowerCase().includes(q)
      )
    );
  };

  // Load cached chats on mount for instant visual load
  useEffect(() => {
    const loadCachedChats = async () => {
      try {
        const cached = await AsyncStorage.getItem(`cached_chats_${user?.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setChats(parsed);
          applyChatsSearch(parsed, "");
          setChatsLoading(false);
        }
      } catch (e) {
        console.log("Error loading cached chats:", e);
      }
    };
    if (user?.id) {
      loadCachedChats();
    }
  }, [user?.id]);

  useEffect(() => {
    loadChats();
  }, [user?.id]);

  useEffect(() => {
    applyChatsSearch(chats, chatsSearch);
  }, [chatsSearch, chats]);

  // Load All Users for Settings
  const loadAllUsers = async () => {
    if (!user?.id) return;
    try {
      setUsersLoading(true);
      let query = supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id);

      if (profile?.is_company_account && profile.company_id) {
        query = query.eq("company_id", profile.company_id);
      } else if (!profile?.is_company_account) {
        query = query.eq("is_company_account", false);
      }

      const { data, error } = await query.order("full_name", { ascending: true });
      if (error) throw error;

      setAllUsers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "settings") {
      loadAllUsers();
    }
  }, [activeTab]);

  // Load Company Users (Dashboard Admin Flow)
  const loadCompanyUsers = async (compIdOrName: string) => {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(compIdOrName);
      let query = supabase.from("profiles").select("*");
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
      if (data) setCompanyUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Realtime subscription for chats list updates
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("web-chats-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          loadChats(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          loadChats(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Load active chat messages
  const loadMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      scrollToBottom();

      // Mark messages as read/seen
      await supabase
        .from("messages")
        .update({ is_seen: true })
        .eq("chat_id", chatId)
        .neq("sender_id", user?.id)
        .eq("is_seen", false);
        
      loadChats(true);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!activeChat) return;

    loadMessages(activeChat.chat_id);

    // Subscribe to new messages for active chat
    const channel = supabase
      .channel(`chat-messages-${activeChat.chat_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${activeChat.chat_id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
            scrollToBottom();
            
            // Mark seen
            if (payload.new.sender_id !== user?.id) {
              supabase
                .from("messages")
                .update({ is_seen: true })
                .eq("id", payload.new.id)
                .then(() => {
                  loadChats();
                });
            }
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? payload.new : m))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat?.chat_id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messageEndRef.current) {
        messageEndRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  // Send Message
  const handleSendMessage = async () => {
    if (!msgInput.trim() || !activeChat || !user?.id) return;
    const text = msgInput.trim();
    setMsgInput("");
    setSendingMsg(true);

    try {
      const { error } = await supabase.from("messages").insert({
        chat_id: activeChat.chat_id,
        sender_id: user.id,
        message: text,
        is_delivered: true,
        is_seen: false,
      });

      if (error) throw error;
      scrollToBottom();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to send message.");
    } finally {
      setSendingMsg(false);
    }
  };

  // Create or select chat with user
  const handleStartChatWithUser = async (targetUser: any) => {
    if (!user?.id) return;
    try {
      const chatId = await createOrGetChat(user.id, targetUser.id);
      if (chatId) {
        setActiveChat({
          chat_id: chatId,
          profile: targetUser,
        });
        setActiveTab("chats");
        loadChats();
      }
    } catch (e) {
      console.error(e);
      alert("Failed to open chat with user.");
    }
  };

  // Handle Photo Upload (for Chat attachment or Profile Avatar)
  const triggerFileUpload = (type: "chat" | "avatar") => {
    if (type === "chat") {
      fileInputRef.current?.click();
    } else {
      avatarInputRef.current?.click();
    }
  };

  const handleFileChange = async (event: any, type: "chat" | "avatar") => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    try {
      setUpdatingProfile(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = type === "avatar" ? `avatars/${fileName}` : `uploads/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("chat-media")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("chat-media")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      if (type === "avatar") {
        setEditAvatarUrl(publicUrl);
        // Save to profile db
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl })
          .eq("id", user.id);

        if (profileError) throw profileError;
        updateProfile({ avatar_url: publicUrl });
        alert("Avatar updated successfully!");
      } else if (type === "chat" && activeChat) {
        // Send image message
        const { error: msgError } = await supabase.from("messages").insert({
          chat_id: activeChat.chat_id,
          sender_id: user.id,
          message: "Sent an image",
          media_path: filePath,
          message_type: "image",
          is_delivered: true,
          is_seen: false,
        });
        if (msgError) throw msgError;
        scrollToBottom();
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to upload file.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Update Profile
  const handleSaveProfile = async () => {
    if (!user?.id || !editFullName.trim() || !editUsername.trim()) {
      alert("Full name and username are required.");
      return;
    }

    setUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editFullName.trim(),
          username: editUsername.trim().toLowerCase(),
          status: editStatus.trim(),
          avatar_url: editAvatarUrl || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      updateProfile({
        full_name: editFullName.trim(),
        username: editUsername.trim().toLowerCase(),
        status: editStatus.trim(),
        avatar_url: editAvatarUrl || null,
      });

      alert("Profile updated successfully!");
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to save profile.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Broadcast Notification (Admin dashboard flow)
  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim() || !profile?.company_name || !user?.id) {
      alert("Broadcast message cannot be empty.");
      return;
    }

    setAdminLoading(true);
    try {
      const employees = companyUsers.filter((u) => u.id !== user.id);
      if (employees.length === 0) {
        alert("No employee members to broadcast to.");
        setAdminLoading(false);
        return;
      }

      const payload = `${profile.company_name}|${broadcastMessage.trim()}`;
      const insertData = employees.map((emp) => ({
        user_id: emp.id,
        type: "company_broadcast",
        actor_id: user.id,
        related_id: payload,
        is_read: false,
      }));

      const { error } = await supabase.from("notifications").insert(insertData);
      if (error) throw error;

      setBroadcastMessage("");
      alert(`Broadcast sent to ${employees.length} employees successfully.`);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to send broadcast.");
    } finally {
      setAdminLoading(false);
    }
  };

  // Search filtered users in Settings tab
  const filteredUsers = allUsers.filter((u) => {
    const term = usersSearch.toLowerCase();
    return (
      (u.full_name || "").toLowerCase().includes(term) ||
      (u.username || "").toLowerCase().includes(term)
    );
  });

  // Search company employees in Dashboard tab
  const filteredCompanyUsers = companyUsers.filter((u) => {
    const term = dashboardSearch.toLowerCase();
    return (
      (u.full_name || "").toLowerCase().includes(term) ||
      (u.username || "").toLowerCase().includes(term)
    );
  });

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      {/* Hidden File Inputs for Web uploads */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFileChange(e, "chat")}
      />
      <input
        type="file"
        ref={avatarInputRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFileChange(e, "avatar")}
      />

      {/* 1. SIDEBAR (Left) */}
      <View style={[styles.sidebar, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>
        <View style={styles.sidebarHeader}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.sidebarAvatar} />
          ) : (
            <View style={[styles.sidebarAvatarPlaceholder, { backgroundColor: colors.accent }]}>
              <Text style={styles.sidebarInitials}>{getInitials(profile?.full_name || profile?.username || "")}</Text>
            </View>
          )}
          <Text style={[styles.sidebarProfileName, { color: colors.text }]} numberOfLines={1}>
            {profile?.full_name || profile?.username}
          </Text>
        </View>

        <View style={styles.sidebarMenu}>
          <TouchableOpacity
            style={[styles.menuItem, activeTab === "chats" && { backgroundColor: colors.backgroundSelected }]}
            onPress={() => setActiveTab("chats")}
          >
            <Home size={20} color={activeTab === "chats" ? colors.accent : colors.textSecondary} />
            <Text style={[styles.menuLabel, { color: activeTab === "chats" ? colors.accent : colors.text }]}>Chats</Text>
          </TouchableOpacity>

          {profile?.is_company_admin && (
            <TouchableOpacity
              style={[styles.menuItem, activeTab === "dashboard" && { backgroundColor: colors.backgroundSelected }]}
              onPress={() => setActiveTab("dashboard")}
            >
              <LayoutDashboard size={20} color={activeTab === "dashboard" ? colors.accent : colors.textSecondary} />
              <Text style={[styles.menuLabel, { color: activeTab === "dashboard" ? colors.accent : colors.text }]}>Admin</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.menuItem, activeTab === "settings" && { backgroundColor: colors.backgroundSelected }]}
            onPress={() => setActiveTab("settings")}
          >
            <SettingsIcon size={20} color={activeTab === "settings" ? colors.accent : colors.textSecondary} />
            <Text style={[styles.menuLabel, { color: activeTab === "settings" ? colors.accent : colors.text }]}>Settings</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleWebLogout}>
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutLabel}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* 2. MIDDLE LIST PANE */}
      <View style={[styles.listPane, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>
        
        {/* Chats Tab Middle Panel */}
        {activeTab === "chats" && (
          <View style={styles.paneContent}>
            <View style={styles.paneHeader}>
              <Text style={[styles.paneTitle, { color: colors.text }]}>Conversations</Text>
              <View style={[styles.searchBox, { backgroundColor: colors.background }]}>
                <Search size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="Search chats..."
                  placeholderTextColor={colors.textSecondary}
                  value={chatsSearch}
                  onChangeText={setChatsSearch}
                  style={[styles.searchInputField, { color: colors.text }]}
                />
              </View>
            </View>

            {chatsLoading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            ) : filteredChats.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={{ color: colors.textSecondary }}>No chats found.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {filteredChats.map((item) => {
                  const isActive = activeChat?.chat_id === item.chat_id;
                  const chatName = item.profile?.full_name || item.profile?.username || "User";
                  return (
                    <TouchableOpacity
                      key={item.chat_id}
                      style={[
                        styles.chatCard,
                        { borderBottomColor: colors.border },
                        isActive && { backgroundColor: colors.backgroundSelected }
                      ]}
                      onPress={() => setActiveChat(item)}
                    >
                      {item.profile?.avatar_url ? (
                        <Image source={{ uri: item.profile.avatar_url }} style={styles.chatCardAvatar} />
                      ) : (
                        <View style={[styles.chatCardAvatarPlaceholder, { backgroundColor: colors.backgroundSelected }]}>
                          <Text style={[styles.chatCardInitials, { color: colors.accent }]}>
                            {getInitials(chatName)}
                          </Text>
                        </View>
                      )}
                      
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <Text style={[styles.chatCardName, { color: colors.text }]} numberOfLines={1}>
                            {chatName}
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                            {formatTime(item.lastMessage?.created_at)}
                          </Text>
                        </View>

                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                          <Text style={[styles.chatCardLastMsg, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.lastMessage?.message_type === "image" ? "📷 Photo"
                              : item.lastMessage?.message_type === "video" ? "🎥 Video"
                              : item.lastMessage?.message_type === "audio" ? "🎤 Voice Message"
                              : item.lastMessage?.message_type === "file" ? `📄 ${item.lastMessage?.file_name || "File"}`
                              : item.lastMessage?.message || "No messages yet"}
                          </Text>
                          {item.unreadCount > 0 && (
                            <View style={[styles.unreadBadge, { backgroundColor: colors.accent }]}>
                              <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {/* Settings Tab Middle Panel */}
        {activeTab === "settings" && (
          <View style={styles.paneContent}>
            <View style={styles.paneHeader}>
              <Text style={[styles.paneTitle, { color: colors.text }]}>Settings</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                Manage profile & chat with other users.
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
              {/* Profile Card upload */}
              <View style={[styles.settingsCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TouchableOpacity onPress={() => triggerFileUpload("avatar")} style={styles.settingsAvatarWrapper}>
                  {editAvatarUrl ? (
                    <Image source={{ uri: editAvatarUrl }} style={styles.settingsAvatar} />
                  ) : (
                    <View style={[styles.settingsAvatarPlaceholder, { backgroundColor: colors.accent }]}>
                      <Text style={styles.settingsInitials}>{getInitials(editFullName || editUsername)}</Text>
                    </View>
                  )}
                  <View style={[styles.settingsAvatarBadge, { backgroundColor: colors.accent }]}>
                    <Camera size={14} color="#FFF" />
                  </View>
                </TouchableOpacity>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Full Name</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={editFullName}
                    onChangeText={setEditFullName}
                    placeholder="E.g. John Doe"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Username</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={editUsername}
                    onChangeText={setEditUsername}
                    placeholder="E.g. johndoe"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Status</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={editStatus}
                    onChangeText={setEditStatus}
                    placeholder="E.g. Hey there!"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                  onPress={handleSaveProfile}
                  disabled={updatingProfile}
                >
                  {updatingProfile ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Profile</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* All Users section */}
              <View style={{ marginTop: 24 }}>
                <Text style={[styles.subSectionTitle, { color: colors.text }]}>System Directory</Text>
                <View style={[styles.searchBox, { backgroundColor: colors.background, marginHorizontal: 0, marginTop: 8, marginBottom: 12 }]}>
                  <Search size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    placeholder="Search users to chat..."
                    placeholderTextColor={colors.textSecondary}
                    value={usersSearch}
                    onChangeText={setUsersSearch}
                    style={[styles.searchInputField, { color: colors.text }]}
                  />
                </View>

                {usersLoading ? (
                  <ActivityIndicator size="small" color={colors.accent} style={{ paddingVertical: 12 }} />
                ) : filteredUsers.length === 0 ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "center" }}>No other users found.</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {filteredUsers.map((item) => {
                      const name = item.full_name || item.username || "User";
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.userRow, { backgroundColor: colors.background, borderColor: colors.border }]}
                          onPress={() => handleStartChatWithUser(item)}
                        >
                          {item.avatar_url ? (
                            <Image source={{ uri: item.avatar_url }} style={styles.userRowAvatar} />
                          ) : (
                            <View style={[styles.userRowAvatarPlaceholder, { backgroundColor: colors.accent }]}>
                              <Text style={styles.userRowInitials}>{getInitials(name)}</Text>
                            </View>
                          )}
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.userRowName, { color: colors.text }]}>{name}</Text>
                            <Text style={[styles.userRowStatus, { color: colors.textSecondary }]} numberOfLines={1}>
                              {item.status || "Hey there!"}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.startChatBtn, { backgroundColor: colors.accent + "15" }]}
                            onPress={() => handleStartChatWithUser(item)}
                          >
                            <Text style={[styles.startChatBtnText, { color: colors.accent }]}>Chat</Text>
                          </TouchableOpacity>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Dashboard Tab Middle Panel */}
        {activeTab === "dashboard" && profile?.is_company_admin && (
          <View style={styles.paneContent}>
            <View style={styles.paneHeader}>
              <Text style={[styles.paneTitle, { color: colors.text }]}>Admin Dashboard</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                {profile?.company_name || "Company Management"}
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
              {/* Broadcast Announcement */}
              <View style={[styles.settingsCard, { backgroundColor: colors.background, borderColor: colors.border, marginBottom: 20 }]}>
                <Text style={[styles.formLabel, { color: colors.text, fontWeight: "700", marginBottom: 4 }]}>
                  Broadcast Announcement
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12 }}>
                  Send a company-wide push broadcast notification to all employees.
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      height: 80,
                      textAlignVertical: "top",
                      paddingTop: 8,
                    },
                  ]}
                  value={broadcastMessage}
                  onChangeText={setBroadcastMessage}
                  placeholder="Type broadcast message here..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                  onPress={handleSendBroadcast}
                  disabled={adminLoading}
                >
                  {adminLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Send Broadcast</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Company Employees */}
              <View style={{ gap: 8 }}>
                <Text style={[styles.subSectionTitle, { color: colors.text }]}>
                  Employees ({companyUsers.length})
                </Text>
                <View style={[styles.searchBox, { backgroundColor: colors.background, marginHorizontal: 0, marginTop: 8, marginBottom: 12 }]}>
                  <Search size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    placeholder="Search employees..."
                    placeholderTextColor={colors.textSecondary}
                    value={dashboardSearch}
                    onChangeText={setDashboardSearch}
                    style={[styles.searchInputField, { color: colors.text }]}
                  />
                </View>

                {filteredCompanyUsers.map((emp) => {
                  const empName = emp.full_name || emp.username || "Employee";
                  return (
                    <View key={emp.id} style={[styles.userRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      {emp.avatar_url ? (
                        <Image source={{ uri: emp.avatar_url }} style={styles.userRowAvatar} />
                      ) : (
                        <View style={[styles.userRowAvatarPlaceholder, { backgroundColor: colors.accent }]}>
                          <Text style={styles.userRowInitials}>{getInitials(empName)}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.userRowName, { color: colors.text }]}>{empName}</Text>
                        <Text style={{ fontSize: 12, color: emp.is_company_admin ? colors.accent : colors.textSecondary }}>
                          {emp.is_company_admin ? "Administrator" : "Employee"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* 3. MAIN CONTENT CHAT PANE (Right) */}
      <View style={[styles.mainChatPane, { backgroundColor: colors.background }]}>
        {activeChat ? (
          <View style={styles.chatPaneContainer}>
            
            {/* Chat Pane Header */}
            <View style={[styles.chatPaneHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              {activeChat.profile?.avatar_url ? (
                <Image source={{ uri: activeChat.profile.avatar_url }} style={styles.chatPaneAvatar} />
              ) : (
                <View style={[styles.chatPaneAvatarPlaceholder, { backgroundColor: colors.accent }]}>
                  <Text style={styles.chatPaneInitials}>
                    {getInitials(activeChat.profile?.full_name || activeChat.profile?.username || "")}
                  </Text>
                </View>
              )}
              
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={[styles.chatPaneHeaderName, { color: colors.text }]}>
                  {activeChat.profile?.full_name || activeChat.profile?.username}
                </Text>
                <Text style={{ fontSize: 12, color: activeChat.profile?.is_online ? "#22C55E" : colors.textSecondary }}>
                  {activeChat.profile?.is_online ? "● Online" : "Offline"}
                </Text>
              </View>
            </View>

            {/* Message History List */}
            <ScrollView
              ref={messageEndRef}
              style={{ flex: 1, padding: 24 }}
              contentContainerStyle={{ paddingBottom: 24 }}
              onContentSizeChange={scrollToBottom}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((item) => {
                const isMine = item.sender_id === user?.id;
                
                // Construct file URL if media_path exists
                let imageUrl = null;
                if (item.media_path) {
                  imageUrl = supabase.storage.from("chat-media").getPublicUrl(item.media_path).data.publicUrl;
                }

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.messageRow,
                      { justifyContent: isMine ? "flex-end" : "flex-start" }
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        {
                          backgroundColor: isMine ? colors.accent : colors.surface,
                          borderTopRightRadius: isMine ? 4 : 20,
                          borderTopLeftRadius: isMine ? 20 : 4,
                        }
                      ]}
                    >
                      {/* Image render */}
                      {item.message_type === "image" && imageUrl && (
                        <Image source={{ uri: imageUrl }} style={styles.messageImage} resizeMode="cover" />
                      )}

                      {/* Video render */}
                      {item.message_type === "video" && imageUrl && (
                        <video 
                          src={imageUrl} 
                          controls 
                          style={{ 
                            maxWidth: "100%", 
                            maxHeight: 200, 
                            borderRadius: 8, 
                            marginTop: 4,
                            outline: "none" 
                          }} 
                        />
                      )}

                      {/* Audio/Voice render */}
                      {item.message_type === "audio" && imageUrl && (
                        <audio 
                          src={imageUrl} 
                          controls 
                          style={{ 
                            width: 220, 
                            marginTop: 4,
                            outline: "none" 
                          }} 
                        />
                      )}

                      {/* File render */}
                      {item.message_type === "file" && imageUrl && (
                        <a 
                          href={imageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: 8, 
                            color: isMine ? "#FFF" : colors.accent, 
                            textDecoration: "underline", 
                            marginTop: 4,
                            fontSize: 14,
                            fontWeight: "500"
                          }}
                        >
                          📄 {item.file_name || "Download File"}
                        </a>
                      )}

                      {/* Text render */}
                      {(item.message_type === "text" || !item.message_type) && (
                        <Text style={[styles.messageText, { color: isMine ? "#FFF" : colors.text }]}>
                          {item.message}
                        </Text>
                      )}
                      
                      {/* Meta information */}
                      <View style={styles.messageMeta}>
                        <Text style={[styles.messageTime, { color: isMine ? "rgba(255,255,255,0.7)" : colors.textSecondary }]}>
                          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {isMine && (
                          <Text style={{ fontSize: 10, color: item.is_seen ? "#60A5FA" : "rgba(255,255,255,0.7)", marginLeft: 4 }}>
                            {item.is_seen || item.is_delivered ? "✓✓" : "✓"}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Chat Pane Footer Message Input */}
            <View style={[styles.chatPaneFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <TouchableOpacity style={styles.attachBtn} onPress={() => triggerFileUpload("chat")}>
                <Paperclip size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              
              <TextInput
                style={[styles.chatInputField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={msgInput}
                onChangeText={setMsgInput}
                placeholder="Type a message..."
                placeholderTextColor={colors.textSecondary}
                onSubmitEditing={handleSendMessage}
              />
              
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: colors.accent }]}
                onPress={handleSendMessage}
                disabled={sendingMsg}
              >
                <Send size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Splash view if no chat is active */
          <View style={styles.splashView}>
            <View style={[styles.splashIconBg, { backgroundColor: colors.surface }]}>
              <Text style={{ fontSize: 72 }}>💬</Text>
            </View>
            <Text style={[styles.splashTitle, { color: colors.text }]}>BlinkChat Web</Text>
            <Text style={[styles.splashDesc, { color: colors.textSecondary }]}>
              Send and receive messages instantly. Select a chat from the left panel to begin.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    flexDirection: "row",
    height: "100vh" as any,
    width: "100vw" as any,
    overflow: "hidden",
  },
  
  // 1. Sidebar Styles
  sidebar: {
    width: 80,
    height: "100%",
    borderRightWidth: 1,
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  sidebarHeader: {
    alignItems: "center",
    gap: 8,
    width: "100%",
    paddingHorizontal: 8,
  },
  sidebarAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  sidebarAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarInitials: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 18,
  },
  sidebarProfileName: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  sidebarMenu: {
    flex: 1,
    marginTop: 40,
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  menuItem: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  menuLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  logoutButton: {
    alignItems: "center",
    gap: 4,
  },
  logoutLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#EF4444",
  },

  // 2. Middle List Pane Styles
  listPane: {
    width: 350,
    height: "100%",
    borderRightWidth: 1,
  },
  paneContent: {
    flex: 1,
  },
  paneHeader: {
    padding: 24,
    paddingBottom: 16,
  },
  paneTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 16,
    marginHorizontal: 0,
  },
  searchInputField: {
    flex: 1,
    fontSize: 14,
    outlineStyle: "none" as any,
  },
  chatCard: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
    borderBottomWidth: 1,
  },
  chatCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  chatCardAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  chatCardInitials: {
    fontWeight: "700",
    fontSize: 16,
  },
  chatCardName: {
    fontWeight: "700",
    fontSize: 15,
  },
  chatCardLastMsg: {
    fontSize: 13,
    maxWidth: "80%",
  },
  unreadBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // settings card styling
  settingsCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  settingsAvatarWrapper: {
    position: "relative",
    marginBottom: 20,
  },
  settingsAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  settingsAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsInitials: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 28,
  },
  settingsAvatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  formGroup: {
    width: "100%",
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    width: "100%",
    outlineStyle: "none" as any,
  },
  saveBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  userRow: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  userRowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  userRowAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  userRowInitials: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  userRowName: {
    fontWeight: "600",
    fontSize: 14,
  },
  userRowStatus: {
    fontSize: 11,
  },
  startChatBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  startChatBtnText: {
    fontWeight: "700",
    fontSize: 12,
  },

  // 3. Right Pane Styles (Chat Box)
  mainChatPane: {
    flex: 1,
    height: "100%",
  },
  chatPaneContainer: {
    flex: 1,
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  chatPaneHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  chatPaneAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  chatPaneAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  chatPaneInitials: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
  chatPaneHeaderName: {
    fontSize: 16,
    fontWeight: "700",
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 12,
    width: "100%",
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: "60%",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageImage: {
    width: 300,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  messageTime: {
    fontSize: 10,
  },
  chatPaneFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  attachBtn: {
    padding: 10,
  },
  chatInputField: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    outlineStyle: "none" as any,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  // Splash view styles
  splashView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  splashIconBg: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  splashDesc: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 350,
    lineHeight: 22,
  },
});
