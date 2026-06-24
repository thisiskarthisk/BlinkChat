import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { router, useFocusEffect } from "expo-router";
import { AlertTriangle, Bell, ChevronRight, Lock, LogOut, Search, SquarePen, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import WebSplitScreenLayout from "../../components/WebSplitScreenLayout";
import { APP_CONFIG } from "../../constants/config";
import { useTheme } from "../../hooks/use-theme";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { markAllMessagesDelivered } from "../../services/chatService";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  getAcceptedFriends,
  getPendingRequests,
  getSentPendingRequests,
  rejectFriendRequest,
} from "../../services/friendService";
import { triggerLocalNotification } from "../../services/pushNotificationService";
import {
  AutoDeleteInfo,
  checkAutoDeletePolicy,
  getCachedMessages,
  syncAndCleanupSupabase
} from "../../services/storageService";

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
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString("en-IN", { weekday: "short" });
  }
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit" });
}

function formatDuration(seconds: number) {
  const min = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${min}:${String(rem).padStart(2, "0")}`;
}

const AVATAR_COLORS = [
  "#2563EB", "#7C3AED", "#DB2777", "#D97706",
  "#059669", "#DC2626", "#0891B2", "#9333EA",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const isAudioMessage = (item: any) => {
  if (!item) return false;
  const type = item.message_type;
  if (type === "audio") return true;
  if (type === "file") {
    const name = item.file_name || item.message || "";
    const lower = name.toLowerCase();
    return lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".m4a") || lower.endsWith(".aac") || lower.endsWith(".ogg") || lower.endsWith(".webm") || lower.endsWith(".mpga");
  }
  return false;
};

function getMessagePreview(lastMessage: any) {
  if (!lastMessage) return "No messages yet";
  const type = lastMessage.message_type || "text";
  const message = lastMessage.message || "";
  
  if (type === "image") return "📷 Photo";
  if (type === "video") return "🎥 Video";
  if (type === "audio") {
    const min = Math.floor((lastMessage.audio_duration || 0) / 60);
    const rem = (lastMessage.audio_duration || 0) % 60;
    const durStr = `${min}:${String(rem).padStart(2, "0")}`;
    return `🎤 Voice Message (${durStr})`;
  }
  if (type === "file") {
    if (isAudioMessage(lastMessage)) {
      return `🎵 ${lastMessage.file_name || "Audio File"}`;
    }
    return `📄 ${lastMessage.file_name || "File"}`;
  }
  if (type === "location") return "📍 Location";
  if (type === "live_location") return "📍 Live Location";
  
  let cleanText = message;
  if (cleanText.startsWith("|||reply_id:")) {
    const parts = cleanText.split("|||");
    cleanText = parts[parts.length - 1] || "";
  }
  if (cleanText.startsWith("|||forwarded:true|||")) {
    cleanText = cleanText.substring("|||forwarded:true|||".length);
  }
  
  return cleanText;
}

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  if (Platform.OS === "web") {
    return <WebSplitScreenLayout />;
  }
  const { colors } = useTheme();
  const [chats, setChats] = useState<any[]>([]);
  const [filteredChats, setFilteredChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Locked Chats State
  const [lockedChats, setLockedChats] = useState<any[]>([]);
  const [showLockedSection, setShowLockedSection] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [showPinModal, setShowPinModal] = useState(false);

  // Retention Alert state
  const [autoDeleteInfo, setAutoDeleteInfo] = useState<AutoDeleteInfo | null>(null);
  const [countdownText, setCountdownText] = useState("");

  // Friendship and Requests State
  const [acceptedFriends, setAcceptedFriends] = useState<any[]>([]);
  const [acceptedFriendsCount, setAcceptedFriendsCount] = useState(0);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [totalRequestsCount, setTotalRequestsCount] = useState(0);

  // Modal Visibility States
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [friendsSearch, setFriendsSearch] = useState("");
  const [requestsTab, setRequestsTab] = useState<"received" | "sent">("received");
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [actioningRequestId, setActioningRequestId] = useState<number | null>(null);

  const loadChats = useCallback(async () => {
    if (!user?.id) return;
    try {
      await markAllMessagesDelivered(user.id);

      // Perform background sync/cleanup and fetch auto-delete info
      try {
        await syncAndCleanupSupabase(user.id);
        const info = await checkAutoDeletePolicy(user.id);
        setAutoDeleteInfo(info);
      } catch (e) {
        console.log("Background sync error:", e);
      }

      const { data: myChats, error } = await supabase
        .from("chat_members")
        .select("chat_id")
        .eq("user_id", user.id);

      if (error || !myChats?.length) {
        setChats([]);
        setFilteredChats([]);
        setLockedChats([]);
        return;
      }

      const result: any[] = [];
      const lockedResult: any[] = [];
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

        // Check Local Lock
        const isLocked = await AsyncStorage.getItem(`chat_locked_${user.id}_${otherMember.user_id}`);

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", otherMember.user_id)
          .maybeSingle();

        // Load cached messages first for offline support & nightly deletions fallback
        const cachedMsgs = await getCachedMessages(chat.chat_id);
        let lastMessage = cachedMsgs[cachedMsgs.length - 1] || null;

        if (!lastMessage) {
          const { data } = await supabase
            .from("messages")
            .select("*")
            .eq("chat_id", chat.chat_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          lastMessage = data;
        }

        const { count: unreadCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("chat_id", chat.chat_id)
          .eq("is_seen", false)
          .neq("sender_id", user.id);

        const chatObj = {
          chat_id: chat.chat_id,
          profile,
          lastMessage,
          unreadCount: unreadCount || 0,
        };

        if (isLocked === "true") {
          lockedResult.push(chatObj);
        } else {
          result.push(chatObj);
        }
      }

      const sortByTime = (a: any, b: any) => {
        const tA = a.lastMessage?.created_at
          ? new Date(a.lastMessage.created_at).getTime() : 0;
        const tB = b.lastMessage?.created_at
          ? new Date(b.lastMessage.created_at).getTime() : 0;
        return tB - tA;
      };

      result.sort(sortByTime);
      lockedResult.sort(sortByTime);

      setChats(result);
      setLockedChats(lockedResult);
      applySearch(result, search);
      loadRequests();
      
      // Save to local cache for instant loading
      if (user?.id) {
        await AsyncStorage.setItem(`cached_chats_${user.id}`, JSON.stringify(result));
      }
    } catch (err) {
      console.log("loadChats error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, search]);

  const handleUnlockLockedChats = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Unlock your private chats",
          fallbackLabel: "Use PIN",
        });

        if (result.success) {
          router.push("/locked-chats");
          return;
        }
      }

      // Fallback to PIN if biometrics fail or not available
      setShowPinModal(true);
    } catch (e) {
      console.error(e);
      setShowPinModal(true);
    }
  };

  const handlePinVerification = async () => {
    if (!user?.id) return;
    const globalPin = await AsyncStorage.getItem(`chat_pin_${user.id}`);
    if (pinInput === globalPin) {
      setShowPinModal(false);
      setPinInput("");
      router.push("/locked-chats");
    } else {
      Alert.alert("Error", "Incorrect PIN");
      setPinInput("");
    }
  };

  const loadRequests = async () => {
    if (!user?.id) return;
    try {
      setLoadingFriends(true);
      setLoadingRequests(true);

      // 1. Get accepted friends
      const friends = await getAcceptedFriends(user.id);
      setAcceptedFriends(friends);
      setAcceptedFriendsCount(friends.length);

      // 2. Get incoming pending requests
      const incoming = await getPendingRequests(user.id);
      setIncomingRequests(incoming || []);

      // 3. Get outgoing pending requests
      const outgoing = await getSentPendingRequests(user.id);
      setOutgoingRequests(outgoing || []);

      // 4. Update request counts
      const incomingCount = incoming?.length || 0;
      const outgoingCount = outgoing?.length || 0;
      setTotalRequestsCount(incomingCount + outgoingCount);
      setPendingRequestsCount(incomingCount);
    } catch (error) {
      console.log("loadRequests error:", error);
    } finally {
      setLoadingFriends(false);
      setLoadingRequests(false);
    }
  };

  function applySearch(data: any[], query: string) {
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
  }

  useEffect(() => {
    applySearch(chats, search);
  }, [search, chats]);

  // Retention warning banner ticker
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
        loadChats();
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

  useFocusEffect(
    useCallback(() => {
      loadChats();
      // Reset lock state when screen comes into focus
      setShowLockedSection(false);
    }, [loadChats])
  );

  // Periodic background/foreground sync every 15 minutes to secure messages before deletion
  useEffect(() => {
    if (!user?.id) return;

    // Run sync immediately on startup
    syncAndCleanupSupabase(user.id).catch((e) => console.log("Init sync error:", e));

    const interval = setInterval(() => {
      syncAndCleanupSupabase(user.id).catch((e) => console.log("Periodic sync error:", e));
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, [user?.id]);

  // Load cached chats on mount
  useEffect(() => {
    const loadCachedChats = async () => {
      try {
        const cached = await AsyncStorage.getItem(`cached_chats_${user?.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setChats(parsed);
          applySearch(parsed, search);
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
    const channel = supabase
      .channel("home-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, async (payload) => {
        loadChats();
        if (payload.eventType === "INSERT") {
          const newMsg = payload.new;
          if (newMsg && newMsg.sender_id !== user?.id) {
            // Check if current user is part of the chat room
            const { data: member } = await supabase
              .from("chat_members")
              .select("chat_id")
              .eq("chat_id", newMsg.chat_id)
              .eq("user_id", user?.id)
              .maybeSingle();

            if (member) {
              const { data: sender } = await supabase
                .from("profiles")
                .select("full_name, username")
                .eq("id", newMsg.sender_id)
                .maybeSingle();

              const senderName = sender?.full_name || sender?.username || "New Message";
              let bodyText = newMsg.message || "";
              if (newMsg.message_type === "image") bodyText = "📷 Sent an image";
              else if (newMsg.message_type === "video") bodyText = "🎥 Sent a video";
              else if (newMsg.message_type === "audio") bodyText = "🎵 Sent an audio message";
              else if (newMsg.message_type === "file") bodyText = "📁 Sent a file";

              const isMuted = await AsyncStorage.getItem(`chat_notifications_muted_${user?.id}_${newMsg.sender_id}`);
              if (isMuted !== "true") {
                await triggerLocalNotification(senderName, bodyText, { chatId: newMsg.chat_id });
              }
            }
          }
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_members" }, loadChats)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, loadChats)
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, loadRequests)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadChats, user?.id]);

  const onRefresh = async () => {
    setLoading(true);
    await loadChats();
    setShowLockedSection(true); // Reveal on swipe down
    setLoading(false);
  };

  const logout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const renderChat = ({ item }: any) => {
    const name = item.profile?.full_name || item.profile?.username || "User";
    const avatarColor = getAvatarColor(name);
    const isOnline = item.profile?.is_online;
    const preview = getMessagePreview(item.lastMessage);

    return (
      <TouchableOpacity
        style={styles.chatCard}
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: "/chat/[id]",
            params: { id: item.chat_id, name },
          })
        }
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          {item.profile?.avatar_url ? (
            <Image source={{ uri: item.profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{getInitials(name)}</Text>
          )}
          {isOnline && <View style={styles.onlineDot} />}
        </View>

        {/* Content */}
        <View style={styles.chatContent}>
          <View style={styles.chatTop}>
            <Text style={styles.chatName} numberOfLines={1}>{name}</Text>
            <Text style={styles.chatTime}>{formatTime(item.lastMessage?.created_at)}</Text>
          </View>
          <View style={styles.chatBottom}>
            <Text style={styles.chatPreview} numberOfLines={1}>
              {preview}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowLockedSection(!showLockedSection)}>
          <Text style={styles.headerTitle}>{APP_CONFIG.appName}</Text>
          <Text style={styles.headerSub}>
            {chats.length > 0 ? `${chats.length} conversation${chats.length > 1 ? "s" : ""}` : ""}
          </Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => router.push("/notifications")}
          >
            <Bell size={20} color="#6B7280" />
            {pendingRequestsCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{pendingRequestsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.newChatBtn}
            onPress={() => router.push("/users/search")}
          >
            <SquarePen size={20} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutIconBtn} onPress={logout}>
            <LogOut size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <X size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Stats Pill Row */}
      {/* <View style={styles.statsRow}>
        <TouchableOpacity 
          style={[styles.statCard]}
          activeOpacity={0.7}
          onPress={() => {
            setFriendsSearch("");
            setShowFriendsModal(true);
          }}
        >
          <View style={[styles.statIconContainer, { backgroundColor: "#EFF6FF" }]}>
            <Users size={16} color="#2563EB" />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statCount}>{acceptedFriendsCount}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
        </TouchableOpacity>
      </View> */}



      {/* Locked Chats Entry */}
      {(lockedChats.length > 0 || showLockedSection) && (
        <TouchableOpacity 
          style={styles.lockedSectionBtn} 
          onPress={() => setShowPinModal(true)}
        >
          <View style={styles.lockedRow}>
            <Lock size={18} color="#075E54" />
            <Text style={styles.lockedText}>Locked Chats</Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>
      )}

      {/* Chat List */}
      {chats.length === 0 && loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : filteredChats.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>{search ? "🔍" : "💬"}</Text>
          <Text style={styles.emptyTitle}>
            {search ? "No results found" : "No chats yet"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {search
              ? `No chats matching "${search}"`
              : "Tap the pencil icon to start a new conversation"}
          </Text>
          {!search && (
            <TouchableOpacity
              style={styles.startChatBtn}
              onPress={() => router.push("/users/search")}
            >
              <Text style={styles.startChatText}>Start a Chat</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.chat_id}
          renderItem={renderChat}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingVertical: 8 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* PIN Verification Modal */}
      <Modal visible={showPinModal} transparent animationType="fade">
        <View style={styles.pinModalOverlay}>
          <View style={styles.pinModalContent}>
            <Text style={styles.pinModalTitle}>Enter Chat PIN</Text>
            <Text style={styles.pinModalSub}>Enter your 4-digit PIN to reveal locked chats</Text>
            
            <TextInput
              style={styles.pinInput}
              value={pinInput}
              onChangeText={setPinInput}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              autoFocus
              placeholder="****"
            />

            <View style={styles.pinModalActions}>
              <TouchableOpacity 
                style={styles.pinCancelBtn} 
                onPress={() => {
                  setShowPinModal(false);
                  setPinInput("");
                }}
              >
                <Text style={styles.pinCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.pinSubmitBtn} 
                onPress={handlePinVerification}
              >
                <Text style={styles.pinSubmitText}>Unlock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Floating Timer Icon */}
      {autoDeleteInfo?.enabled && autoDeleteInfo.triggerWarning && (
        <TouchableOpacity
          style={styles.floatingTimer}
          onPress={() => router.push("/notifications")}
          activeOpacity={0.9}
        >
          <AlertTriangle size={16} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.floatingTimerText}>{countdownText}</Text>
        </TouchableOpacity>
      )}

      {/* Accepted Friends Modal */}
      {/* <Modal visible={showFriendsModal} animationType="slide" transparent={false} onRequestClose={() => setShowFriendsModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: "#F8FAFC" }]}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>My Friends</Text>
            <TouchableOpacity 
              style={styles.modalCloseBtn} 
              onPress={() => setShowFriendsModal(false)}
            >
              <X size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchContainer}>
            <Search size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search friends..."
              placeholderTextColor="#9CA3AF"
              value={friendsSearch}
              onChangeText={setFriendsSearch}
            />
            {friendsSearch.length > 0 && (
              <TouchableOpacity onPress={() => setFriendsSearch("")}>
                <X size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {loadingFriends ? (
            <View style={styles.modalCenter}>
              <ActivityIndicator size="large" color="#2563EB" />
            </View>
          ) : acceptedFriends.length === 0 ? (
            <View style={styles.modalCenter}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>👥</Text>
              <Text style={styles.modalEmptyTitle}>No friends yet</Text>
              <Text style={styles.modalEmptySub}>Discover and connect with new friends using the search bar.</Text>
              <TouchableOpacity
                style={styles.findFriendsBtn}
                onPress={() => {
                  setShowFriendsModal(false);
                  router.push("/users/search");
                }}
              >
                <Text style={styles.findFriendsBtnText}>Find Friends</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={acceptedFriends.filter(item => {
                const name = (item.friendProfile?.full_name || item.friendProfile?.username || "").toLowerCase();
                return name.includes(friendsSearch.toLowerCase());
              })}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              renderItem={({ item }) => {
                const friend = item.friendProfile;
                const name = friend?.full_name || friend?.username || "User";
                const isOnline = friend?.is_online;
                const avatarBg = getAvatarColor(name);

                return (
                  <TouchableOpacity
                    style={styles.friendCard}
                    activeOpacity={0.7}
                    onPress={async () => {
                      if (!user?.id || !friend?.id) return;
                      const chatId = await createOrGetChat(user.id, friend.id);
                      if (chatId) {
                        setShowFriendsModal(false);
                        router.push({
                          pathname: "/chat/[id]",
                          params: { id: chatId, name },
                        });
                      }
                    }}
                  >
                    <View style={[styles.modalAvatar, { backgroundColor: avatarBg }]}>
                      {friend?.avatar_url ? (
                        <Image source={{ uri: friend.avatar_url }} style={styles.modalAvatarImage} />
                      ) : (
                        <Text style={styles.modalAvatarText}>{getInitials(name)}</Text>
                      )}
                      {isOnline && <View style={styles.onlineDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.friendName}>{name}</Text>
                      <Text style={styles.friendStatus} numberOfLines={1}>
                        {friend?.status || `Hey there! I am using ${APP_CONFIG.appName}`}
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </Modal> */}

      {/* Requests Modal */}
      <Modal visible={showRequestsModal} animationType="slide" transparent={false} onRequestClose={() => setShowRequestsModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: "#F8FAFC" }]}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Chat Requests</Text>
            <TouchableOpacity 
              style={styles.modalCloseBtn} 
              onPress={() => setShowRequestsModal(false)}
            >
              <X size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Segment Selector Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, requestsTab === "received" && styles.tabBtnActive]}
              onPress={() => setRequestsTab("received")}
            >
              <Text style={[styles.tabBtnText, requestsTab === "received" && styles.tabBtnTextActive]}>
                Received ({incomingRequests.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, requestsTab === "sent" && styles.tabBtnActive]}
              onPress={() => setRequestsTab("sent")}
            >
              <Text style={[styles.tabBtnText, requestsTab === "sent" && styles.tabBtnTextActive]}>
                Sent ({outgoingRequests.length})
              </Text>
            </TouchableOpacity>
          </View>

          {loadingRequests ? (
            <View style={styles.modalCenter}>
              <ActivityIndicator size="large" color="#2563EB" />
            </View>
          ) : requestsTab === "received" ? (
            incomingRequests.length === 0 ? (
              <View style={styles.modalCenter}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>📩</Text>
                <Text style={styles.modalEmptyTitle}>No incoming requests</Text>
                <Text style={styles.modalEmptySub}>When people send you chat requests, they'll appear here.</Text>
              </View>
            ) : (
              <FlatList
                data={incomingRequests}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                renderItem={({ item }) => {
                  const sender = item.sender;
                  const name = sender?.full_name || sender?.username || "User";
                  const avatarBg = getAvatarColor(name);
                  const isActioning = actioningRequestId === item.id;

                  return (
                    <View style={styles.requestItemCard}>
                      <View style={[styles.modalAvatar, { backgroundColor: avatarBg }]}>
                        {sender?.avatar_url ? (
                          <Image source={{ uri: sender.avatar_url }} style={styles.modalAvatarImage} />
                        ) : (
                          <Text style={styles.modalAvatarText}>{getInitials(name)}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.friendName}>{name}</Text>
                        <Text style={styles.friendStatus}>@{sender?.username || "username"}</Text>
                      </View>
                      <View style={styles.requestActions}>
                        {isActioning ? (
                          <ActivityIndicator size="small" color="#2563EB" />
                        ) : (
                          <>
                            <TouchableOpacity
                              style={[styles.requestBtn, styles.requestAcceptBtn]}
                              onPress={async () => {
                                setActioningRequestId(item.id);
                                const { success, chatId, error } = await acceptFriendRequest(item.id);
                                if (success && chatId) {
                                  setShowRequestsModal(false);
                                  await loadRequests();
                                  router.push({
                                    pathname: "/chat/[id]",
                                    params: { id: chatId, name },
                                  });
                                } else if (error) {
                                  Alert.alert("Error", error);
                                }
                                setActioningRequestId(null);
                              }}
                            >
                              <Text style={styles.requestAcceptText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.requestBtn, styles.requestRejectBtn]}
                              onPress={async () => {
                                setActioningRequestId(item.id);
                                const { success, error } = await rejectFriendRequest(item.id);
                                if (success) {
                                  await loadRequests();
                                } else if (error) {
                                  Alert.alert("Error", error);
                                }
                                setActioningRequestId(null);
                              }}
                            >
                              <Text style={styles.requestRejectText}>Reject</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  );
                }}
              />
            )
          ) : outgoingRequests.length === 0 ? (
            <View style={styles.modalCenter}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📤</Text>
              <Text style={styles.modalEmptyTitle}>No sent requests</Text>
              <Text style={styles.modalEmptySub}>Your sent friend requests that are waiting for response will appear here.</Text>
            </View>
          ) : (
            <FlatList
              data={outgoingRequests}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              renderItem={({ item }) => {
                const receiver = item.receiver;
                const name = receiver?.full_name || receiver?.username || "User";
                const avatarBg = getAvatarColor(name);
                const isActioning = actioningRequestId === item.id;

                return (
                  <View style={styles.requestItemCard}>
                    <View style={[styles.modalAvatar, { backgroundColor: avatarBg }]}>
                      {receiver?.avatar_url ? (
                        <Image source={{ uri: receiver.avatar_url }} style={styles.modalAvatarImage} />
                      ) : (
                        <Text style={styles.modalAvatarText}>{getInitials(name)}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.friendName}>{name}</Text>
                      <Text style={styles.friendStatus}>@{receiver?.username || "username"}</Text>
                    </View>
                    <View style={styles.requestActions}>
                      {isActioning ? (
                        <ActivityIndicator size="small" color="#2563EB" />
                      ) : (
                        <TouchableOpacity
                          style={[styles.requestBtn, styles.requestCancelBtn]}
                          onPress={async () => {
                            setActioningRequestId(item.id);
                            const { success, error } = await cancelFriendRequest(item.id);
                            if (success) {
                              await loadRequests();
                            } else if (error) {
                              Alert.alert("Error", error);
                            }
                            setActioningRequestId(null);
                          }}
                        >
                          <Text style={styles.requestCancelText}>Cancel</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },

  headerSub: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  newChatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },

  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  notifBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#EF4444",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },

  notifBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },

  newChatIcon: { fontSize: 18 },

  logoutIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },

  logoutIcon: { fontSize: 16, color: "#EF4444" },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },

  searchIcon: { fontSize: 16, marginRight: 8 },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },

  clearSearch: { fontSize: 16, color: "#9CA3AF", paddingLeft: 8 },

  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    position: "relative",
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },

  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },

  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  chatContent: { flex: 1 },

  chatTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  chatName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },

  chatTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  chatBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  chatPreview: {
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
    marginRight: 8,
  },

  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },

  emptyEmoji: { fontSize: 56, marginBottom: 16 },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },

  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },

  startChatBtn: {
    marginTop: 24,
    backgroundColor: "#2563EB",
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
  },

  startChatText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

  // Locked Chats Styles
  lockedSectionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  lockedRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  lockedText: { fontSize: 15, fontWeight: "600", color: "#075E54" },

  // PIN Modal Styles
  pinModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pinModalContent: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  pinModalTitle: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 8 },
  pinModalSub: { fontSize: 14, color: "#6B7280", marginBottom: 24, textAlign: "center" },
  pinInput: {
    width: 150,
    height: 50,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 10,
    marginBottom: 24,
    color: "#111827",
  },
  pinModalActions: { flexDirection: "row", gap: 12, width: "100%" },
  pinCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center" },
  pinCancelText: { fontSize: 15, fontWeight: "600", color: "#4B5563" },
  pinSubmitBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#075E54", alignItems: "center" },
  pinSubmitText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  floatingTimer: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#EF4444",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 999,
  },
  floatingTimerText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  // Stats Row
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  statIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statInfo: {
    justifyContent: "center",
  },
  statCount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 1,
  },

  // Modals Styling
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  modalHeaderTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  modalCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  modalEmptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  modalEmptySub: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
  findFriendsBtn: {
    marginTop: 20,
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  findFriendsBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  modalAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    position: "relative",
  },
  modalAvatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  modalAvatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  friendName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 3,
  },
  friendStatus: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Tabs style for Requests Modal
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginVertical: 12,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabBtnActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  tabBtnTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },

  // Request Cards
  requestItemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  requestActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  requestBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  requestAcceptBtn: {
    backgroundColor: "#2563EB",
  },
  requestAcceptText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  requestRejectBtn: {
    backgroundColor: "#F3F4F6",
  },
  requestRejectText: {
    color: "#EF4444",
    fontWeight: "600",
    fontSize: 12,
  },
  requestCancelBtn: {
    backgroundColor: "#FEF2F2",
  },
  requestCancelText: {
    color: "#EF4444",
    fontWeight: "600",
    fontSize: 12,
  },
});