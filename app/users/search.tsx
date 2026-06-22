// // import AppHeader from "@/components/AppHeader";
// // import { supabase } from "@/lib/supabase";
// // import { createOrGetChat } from "@/services/chatService";

// // import { router } from "expo-router";
// // import { useEffect, useState } from "react";

// // import {
// //     ActivityIndicator,
// //     FlatList,
// //     StyleSheet,
// //     Text,
// //     TextInput,
// //     TouchableOpacity,
// //     View,
// // } from "react-native";

// // export default function SearchScreen() {
// //   const [search, setSearch] = useState("");
// //   const [users, setUsers] = useState<any[]>([]);
// //   const [loading, setLoading] = useState(false);

// //   useEffect(() => {
// //     loadUsers();
// //   }, []);

// //   const loadUsers = async () => {
// //     try {
// //         setLoading(true);

// //         const {
// //         data: { user },
// //         } = await supabase.auth.getUser();

// //         if (!user) return;

// //         const { data, error } = await supabase
// //         .from("profiles")
// //         .select("*")
// //         .neq("id", user.id)
// //         .order("username", {
// //             ascending: true,
// //         });

// //         if (error) {
// //         console.log(error);
// //         return;
// //         }

// //         setUsers(data || []);
// //     } catch (error) {
// //         console.log(error);
// //     } finally {
// //         setLoading(false);
// //     }
// //     };


// //  const searchUsers = async (text: string) => {
// //   setSearch(text);

// //   const {
// //     data: { user },
// //   } = await supabase.auth.getUser();

// //   if (!user) return;

// //   if (!text.trim()) {
// //     loadUsers();
// //     return;
// //   }

// //   const { data, error } = await supabase
// //     .from("profiles")
// //     .select("*")
// //     .neq("id", user.id)
// //     .or(
// //       `username.ilike.%${text}%,full_name.ilike.%${text}%`
// //     );

// //   if (error) {
// //     console.log(error);
// //     return;
// //   }

// //   setUsers(data || []);
// // };

// //   const openChat = async (selectedUser: any) => {
// //     try {
// //       const {
// //         data: { user },
// //       } = await supabase.auth.getUser();

// //       if (!user) return;

// //       const chatId = await createOrGetChat(
// //         user.id,
// //         selectedUser.id
// //       );

// //       if (!chatId) {
// //         alert("Failed to create chat");
// //         return;
// //       }

// //       router.push({
// //         pathname: "/chat/[id]",
// //         params: {
// //           id: chatId,
// //           name: selectedUser.full_name,
// //         },
// //       });
// //       console.log("Current User:", user?.id);
// //     console.log("Selected User:", selectedUser.id);
// //     } catch (error) {
// //       console.log(error);
// //     }
// //   };

// //   const renderUser = ({ item }: any) => {
// //     return (
// //       <TouchableOpacity
// //         style={styles.userCard}
// //         onPress={() => openChat(item)}
// //       >
// //         <View style={styles.avatar}>
// //           <Text style={styles.avatarText}>
// //             {item.full_name?.charAt(0)}
// //           </Text>
// //         </View>

// //         <View style={{ flex: 1 }}>
// //           <Text style={styles.name}>
// //             {item.full_name}
// //           </Text>

// //           <Text style={styles.username}>
// //             @{item.username}
// //           </Text>

// //           <Text style={styles.status}>
// //             {item.status || "Hey there! I am using BlinkChat"}
// //           </Text>
// //         </View>
// //       </TouchableOpacity>
// //     );
// //   };

// //   return (
// //     <View style={styles.container}>
// //       <AppHeader title="New Chat" />

// //       <TextInput
// //         placeholder="Search users..."
// //         value={search}
// //         onChangeText={searchUsers}
// //         style={styles.searchInput}
// //       />

