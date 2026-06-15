// import AppHeader from "@/components/AppHeader";
// import { supabase } from "@/lib/supabase";
// import { createOrGetChat } from "@/services/chatService";

// import { router } from "expo-router";
// import { useEffect, useState } from "react";

// import {
//     ActivityIndicator,
//     FlatList,
//     StyleSheet,
//     Text,
//     TextInput,
//     TouchableOpacity,
//     View,
// } from "react-native";

// export default function SearchScreen() {
//   const [search, setSearch] = useState("");
//   const [users, setUsers] = useState<any[]>([]);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     loadUsers();
//   }, []);

//   const loadUsers = async () => {
//     try {
//         setLoading(true);

//         const {
//         data: { user },
//         } = await supabase.auth.getUser();

//         if (!user) return;

//         const { data, error } = await supabase
//         .from("profiles")
//         .select("*")
//         .neq("id", user.id)
//         .order("username", {
//             ascending: true,
//         });

//         if (error) {
//         console.log(error);
//         return;
//         }

//         setUsers(data || []);
//     } catch (error) {
//         console.log(error);
//     } finally {
//         setLoading(false);
//     }
//     };


//  const searchUsers = async (text: string) => {
//   setSearch(text);

//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   if (!user) return;

//   if (!text.trim()) {
//     loadUsers();
//     return;
//   }

//   const { data, error } = await supabase
//     .from("profiles")
//     .select("*")
//     .neq("id", user.id)
//     .or(
//       `username.ilike.%${text}%,full_name.ilike.%${text}%`
//     );

//   if (error) {
//     console.log(error);
//     return;
//   }

//   setUsers(data || []);
// };

//   const openChat = async (selectedUser: any) => {
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) return;

//       const chatId = await createOrGetChat(
//         user.id,
//         selectedUser.id
//       );

//       if (!chatId) {
//         alert("Failed to create chat");
//         return;
//       }

