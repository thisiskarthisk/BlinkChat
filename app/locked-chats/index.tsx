import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { ArrowLeft, Lock } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : parts[0][0].toUpperCase();
}

export default function LockedChatsScreen() {
  const { user } = useAuth();
  const [lockedChats, setLockedChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLockedChats = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data: myChats, error } = await supabase
        .from("chat_members")
        .select("chat_id")
        .eq("user_id", user.id);

      if (error || !myChats?.length) {
        setLockedChats([]);
        return;
      }

      const result: any[] = [];
      for (const chat of myChats) {
        const { data: otherMember } = await supabase
          .from("chat_members")
          .select("user_id")
          .eq("chat_id", chat.chat_id)
          .neq("user_id", user.id)
          .maybeSingle();

        if (!otherMember) continue;

        const isLocked = await AsyncStorage.getItem(`chat_locked_${user.id}_${otherMember.user_id}`);
        if (isLocked !== "true") continue;

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", otherMember.user_id)
          .maybeSingle();

        const { data: lastMessage } = await supabase
          .from("messages")
          .select("*")
          .eq("chat_id", chat.chat_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        result.push({
          chat_id: chat.chat_id,
          profile,
          lastMessage,
        });
      }

      result.sort((a, b) => {
        const tA = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0;
        const tB = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0;
        return tB - tA;
      });

      setLockedChats(result);
    } catch (err) {
      console.log("loadLockedChats error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadLockedChats();
    }, [loadLockedChats])
  );

  const renderChat = ({ item }: any) => {
    const name = item.profile?.full_name || item.profile?.username || "User";
    return (
      <TouchableOpacity
        style={styles.chatCard}
        onPress={() => router.push({
          pathname: "/chat/[id]",
          params: { id: item.chat_id, name },
        })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(name)}</Text>
        </View>
        <View style={styles.chatContent}>
          <Text style={styles.chatName}>{name}</Text>
          <Text style={styles.chatPreview} numberOfLines={1}>
            {item.lastMessage?.message || "No messages yet"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#075E54" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Lock size={20} color="#075E54" />
          <Text style={styles.headerTitle}>Locked Chats</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#075E54" />
        </View>
      ) : lockedChats.length === 0 ? (
        <View style={styles.emptyState}>
          <Lock size={64} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>No Locked Chats</Text>
          <Text style={styles.emptySubtitle}>You haven't locked any conversations yet.</Text>
        </View>
      ) : (
        <FlatList
          data={lockedChats}
          keyExtractor={(item) => item.chat_id}
          renderItem={renderChat}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: { padding: 4, marginRight: 16 },
  headerTitleContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#075E54" },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#075E54",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  chatContent: { flex: 1 },
  chatName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  chatPreview: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", marginTop: 8 },
});