// //       {loading ? (
// //         <ActivityIndicator
// //           size="large"
// //           style={{ marginTop: 30 }}
// //         />
// //       ) : (
// //         <FlatList
// //           data={users}
// //           keyExtractor={(item) => item.id}
// //           renderItem={renderUser}
// //           showsVerticalScrollIndicator={false}
// //         />
// //       )}
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //     backgroundColor: "#F8FAFC",
// //   },

// //   searchInput: {
// //     backgroundColor: "#FFFFFF",
// //     borderWidth: 1,
// //     borderColor: "#E5E7EB",
// //     borderRadius: 12,
// //     margin: 15,
// //     paddingHorizontal: 15,
// //     paddingVertical: 12,
// //   },

// //   userCard: {
// //     flexDirection: "row",
// //     alignItems: "center",
// //     backgroundColor: "#FFFFFF",
// //     marginHorizontal: 15,
// //     marginBottom: 10,
// //     padding: 15,
// //     borderRadius: 12,
// //   },

// //   avatar: {
// //     width: 50,
// //     height: 50,
// //     borderRadius: 25,
// //     backgroundColor: "#2563EB",
// //     justifyContent: "center",
// //     alignItems: "center",
// //     marginRight: 12,
// //   },

// //   avatarText: {
// //     color: "#FFFFFF",
// //     fontSize: 18,
// //     fontWeight: "bold",
// //   },

// //   name: {
// //     fontSize: 16,
// //     fontWeight: "700",
// //     color: "#111827",
// //   },

// //   username: {
// //     color: "#6B7280",
// //     marginTop: 2,
// //   },

// //   status: {
// //     color: "#9CA3AF",
// //     marginTop: 2,
// //     fontSize: 12,
// //   },
// // });




// /**
//  * users/search.tsx
//  * Search for users and open/create a chat
//  */

// import { supabase } from "@/lib/supabase";
// import { sendFriendRequest } from "@/services/friendService";
// import { createOrGetChat } from "@/services/chatService";
// import { router } from "expo-router";
// import { useEffect, useRef, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   FlatList,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { useAuth } from "../../hooks/useAuth";

// const AVATAR_COLORS = [
//   "#2563EB", "#7C3AED", "#DB2777", "#D97706",
//   "#059669", "#DC2626", "#0891B2", "#9333EA",
// ];

// function getAvatarColor(name: string) {
//   let hash = 0;
//   for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
//   return AVATAR_COLORS[hash % AVATAR_COLORS.length];
// }

// function getInitials(name: string) {
//   if (!name) return "?";
//   const parts = name.trim().split(" ");
//   return parts.length >= 2
//     ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
//     : parts[0][0].toUpperCase();
// }

// export default function SearchScreen() {
//   const { user, profile } = useAuth();
//   const [search, setSearch] = useState("");
//   const [users, setUsers] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [actionId, setActionId] = useState<string | null>(null);
//   const [existingChats, setExistingChats] = useState<string[]>([]);
//   const [pendingRequests, setPendingRequests] = useState<any[]>([]);
//   const searchRef = useRef<TextInput>(null);

//   useEffect(() => {
//     loadData();
//     setTimeout(() => searchRef.current?.focus(), 300);
//   }, []);

//   const loadData = async () => {
//     if (!user?.id) return;
//     setLoading(true);
//     try {
//       // Get existing chat user IDs
//       const { data: members } = await supabase
//         .from("chat_members")
//         .select("chat_id")
//         .eq("user_id", user.id);
      
//       if (members && members.length > 0) {
//         const chatIds = members.map(m => m.chat_id);
//         const { data: others } = await supabase
//           .from("chat_members")
//           .select("user_id")
//           .in("chat_id", chatIds)
//           .neq("user_id", user.id);
        
//         if (others) setExistingChats(others.map(o => o.user_id));
//       }

//       // Get pending requests sent by current user
//       const { data: requests } = await supabase
//         .from("friend_requests")
//         .select("receiver_id, status, rejection_count")
//         .eq("sender_id", user.id);
      