//       router.push({
//         pathname: "/chat/[id]",
//         params: {
//           id: chatId,
//           name: selectedUser.full_name,
//         },
//       });
//       console.log("Current User:", user?.id);
//     console.log("Selected User:", selectedUser.id);
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   const renderUser = ({ item }: any) => {
//     return (
//       <TouchableOpacity
//         style={styles.userCard}
//         onPress={() => openChat(item)}
//       >
//         <View style={styles.avatar}>
//           <Text style={styles.avatarText}>
//             {item.full_name?.charAt(0)}
//           </Text>
//         </View>

//         <View style={{ flex: 1 }}>
//           <Text style={styles.name}>
//             {item.full_name}
//           </Text>

//           <Text style={styles.username}>
//             @{item.username}
//           </Text>

//           <Text style={styles.status}>
//             {item.status || "Hey there! I am using BlinkChat"}
//           </Text>
//         </View>
//       </TouchableOpacity>
//     );
//   };

//   return (
//     <View style={styles.container}>
//       <AppHeader title="New Chat" />

//       <TextInput
//         placeholder="Search users..."
//         value={search}
//         onChangeText={searchUsers}
//         style={styles.searchInput}
//       />

//       {loading ? (
//         <ActivityIndicator
//           size="large"
//           style={{ marginTop: 30 }}
//         />
//       ) : (
//         <FlatList
//           data={users}
//           keyExtractor={(item) => item.id}
//           renderItem={renderUser}
//           showsVerticalScrollIndicator={false}
//         />
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#F8FAFC",
//   },

//   searchInput: {
//     backgroundColor: "#FFFFFF",
//     borderWidth: 1,
//     borderColor: "#E5E7EB",
//     borderRadius: 12,
//     margin: 15,
//     paddingHorizontal: 15,
//     paddingVertical: 12,
//   },

//   userCard: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#FFFFFF",
//     marginHorizontal: 15,
//     marginBottom: 10,
//     padding: 15,
//     borderRadius: 12,
//   },

//   avatar: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     backgroundColor: "#2563EB",
//     justifyContent: "center",
//     alignItems: "center",
//     marginRight: 12,
//   },

//   avatarText: {
//     color: "#FFFFFF",
//     fontSize: 18,
//     fontWeight: "bold",
//   },

//   name: {
//     fontSize: 16,
//     fontWeight: "700",
//     color: "#111827",
//   },

//   username: {
//     color: "#6B7280",
//     marginTop: 2,
//   },

//   status: {
//     color: "#9CA3AF",
//     marginTop: 2,
//     fontSize: 12,
//   },
// });




/**
 * users/search.tsx
 * Search for users and open/create a chat
 */

import { supabase } from "@/lib/supabase";
import { createOrGetChat } from "@/services/chatService";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../hooks/useAuth";

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

export default function SearchScreen() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingChat, setOpeningChat] = useState<string | null>(null);
  const searchRef = useRef<TextInput>(null);

  useEffect(() => {
    loadUsers();
    setTimeout(() => searchRef.current?.focus(), 300);
  }, []);

  const loadUsers = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id)
        .order("full_name", { ascending: true });

      if (error) { console.log(error); return; }
      setUsers(data || []);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (text: string) => {
    setSearch(text);
    if (!user?.id) return;

    if (!text.trim()) { loadUsers(); return; }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", user.id)
      .or(`username.ilike.%${text}%,full_name.ilike.%${text}%,phone.ilike.%${text}%`);

    setUsers(data || []);
  };

  const openChat = async (selectedUser: any) => {
    if (!user?.id || openingChat) return;
    try {
      setOpeningChat(selectedUser.id);
      const chatId = await createOrGetChat(user.id, selectedUser.id);
      if (!chatId) { alert("Could not open chat. Try again."); return; }

      router.push({
        pathname: "/chat/[id]",
        params: {
          id: chatId,
          name: selectedUser.full_name || selectedUser.username || "User",
        },
      });
    } finally {
      setOpeningChat(null);
    }
  };

  const renderUser = ({ item }: any) => {
    const name = item.full_name || item.username || "User";
    const avatarColor = getAvatarColor(name);
    const isLoading = openingChat === item.id;

    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => openChat(item)}
        activeOpacity={0.7}
        disabled={!!openingChat}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{getInitials(name)}</Text>
          {item.is_online && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.username}>@{item.username}</Text>
          <Text style={styles.status} numberOfLines={1}>
            {item.status || "Hey there! I am using BlinkChat"}
          </Text>
        </View>

        <View style={styles.right}>
          {item.is_online ? (
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineBadgeText}>Online</Text>
            </View>
          ) : null}
          {isLoading ? (
            <ActivityIndicator size="small" color="#2563EB" style={{ marginTop: 4 }} />
          ) : (
            <Text style={styles.chevron}>›</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Chat</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          ref={searchRef}
          style={styles.searchInput}
          placeholder="Search by name, username or phone..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={searchUsers}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(""); loadUsers(); }}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyText}>
            {search ? `No users found for "${search}"` : "No other users yet"}
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionLabel}>
            {search ? `${users.length} result${users.length !== 1 ? "s" : ""}` : `All Users (${users.length})`}
          </Text>
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={renderUser}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    gap: 10,
  },

  backBtn: { padding: 4 },
  backText: { fontSize: 22, color: "#2563EB", fontWeight: "700" },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  searchIcon: { fontSize: 16, marginRight: 8 },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },

  clearBtn: { color: "#9CA3AF", fontSize: 16, paddingLeft: 8 },

  sectionLabel: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    position: "relative",
  },

  avatarText: { color: "#FFF", fontSize: 17, fontWeight: "700" },

  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFF",
  },

  userInfo: { flex: 1 },

  name: { fontSize: 16, fontWeight: "600", color: "#111827" },

  username: { fontSize: 13, color: "#6B7280", marginTop: 2 },

  status: { fontSize: 12, color: "#9CA3AF", marginTop: 3 },

  right: { alignItems: "center", gap: 4 },

  onlineBadge: {
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  onlineBadgeText: { fontSize: 11, color: "#16A34A", fontWeight: "600" },

  chevron: { fontSize: 22, color: "#D1D5DB", marginTop: 2 },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  emptyEmoji: { fontSize: 48, marginBottom: 12 },

  emptyText: { fontSize: 16, color: "#6B7280", textAlign: "center" },
});