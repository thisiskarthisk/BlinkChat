
/**
 * components/OnlineFriendsBar.tsx
 * "Online FRNDs" preview row -> tap to open full list.
 * Only shows users who are already friends (accepted requests) AND currently online.
 */

import { supabase } from "@/lib/supabase";
import { createOrGetChat } from "@/services/chatService";
import { router } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const AVATAR_COLORS = [
  "#2563EB", "#7C3AED", "#DB2777", "#D97706",
  "#059669", "#DC2626", "#0891B2", "#9333EA",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : parts[0][0].toUpperCase();
}

export default function OnlineFriendsBar({ currentUserId }: { currentUserId: string }) {
  const [onlineFriends, setOnlineFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [openingChatId, setOpeningChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUserId) return;
    loadOnlineFriends();

    const channel = supabase
      .channel("online-friends-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        () => loadOnlineFriends()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const loadOnlineFriends = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      // 1. Get my chat ids (a chat = an accepted friend connection)
      const { data: myChats } = await supabase
        .from("chat_members")
        .select("chat_id")
        .eq("user_id", currentUserId);

      if (!myChats || myChats.length === 0) {
        setOnlineFriends([]);
        setLoading(false);
        return;
      }

      const chatIds = myChats.map((c) => c.chat_id);

      // 2. Get the other member of each of those chats -> my friends
      const { data: otherMembers } = await supabase
        .from("chat_members")
        .select("user_id, chat_id")
        .in("chat_id", chatIds)
        .neq("user_id", currentUserId);

      if (!otherMembers || otherMembers.length === 0) {
        setOnlineFriends([]);
        setLoading(false);
        return;
      }

      const friendIds = [...new Set(otherMembers.map((m) => m.user_id))];
      const chatIdByFriend: Record<string, string> = {};
      otherMembers.forEach((m) => (chatIdByFriend[m.user_id] = m.chat_id));

      // 3. Filter to friends who are online
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", friendIds)
        .eq("is_online", true);

      const withChatId = (profiles || []).map((p) => ({
        ...p,
        _chatId: chatIdByFriend[p.id],
      }));

      setOnlineFriends(withChatId);
    } catch (e) {
      console.log("loadOnlineFriends error:", e);
    } finally {
      setLoading(false);
    }
  };

  const openChat = async (friend: any) => {
    if (openingChatId) return;
    setOpeningChatId(friend.id);
    try {
      const chatId = friend._chatId || (await createOrGetChat(currentUserId, friend.id));
      if (chatId) {
        setShowModal(false);
        router.push({
          pathname: "/chat/[id]",
          params: { id: chatId, name: friend.full_name || friend.username || "User" },
        });
      }
    } finally {
      setOpeningChatId(null);
    }
  };

  if (!loading && onlineFriends.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.headerRow} onPress={() => setShowModal(true)} activeOpacity={0.7}>
        <View style={styles.liveDot} />
        <Text style={styles.headerText}>Online FRNDs</Text>
        {!loading && <Text style={styles.headerCount}>{onlineFriends.length}</Text>}
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 12 }} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow}>
          {onlineFriends.map((f) => {
            const name = f.full_name || f.username || "User";
            const color = getAvatarColor(name);
            return (
              <TouchableOpacity
                key={f.id}
                style={styles.friendItem}
                onPress={() => openChat(f)}
                activeOpacity={0.7}
              >
                <View style={[styles.avatarRing, { borderColor: color }]}>
                  <View style={[styles.avatarCircle, { backgroundColor: color }]}>
                    <Text style={styles.avatarInitials}>{getInitials(name)}</Text>
                  </View>
                  <View style={styles.onlineDotBadge} />
                </View>
                <Text style={styles.friendName} numberOfLines={1}>{name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Full list modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Online Friends ({onlineFriends.length})</Text>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              {onlineFriends.map((f) => {
                const name = f.full_name || f.username || "User";
                const color = getAvatarColor(name);
                const isOpening = openingChatId === f.id;
                return (
                  <View key={f.id} style={styles.modalRow}>
                    <View style={[styles.avatarRing, { borderColor: color }]}>
                      <View style={[styles.avatarCircle, { backgroundColor: color }]}>
                        <Text style={styles.avatarInitials}>{getInitials(name)}</Text>
                      </View>
                      <View style={styles.onlineDotBadge} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.modalRowName}>{name}</Text>
                      <Text style={styles.modalRowStatus} numberOfLines={1}>
                        {f.status || "Hey there! I am using BlinkChat"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.messageBtn}
                      onPress={() => openChat(f)}
                      disabled={isOpening}
                    >
                      {isOpening ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <MessageCircle size={18} color="#FFF" />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowModal(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingTop: 12, paddingBottom: 6, backgroundColor: "#FFFFFF" },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" },
  headerText: { fontSize: 14, fontWeight: "700", color: "#111827" },
  headerCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },

  scrollRow: { paddingHorizontal: 12, gap: 14 },

  friendItem: { alignItems: "center", width: 64 },

  avatarRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  onlineDotBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFF",
  },

  friendName: {
    fontSize: 11,
    color: "#374151",
    marginTop: 6,
    textAlign: "center",
    fontWeight: "600",
  },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "75%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 14 },

  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
  },
  modalRowName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  modalRowStatus: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },

  messageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },

  closeBtn: {
    marginTop: 12,
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  closeBtnText: { color: "#374151", fontWeight: "600", fontSize: 14 },
});