//       if (requests) setPendingRequests(requests);

//       await loadUsers(requests || []);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadUsers = async (requests: any[] = pendingRequests) => {
//     if (!user?.id) return;
    
//     // Get blocked users to hide them
//     const { data: blocked } = await supabase
//       .from("blocked_users")
//       .select("blocked_id")
//       .eq("blocker_id", user.id);
    
//     const blockedIds = blocked?.map(b => b.blocked_id) || [];

//     // Get users who rejected current user 3+ times
//     const rejections = requests.filter(r => (r.rejection_count || 0) >= 3).map(r => r.receiver_id);

//     const hideIds = [...blockedIds, ...rejections, user.id, '00000000-0000-0000-0000-000000000000'];

//     let queryBuilder = supabase
//       .from("profiles")
//       .select("*")
//       .not("id", "in", `(${hideIds.join(',')})`);

//     if (profile?.is_company_account) {
//       if (profile.company_id) {
//         queryBuilder = queryBuilder.eq("company_id", profile.company_id);
//       } else {
//         setUsers([]);
//         return;
//       }
//     } else {
//       queryBuilder = queryBuilder.eq("is_company_account", false);
//     }

//     const { data, error } = await queryBuilder.order("full_name", { ascending: true });

//     if (error) { console.log(error); return; }
//     setUsers(data || []);
//   };

//   const searchUsers = async (text: string) => {
//     setSearch(text);
//     if (!user?.id) return;

//     if (!text.trim()) { loadUsers(); return; }

//     let queryBuilder = supabase
//       .from("profiles")
//       .select("*")
//       .neq("id", user.id)
//       .or(`username.ilike.%${text}%,full_name.ilike.%${text}%,phone.ilike.%${text}%`);

//     if (profile?.is_company_account) {
//       if (profile.company_id) {
//         queryBuilder = queryBuilder.eq("company_id", profile.company_id);
//       } else {
//         setUsers([]);
//         return;
//       }
//     } else {
//       queryBuilder = queryBuilder.eq("is_company_account", false);
//     }

//     const { data } = await queryBuilder;
//     setUsers(data || []);
//   };

//   const handleAction = async (selectedUser: any) => {
//     if (!user?.id || actionId) return;
    
//     const isFriend = existingChats.includes(selectedUser.id);
//     const request = pendingRequests.find(r => r.receiver_id === selectedUser.id);

//     if (isFriend) {
//       // Open Chat
//       try {
//         setActionId(selectedUser.id);
//         const chatId = await createOrGetChat(user.id, selectedUser.id);
//         if (chatId) {
//           router.push({
//             pathname: "/chat/[id]",
//             params: { id: chatId, name: selectedUser.full_name || selectedUser.username || "User" },
//           });
//         }
//       } finally {
//         setActionId(null);
//       }
//     } else if (request && request.status === "pending") {
//       Alert.alert("Request Pending", "You have already sent a request to this user.");
//     } else {
//       // Send Request (New or Re-send if rejected)
//       const actionTitle = request?.status === "rejected" ? "Re-send Request" : "Send Request";
//       const actionMsg = request?.status === "rejected" 
//         ? `This user previously rejected your request. Do you want to try sending it again?`
//         : `Do you want to send a chat request to ${selectedUser.full_name}?`;

//       Alert.alert(
//         actionTitle,
//         actionMsg,
//         [
//           { text: "Cancel", style: "cancel" },
//           { 
//             text: "Send", 
//             onPress: async () => {
//               setActionId(selectedUser.id);
//               const { error } = await sendFriendRequest(user.id, selectedUser.id);
//               if (error) {
//                 Alert.alert("Error", error);
//               } else {
//                 Alert.alert("Success", "Request sent!");
//                 loadData();
//               }
//               setActionId(null);
//             }
//           }
//         ]
//       );
//     }
//   };

