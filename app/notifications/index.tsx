import { router } from "expo-router";
import { ArrowLeft, BellOff, MessageSquare, Trash2, UserCheck, UserX } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import {
  acceptFriendRequest,
  getNotifications,
  getPendingRequests,
  markNotificationsRead,
  rejectFriendRequest,
} from "../../services/friendService";

function formatRelativeTime(isoString: string) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  return date.toLocaleDateString();
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);

  useEffect(() => {
    loadAll();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests", filter: `receiver_id=eq.${user?.id}` },
        loadAll
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user?.id}` },
        loadAll
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const loadAll = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [reqs, notifs] = await Promise.all([
      getPendingRequests(user.id),
      getNotifications(user.id),
    ]);
    setRequests(reqs || []);
    setNotifications(notifs || []);
    setLoading(false);

    if (notifs && notifs.some((n) => !n.is_read)) {
      await markNotificationsRead(user.id);
    }
  };

  const handleAccept = async (request: any) => {
    setActioningId(request.id);
    const { success, chatId, error } = await acceptFriendRequest(request.id);
    if (success && chatId) {
      router.push({
        pathname: "/chat/[id]",
        params: { id: chatId, name: request.sender.full_name || request.sender.username },
      });
    } else if (error) {
      Alert.alert("Error", error);
    }
    setActioningId(null);
  };

  const handleReject = async (requestId: number) => {
    setActioningId(requestId);
    const { success, error } = await rejectFriendRequest(requestId);
    if (!success && error) {
      Alert.alert("Error", error);
    } else {
      loadAll();
    }
    setActioningId(null);
  };

  // Delete individual notification from database & state
  const handleDeleteNotification = async (id: number) => {
    // Optimistic UI update
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    if (error) {
      Alert.alert("Error", "Could not delete notification");
      loadAll(); // rollback on error
    }
  };

  // Clear all notifications for the current user
  const handleClearAll = async () => {
    if (notifications.length === 0) return;

    Alert.alert(
      "Clear All Notifications",
      "Are you sure you want to delete all historical notifications?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            setNotifications([]); // Optimistic clear
            const { error } = await supabase
              .from("notifications")
              .delete()
              .eq("user_id", user?.id);

            if (error) {
              Alert.alert("Error", "Failed to clear all notifications");
              loadAll();
            }
          },
        },
      ]
    );
  };

  const renderRequest = (item: any) => {
    const sender = item.sender;
    const isWorking = actioningId === item.id;

    return (
      <View key={`req-${item.id}`} style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(sender?.full_name || sender?.username || "?")[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.messageText} numberOfLines={2}>
            <Text style={styles.bold}>{sender?.full_name || sender?.username}</Text> sent you a chat request.
          </Text>
          <Text style={styles.timeText}>{formatRelativeTime(item.created_at)}</Text>
        </View>
        <View style={styles.actions}>
          {isWorking ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => handleAccept(item)}
              >
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => handleReject(item.id)}
              >
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderNotification = (item: any) => {
    const actor = item.actor;
    let icon = <MessageSquare size={16} color="#2563EB" />;
    let message = "";

    if (item.type === "request_accepted") {
      icon = <UserCheck size={16} color="#10B981" />;
      message = "accepted your chat request.";
    } else if (item.type === "request_rejected") {
      icon = <UserX size={16} color="#EF4444" />;
      message = "rejected your chat request.";
    } else if (item.type === "new_request") {
      icon = <MessageSquare size={16} color="#2563EB" />;
      message = "sent you a chat request.";
    }

    return (
      <View key={`notif-${item.id}`} style={[styles.card, !item.is_read && styles.unreadCard]}>
        <TouchableOpacity
          style={styles.notifClickableArea}
          onPress={() => {
            if (item.type === "request_accepted" && item.related_id) {
              router.push({
                pathname: "/chat/[id]",
                params: { id: item.related_id, name: actor?.full_name || actor?.username || "User" },
              });
            }
          }}
        >
          <View style={[styles.iconContainer, { backgroundColor: (icon.props as any).color + "12" }]}>
            {icon}
          </View>
          <View style={styles.info}>
            <Text style={styles.messageText} numberOfLines={2}>
              <Text style={styles.bold}>{actor?.full_name || actor?.username}</Text> {message}
            </Text>
            <Text style={styles.timeText}>{formatRelativeTime(item.created_at)}</Text>
          </View>
        </TouchableOpacity>

        {/* Delete Single Card Button */}
        <TouchableOpacity
          style={styles.deleteCardBtn}
          onPress={() => handleDeleteNotification(item.id)}
        >
          <Trash2 size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    );
  };

  const combinedData = [
    ...requests.map((r) => ({ ...r, isRequest: true })),
    ...notifications.map((n) => ({ ...n, isNotification: true })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        
        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearAllBtn}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : combinedData.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <BellOff size={40} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySub}>When activities happen, your alerts show up right here.</Text>
        </View>
      ) : (
        <FlatList
          data={combinedData}
          keyExtractor={(item) => (item.isRequest ? `req-${item.id}` : `notif-${item.id}`)}
          renderItem={({ item }) => (item.isRequest ? renderRequest(item) : renderNotification(item))}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  clearAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  list: {
    padding: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: "#EFF6FF",
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },
  notifClickableArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  info: {
    flex: 1,
    paddingRight: 4,
  },
  messageText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 19,
  },
  bold: {
    fontWeight: "600",
    color: "#0F172A",
  },
  timeText: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionBtn: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  acceptBtn: {
    backgroundColor: "#2563EB",
  },
  rejectBtn: {
    backgroundColor: "#F1F5F9",
  },
  acceptText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  rejectText: {
    color: "#EF4444",
    fontWeight: "600",
    fontSize: 12,
  },
  deleteCardBtn: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 8,
  },
});