//   const renderUser = ({ item }: any) => {
//     const name = item.full_name || item.username || "User";
//     const avatarColor = getAvatarColor(name);
//     const isLoading = actionId === item.id;
    
//     const isFriend = existingChats.includes(item.id);
//     const request = pendingRequests.find(r => r.receiver_id === item.id);

//     let statusText = "Send Request";
//     let statusColor = "#2563EB";
//     if (isFriend) { statusText = "Chat"; statusColor = "#10B981"; }
//     else if (request?.status === "pending") { statusText = "Pending"; statusColor = "#F59E0B"; }
//     else if (request?.status === "rejected") { statusText = "Rejected"; statusColor = "#EF4444"; }

//     return (
//       <TouchableOpacity
//         style={styles.userCard}
//         onPress={() => handleAction(item)}
//         activeOpacity={0.7}
//         disabled={!!actionId}
//       >
//         <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
//           <Text style={styles.avatarText}>{getInitials(name)}</Text>
//           {item.is_online && <View style={styles.onlineDot} />}
//         </View>

//         <View style={styles.userInfo}>
//           <Text style={styles.name}>{name}</Text>
//           <Text style={styles.username}>@{item.username}</Text>
//           <Text style={styles.status} numberOfLines={1}>
//             {item.status || "Hey there! I am using BlinkChat"}
//           </Text>
//         </View>

//         <View style={styles.right}>
//           <View style={[styles.statusBadge, { backgroundColor: statusColor + "15" }]}>
//             <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusText}</Text>
//           </View>
//           {isLoading && <ActivityIndicator size="small" color="#2563EB" style={{ marginTop: 4 }} />}
//         </View>
//       </TouchableOpacity>
//     );
//   };


//   return (
//     <View style={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
//           <Text style={styles.backText}>←</Text>
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>New Chat</Text>
//       </View>

//       {/* Search */}
//       <View style={styles.searchContainer}>
//         <Text style={styles.searchIcon}>🔍</Text>
//         <TextInput
//           ref={searchRef}
//           style={styles.searchInput}
//           placeholder="Search by name, username or phone..."
//           placeholderTextColor="#9CA3AF"
//           value={search}
//           onChangeText={searchUsers}
//           autoCapitalize="none"
//           returnKeyType="search"
//         />
//         {search.length > 0 && (
//           <TouchableOpacity onPress={() => { setSearch(""); loadUsers(); }}>
//             <Text style={styles.clearBtn}>✕</Text>
//           </TouchableOpacity>
//         )}
//       </View>

//       {loading ? (
//         <View style={styles.center}>
//           <ActivityIndicator size="large" color="#2563EB" />
//         </View>
//       ) : users.length === 0 ? (
//         <View style={styles.center}>
//           <Text style={styles.emptyEmoji}>🔍</Text>
//           <Text style={styles.emptyText}>
//             {search ? `No users found for "${search}"` : "No other users yet"}
//           </Text>
//         </View>
//       ) : (
//         <>
//           <Text style={styles.sectionLabel}>
//             {search ? `${users.length} result${users.length !== 1 ? "s" : ""}` : `All Users (${users.length})`}
//           </Text>
//           <FlatList
//             data={users}
//             keyExtractor={(item) => item.id}
//             renderItem={renderUser}
//             contentContainerStyle={{ paddingBottom: 20 }}
//             showsVerticalScrollIndicator={false}
//           />
//         </>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#F8FAFC" },

//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingTop: 52,
//     paddingBottom: 14,
//     paddingHorizontal: 16,
//     backgroundColor: "#FFFFFF",
//     borderBottomWidth: 0.5,
//     borderBottomColor: "#E5E7EB",
//     gap: 10,
//   },

//   backBtn: { padding: 4 },
//   backText: { fontSize: 22, color: "#2563EB", fontWeight: "700" },

//   headerTitle: {
//     fontSize: 20,
//     fontWeight: "700",
//     color: "#111827",
//   },

//   searchContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#FFFFFF",
//     margin: 16,
//     borderRadius: 14,
//     paddingHorizontal: 14,
//     paddingVertical: 11,
//     borderWidth: 0.5,
//     borderColor: "#E5E7EB",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.04,
//     shadowRadius: 4,
//     elevation: 1,
//   },

//   searchIcon: { fontSize: 16, marginRight: 8 },

//   searchInput: {
//     flex: 1,
//     fontSize: 15,
//     color: "#111827",
//   },

//   clearBtn: { color: "#9CA3AF", fontSize: 16, paddingLeft: 8 },

//   sectionLabel: {
//     paddingHorizontal: 20,
//     paddingBottom: 8,
//     fontSize: 13,
//     color: "#9CA3AF",
//     fontWeight: "600",
//     textTransform: "uppercase",
//     letterSpacing: 0.5,
//   },

//   userCard: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#FFFFFF",
//     marginHorizontal: 16,
//     marginBottom: 8,
//     padding: 14,
//     borderRadius: 16,
//     borderWidth: 0.5,
//     borderColor: "#F3F4F6",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.04,
//     shadowRadius: 4,
//     elevation: 1,
//   },

//   avatar: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     justifyContent: "center",
//     alignItems: "center",
//     marginRight: 14,
//     position: "relative",
//   },

//   avatarText: { color: "#FFF", fontSize: 17, fontWeight: "700" },

//   onlineDot: {
//     position: "absolute",
//     bottom: 1,
//     right: 1,
//     width: 12,
//     height: 12,
//     borderRadius: 6,
//     backgroundColor: "#22C55E",
//     borderWidth: 2,
//     borderColor: "#FFF",
//   },

//   userInfo: { flex: 1 },

//   name: { fontSize: 16, fontWeight: "600", color: "#111827" },

//   username: { fontSize: 13, color: "#6B7280", marginTop: 2 },

//   status: { fontSize: 12, color: "#9CA3AF", marginTop: 3 },

//   right: { alignItems: "center", gap: 4, minWidth: 80 },

//   statusBadge: {
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },

//   statusBadgeText: {
//     fontSize: 12,
//     fontWeight: "700",
//   },

//   onlineBadge: {
//     backgroundColor: "#DCFCE7",
//     borderRadius: 8,
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//   },

//   onlineBadgeText: { fontSize: 11, color: "#16A34A", fontWeight: "600" },

//   chevron: { fontSize: 22, color: "#D1D5DB", marginTop: 2 },

//   center: { flex: 1, alignItems: "center", justifyContent: "center" },

//   emptyEmoji: { fontSize: 48, marginBottom: 12 },

//   emptyText: { fontSize: 16, color: "#6B7280", textAlign: "center" },
// });



/**
 * users/search.tsx
 * Swipe-card discovery screen — meet new people & make a friend
 * Right swipe / heart button -> send friend request
 * Left swipe / X button -> skip (no action)
 */

import { supabase } from "@/lib/supabase";
import { sendFriendRequest } from "@/services/friendService";
import { router } from "expo-router";
import { ArrowLeft, Heart, Search, Star, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../hooks/useAuth";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = CARD_WIDTH * 1.3;

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
  const { user, profile } = useAuth();

  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [stack, setStack] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actioning, setActioning] = useState(false);

  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Existing chat partners (already friends) — exclude from discovery
      const { data: members } = await supabase
        .from("chat_members")
        .select("chat_id")
        .eq("user_id", user.id);

      let existingFriendIds: string[] = [];
      if (members && members.length > 0) {
        const chatIds = members.map((m) => m.chat_id);
        const { data: others } = await supabase
          .from("chat_members")
          .select("user_id")
          .in("chat_id", chatIds)
          .neq("user_id", user.id);
        existingFriendIds = others?.map((o) => o.user_id) || [];
      }

      // Pending sent requests
      const { data: requests } = await supabase
        .from("friend_requests")
        .select("receiver_id, status, rejection_count")
        .eq("sender_id", user.id);

      const pending = (requests || [])
        .filter((r) => r.status === "pending")
        .map((r) => r.receiver_id);
      const hardRejected = (requests || [])
        .filter((r) => (r.rejection_count || 0) >= 3)
        .map((r) => r.receiver_id);

      // Blocked
      const { data: blocked } = await supabase
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", user.id);
      const blockedIds = blocked?.map((b) => b.blocked_id) || [];

      const hideIds = [
        ...existingFriendIds,
        ...pending,
        ...hardRejected,
        ...blockedIds,
        user.id,
        "00000000-0000-0000-0000-000000000000",
      ];

      let q = supabase
        .from("profiles")
        .select("*")
        .not("id", "in", `(${hideIds.join(",")})`);

      if (profile?.is_company_account) {
        if (profile.company_id) {
          q = q.eq("company_id", profile.company_id);
        } else {
          setAllProfiles([]);
          setStack([]);
          setLoading(false);
          return;
        }
      } else {
        q = q.eq("is_company_account", false);
      }

      const { data, error } = await q.order("full_name", { ascending: true });
      if (error) {
        console.log(error);
        return;
      }
      setAllProfiles(data || []);
      setStack(data || []);
      setCurrentIndex(0);
      position.setValue({ x: 0, y: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (!text.trim()) {
      setStack(allProfiles);
      setCurrentIndex(0);
      position.setValue({ x: 0, y: 0 });
      return;
    }
    const lower = text.toLowerCase();
    const filtered = allProfiles.filter(
      (p) =>
        (p.full_name || "").toLowerCase().includes(lower) ||
        (p.username || "").toLowerCase().includes(lower)
    );
    setStack(filtered);
    setCurrentIndex(0);
    position.setValue({ x: 0, y: 0 });
  };

  const sendRequestTo = async (target: any) => {
    if (!user?.id || actioning) return;
    setActioning(true);
    try {
      await sendFriendRequest(user.id, target.id);
    } catch (e) {
      console.log("sendRequestTo error:", e);
    } finally {
      setActioning(false);
    }
  };

  const forceSwipe = (direction: "left" | "right") => {
    const x = direction === "right" ? SCREEN_WIDTH * 1.4 : -SCREEN_WIDTH * 1.4;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 220,
      useNativeDriver: true,
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = (direction: "left" | "right") => {
    const item = stack[currentIndex];
    if (direction === "right" && item) {
      sendRequestTo(item);
    }
    position.setValue({ x: 0, y: 0 });
    setCurrentIndex((i) => i + 1);
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipe("right");
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe("left");
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["-10deg", "0deg", "10deg"],
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const visibleCards = stack.slice(currentIndex, currentIndex + 2);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Discover</Text>
        <View style={{ width: 32 }} />
      </View>

      <Text style={styles.tagline}>Meet new people & make a friend</Text>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or username..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={handleSearchChange}
          autoCapitalize="none"
        />
      </View>

      {/* Card Stack */}
      <View style={styles.stackArea}>
        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 60 }} />
        ) : visibleCards.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyTitle}>You're all caught up!</Text>
            <Text style={styles.emptySub}>
              No new people to discover right now. Check back later.
            </Text>
          </View>
        ) : (
          visibleCards
            .map((item, i) => {
              const isTop = i === 0;
              const name = item.full_name || item.username || "User";
              const avatarColor = getAvatarColor(name);

              if (isTop) {
                return (
                  <Animated.View
                    key={item.id}
                    {...panResponder.panHandlers}
                    style={[
                      styles.card,
                      {
                        zIndex: 10,
                        transform: [
                          { translateX: position.x },
                          { translateY: position.y },
                          { rotate },
                        ],
                      },
                    ]}
                  >
                    <CardContent item={item} name={name} avatarColor={avatarColor} />
                    <Animated.View style={[styles.badge, styles.likeBadge, { opacity: likeOpacity }]}>
                      <Text style={styles.badgeText}>REQUEST</Text>
                    </Animated.View>
                    <Animated.View style={[styles.badge, styles.nopeBadge, { opacity: nopeOpacity }]}>
                      <Text style={styles.badgeText}>SKIP</Text>
                    </Animated.View>
                  </Animated.View>
                );
              }

              return (
                <View
                  key={item.id}
                  style={[styles.card, { zIndex: 5, top: 10, transform: [{ scale: 0.96 }] }]}
                >
                  <CardContent item={item} name={name} avatarColor={avatarColor} />
                </View>
              );
            })
            .reverse()
        )}
      </View>

      {/* Action buttons */}
      {visibleCards.length > 0 && !loading && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.skipBtn]}
            onPress={() => forceSwipe("left")}
          >
            <X size={26} color="#EF4444" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.starBtn]}
            onPress={() => forceSwipe("right")}
          >
            <Star size={22} color="#F59E0B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.likeBtn]}
            onPress={() => forceSwipe("right")}
          >
            <Heart size={26} color="#FFFFFF" fill="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function CardContent({ item, name, avatarColor }: { item: any; name: string; avatarColor: string }) {
  return (
    <>
      <View style={[styles.photoArea, { backgroundColor: avatarColor }]}>
        <Text style={styles.photoInitials}>{getInitials(name)}</Text>
        {item.is_online && (
          <View style={styles.onlinePill}>
            <View style={styles.onlineDotSmall} />
            <Text style={styles.onlinePillText}>Online</Text>
          </View>
        )}
      </View>

      <View style={styles.tagChipRow}>
        <View style={styles.tagChip}>
          <Text style={styles.tagChipText}>
            {item.is_company_account ? `🏢 ${item.company_name || "Business"}` : "👤 Individual"}
          </Text>
        </View>
      </View>

      <View style={styles.cardOverlay}>
        <Text style={styles.cardName}>{name}</Text>
        <Text style={styles.cardTagline} numberOfLines={2}>
          {item.status || "Hey there! I am using BlinkChat"}
        </Text>
        <Text style={styles.cardUsername}>@{item.username}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 52,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },

  tagline: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
    marginBottom: 10,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },

  stackArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },

  card: {
    position: "absolute",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },

  photoArea: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  photoInitials: {
    fontSize: 96,
    fontWeight: "800",
    color: "rgba(255,255,255,0.85)",
  },

  onlinePill: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
  },
  onlineDotSmall: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#22C55E" },
  onlinePillText: { color: "#FFF", fontSize: 11, fontWeight: "600" },

  tagChipRow: {
    position: "absolute",
    top: 16,
    left: 16,
  },
  tagChip: {
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagChipText: { color: "#FFF", fontSize: 12, fontWeight: "600" },

  cardOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  cardName: { color: "#FFF", fontSize: 24, fontWeight: "800" },
  cardTagline: { color: "#F3F4F6", fontSize: 15, fontWeight: "600", marginTop: 4 },
  cardUsername: { color: "#D1D5DB", fontSize: 13, marginTop: 4 },

  badge: {
    position: "absolute",
    top: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 3,
    borderRadius: 10,
  },
  likeBadge: { left: 24, borderColor: "#22C55E", transform: [{ rotate: "-15deg" }] },
  nopeBadge: { right: 24, borderColor: "#EF4444", transform: [{ rotate: "15deg" }] },
  badgeText: { fontSize: 20, fontWeight: "800", color: "#FFF" },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 22,
    paddingVertical: 22,
  },
  actionBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  skipBtn: {},
  starBtn: { width: 48, height: 48, borderRadius: 24 },
  likeBtn: { backgroundColor: "#22C55E" },

  emptyState: { alignItems: "center", paddingHorizontal: 40, marginTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 6 },
  emptySub: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20 },
});