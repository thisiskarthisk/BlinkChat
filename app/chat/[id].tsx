// // // // import AppHeader from "@/components/AppHeader";
// // // // import { useAuth } from "@/hooks/useAuth";
// // // // import {
// // // //   getMessages,
// // // //   sendMessage,
// // // // } from "@/services/chatService";

// // // // import { useLocalSearchParams } from "expo-router";

// // // // import { useEffect, useState } from "react";

// // // // import {
// // // //   FlatList,
// // // //   SafeAreaView,
// // // //   StyleSheet,
// // // //   Text,
// // // //   TextInput,
// // // //   TouchableOpacity,
// // // //   View,
// // // // } from "react-native";

// // // // export default function ChatScreen() {
// // // //   const { id, name } =
// // // //     useLocalSearchParams();

// // // //   const { user } = useAuth();

// // // //   const [message, setMessage] =
// // // //     useState("");

// // // //   const [messages, setMessages] =
// // // //     useState<any[]>([]);

// // // //   useEffect(() => {
// // // //     loadMessages();
// // // //   }, []);

// // // //   const loadMessages = async () => {
// // // //     const data =
// // // //       await getMessages(
// // // //         String(id)
// // // //       );

// // // //     setMessages(data);
// // // //   };

// // // //   const handleSend =
// // // //     async () => {
// // // //       if (!message.trim())
// // // //         return;

// // // //       await sendMessage(
// // // //         String(id),
// // // //         user?.id || "",
// // // //         message
// // // //       );

// // // //       setMessage("");

// // // //       loadMessages();
// // // //     };

// // // //   const renderItem = ({
// // // //     item,
// // // //   }: any) => {
// // // //     const mine =
// // // //       item.sender_id ===
// // // //       user?.id;

// // // //     return (
// // // //       <View
// // // //         style={[
// // // //           styles.message,
// // // //           mine
// // // //             ? styles.myMessage
// // // //             : styles.otherMessage,
// // // //         ]}
// // // //       >
// // // //         <Text>
// // // //           {item.message}
// // // //         </Text>
// // // //       </View>
// // // //     );
// // // //   };

// // // //   return (
// // // //     <SafeAreaView
// // // //       style={styles.container}
// // // //     >
// // // //       <AppHeader
// // // //         title={String(name)}
// // // //       />

// // // //       <FlatList
// // // //         data={messages}
// // // //         keyExtractor={(item) =>
// // // //           item.id
// // // //         }
// // // //         renderItem={renderItem}
// // // //         contentContainerStyle={{
// // // //           padding: 10,
// // // //         }}
// // // //       />

// // // //       <View
// // // //         style={styles.inputRow}
// // // //       >
// // // //         <TextInput
// // // //           style={styles.input}
// // // //           value={message}
// // // //           onChangeText={
// // // //             setMessage
// // // //           }
// // // //           placeholder="Type message..."
// // // //         />

// // // //         <TouchableOpacity
// // // //           style={styles.sendBtn}
// // // //           onPress={
// // // //             handleSend
// // // //           }
// // // //         >
// // // //           <Text
// // // //             style={{
// // // //               color: "#fff",
// // // //             }}
// // // //           >
// // // //             Send
// // // //           </Text>
// // // //         </TouchableOpacity>
// // // //       </View>
// // // //     </SafeAreaView>
// // // //   );
// // // // }

// // // // const styles =
// // // //   StyleSheet.create({
// // // //     container: {
// // // //       flex: 1,
// // // //       backgroundColor:
// // // //         "#F8FAFC",
// // // //     },

// // // //     message: {
// // // //       maxWidth: "80%",
// // // //       padding: 10,
// // // //       marginVertical: 5,
// // // //       borderRadius: 10,
// // // //     },

// // // //     myMessage: {
// // // //       backgroundColor:
// // // //         "#DBEAFE",
// // // //       alignSelf: "flex-end",
// // // //     },

// // // //     otherMessage: {
// // // //       backgroundColor:
// // // //         "#FFFFFF",
// // // //       alignSelf: "flex-start",
// // // //     },

// // // //     inputRow: {
// // // //       flexDirection: "row",
// // // //       padding: 10,
// // // //       borderTopWidth: 1,
// // // //       borderColor: "#ddd",
// // // //       backgroundColor:
// // // //         "#fff",
// // // //     },

// // // //     input: {
// // // //       flex: 1,
// // // //       borderWidth: 1,
// // // //       borderColor: "#ddd",
// // // //       borderRadius: 20,
// // // //       paddingHorizontal: 15,
// // // //     },

// // // //     sendBtn: {
// // // //       marginLeft: 10,
// // // //       backgroundColor:
// // // //         "#2563EB",
// // // //       justifyContent:
// // // //         "center",
// // // //       paddingHorizontal: 20,
// // // //       borderRadius: 20,
// // // //     },
// // // //   });


// // // import AppHeader from "@/components/AppHeader";
// // // import { useAuth } from "@/hooks/useAuth";
// // // import { supabase } from "@/lib/supabase";
// // // import {
// // //   getMessages,
// // //   sendMessage,
// // //   subscribeToMessages,
// // //   unsubscribeMessages,
// // // } from "@/services/chatService";

// // // import { useLocalSearchParams } from "expo-router";

// // // import { useEffect, useState } from "react";

// // // import {
// // //   FlatList,
// // //   KeyboardAvoidingView,
// // //   Platform,
// // //   SafeAreaView,
// // //   StyleSheet,
// // //   Text,
// // //   TextInput,
// // //   TouchableOpacity,
// // //   View,
// // // } from "react-native";

// // // export default function ChatScreen() {
// // //   const { id, name } =
// // //     useLocalSearchParams();

// // //   const { user } = useAuth();

// // //   const [message, setMessage] =
// // //     useState("");

// // //   const [messages, setMessages] =
// // //     useState<any[]>([]);

// // //   const markMessagesSeen =
// // //     async () => {

// // //     await supabase
// // //     .from("messages")
// // //     .update({
// // //       is_seen:true
// // //     })
// // //     .eq("chat_id", id)
// // //     .neq("sender_id", user?.id);

// // //   };

// // //   useEffect(() => {
// // //     loadMessages();
// // //     markMessagesSeen();


// // //     const channel =
// // //       subscribeToMessages(() => {
// // //         loadMessages();
// // //       });

// // //     return () => {
// // //       unsubscribeMessages(channel);
// // //     };
// // //   }, []);

// // //   const loadMessages =
// // //     async () => {
// // //       const data =
// // //         await getMessages(
// // //           String(id)
// // //         );

// // //       setMessages(data);
// // //     };

// // //   const handleSend =
// // //     async () => {
// // //       if (!message.trim())
// // //         return;

// // //       await sendMessage(
// // //         String(id),
// // //         user?.id || "",
// // //         message
// // //       );

// // //       setMessage("");
// // //     };

// // //   const renderMessage = ({
// // //     item,
// // //   }: any) => {
// // //     const isMine =
// // //       item.sender_id ===
// // //       user?.id;

// // //     return (
// // //       <View
// // //         style={[
// // //           styles.messageContainer,
// // //           isMine
// // //             ? styles.myContainer
// // //             : styles.otherContainer,
// // //         ]}
// // //       >
// // //         <View
// // //           style={[
// // //             styles.bubble,
// // //             isMine
// // //               ? styles.myBubble
// // //               : styles.otherBubble,
// // //           ]}
// // //         >
// // //           <Text
// // //             style={
// // //               styles.messageText
// // //             }
// // //           >
// // //             {item.message}
// // //           </Text>
// // //         </View>
// // //       </View>
// // //     );
// // //   };

// // //   return (
// // //     <SafeAreaView
// // //       style={styles.container}
// // //     >
// // //       <AppHeader
// // //         title={
// // //           String(name) ||
// // //           "Chat"
// // //         }
// // //       />

// // //       <KeyboardAvoidingView
// // //         style={{
// // //           flex: 1,
// // //         }}
// // //         behavior={
// // //           Platform.OS ===
// // //           "ios"
// // //             ? "padding"
// // //             : undefined
// // //         }
// // //       >
// // //         <FlatList
// // //           data={messages}
// // //           keyExtractor={(item) =>
// // //             item.id
// // //           }
// // //           renderItem={
// // //             renderMessage
// // //           }
// // //           contentContainerStyle={{
// // //             padding: 10,
// // //           }}
// // //         />

// // //         <View
// // //           style={
// // //             styles.inputContainer
// // //           }
// // //         >
// // //           <TextInput
// // //             value={message}
// // //             onChangeText={
// // //               setMessage
// // //             }
// // //             placeholder="Type a message..."
// // //             style={styles.input}
// // //           />

// // //           <TouchableOpacity
// // //             style={
// // //               styles.sendButton
// // //             }
// // //             onPress={
// // //               handleSend
// // //             }
// // //           >
// // //             <Text
// // //               style={
// // //                 styles.sendText
// // //               }
// // //             >
// // //               Send
// // //             </Text>
// // //           </TouchableOpacity>
// // //         </View>
// // //       </KeyboardAvoidingView>
// // //     </SafeAreaView>
// // //   );
// // // }

// // // const styles =
// // //   StyleSheet.create({
// // //     container: {
// // //       flex: 1,
// // //       backgroundColor:
// // //         "#F8FAFC",
// // //     },

// // //     messageContainer: {
// // //       marginVertical: 4,
// // //     },

// // //     myContainer: {
// // //       alignItems: "flex-end",
// // //     },

// // //     otherContainer: {
// // //       alignItems: "flex-start",
// // //     },

// // //     bubble: {
// // //       maxWidth: "80%",
// // //       padding: 12,
// // //       borderRadius: 15,
// // //     },

// // //     myBubble: {
// // //       backgroundColor:
// // //         "#2563EB",
// // //     },

// // //     otherBubble: {
// // //       backgroundColor:
// // //         "#FFFFFF",
// // //       borderWidth: 1,
// // //       borderColor:
// // //         "#E5E7EB",
// // //     },

// // //     messageText: {
// // //       color: "#111827",
// // //     },

// // //     inputContainer: {
// // //       flexDirection: "row",
// // //       padding: 10,
// // //       backgroundColor:
// // //         "#FFFFFF",
// // //       borderTopWidth: 1,
// // //       borderColor:
// // //         "#E5E7EB",
// // //     },

// // //     input: {
// // //       flex: 1,
// // //       backgroundColor:
// // //         "#F3F4F6",
// // //       borderRadius: 25,
// // //       paddingHorizontal: 15,
// // //       paddingVertical: 12,
// // //     },

// // //     sendButton: {
// // //       backgroundColor:
// // //         "#2563EB",

// // //       marginLeft: 10,

// // //       borderRadius: 25,

// // //       paddingHorizontal: 20,

// // //       justifyContent:
// // //         "center",
// // //     },

// // //     sendText: {
// // //       color: "#FFFFFF",
// // //       fontWeight: "bold",
// // //     },
// // //   });


// // import AppHeader from "@/components/AppHeader";
// // import { useAuth } from "@/hooks/useAuth";
// // import { supabase } from "@/lib/supabase";
// // import { useLocalSearchParams } from "expo-router";
// // import { useEffect, useState } from "react";

// // import {
// //   FlatList,
// //   KeyboardAvoidingView,
// //   Platform,
// //   StyleSheet,
// //   Text,
// //   TextInput,
// //   TouchableOpacity,
// //   View,
// // } from "react-native";

// // export default function ChatScreen() {
// //   const { id, name } = useLocalSearchParams();

// //   const { user } = useAuth();

// //   const [message, setMessage] = useState("");
// //   const [messages, setMessages] = useState<any[]>([]);

// //   useEffect(() => {
// //     loadMessages();
// //     markMessagesSeen();

// //     const channel = supabase
// //       .channel(`chat-${id}`)
// //       .on(
// //         "postgres_changes",
// //         {
// //           event: "*",
// //           schema: "public",
// //           table: "messages",
// //         },
// //         () => {
// //           loadMessages();
// //           markMessagesSeen();
// //         }
// //       )
// //       .subscribe();

// //     return () => {
// //       supabase.removeChannel(channel);
// //     };
// //   }, []);

// //   const markMessagesSeen = async () => {
// //     if (!user?.id) return;

// //     await supabase
// //       .from("messages")
// //       .update({
// //         is_seen: true,
// //       })
// //       .eq("chat_id", id)
// //       .neq("sender_id", user.id);
// //   };

// //   const loadMessages = async () => {
// //     const { data, error } = await supabase
// //       .from("messages")
// //       .select("*")
// //       .eq("chat_id", id)
// //       .order("created_at", {
// //         ascending: true,
// //       });

// //     if (error) {
// //       console.log(error);
// //       return;
// //     }

// //     setMessages(data || []);
// //   };

// //   const sendMessage = async () => {
// //     if (!message.trim()) return;

// //     const { error } = await supabase
// //       .from("messages")
// //       .insert({
// //         chat_id: id,
// //         sender_id: user?.id,
// //         message: message.trim(),
// //         is_seen: false,
// //       });

// //     if (error) {
// //       console.log(error);
// //       return;
// //     }

// //     setMessage("");
// //   };

// //   const renderMessage = ({ item }: any) => {
// //     const isMine =
// //       item.sender_id === user?.id;

// //     return (
// //       <View
// //         style={[
// //           styles.messageContainer,
// //           isMine
// //             ? styles.myContainer
// //             : styles.otherContainer,
// //         ]}
// //       >
// //         <View
// //           style={[
// //             styles.bubble,
// //             isMine
// //               ? styles.myBubble
// //               : styles.otherBubble,
// //           ]}
// //         >
// //           <Text
// //             style={[
// //               styles.messageText,
// //               {
// //                 color: isMine
// //                   ? "#FFFFFF"
// //                   : "#111827",
// //               },
// //             ]}
// //           >
// //             {item.message}
// //           </Text>

// //           <Text
// //             style={[
// //               styles.messageTime,
// //               {
// //                 color: isMine
// //                   ? "#E5E7EB"
// //                   : "#6B7280",
// //               },
// //             ]}
// //           >
// //             {new Date(
// //               item.created_at
// //             ).toLocaleTimeString(
// //               "en-IN",
// //               {
// //                 hour: "2-digit",
// //                 minute: "2-digit",
// //                 hour12: true,
// //               }
// //             )}
// //           </Text>
// //         </View>
// //       </View>
// //     );
// //   };

// //   return (
// //     <View style={styles.container}>
// //       <AppHeader
// //         title={String(name || "Chat")}
// //       />

// //       <KeyboardAvoidingView
// //         style={{ flex: 1 }}
// //         behavior={
// //           Platform.OS === "ios"
// //             ? "padding"
// //             : undefined
// //         }
// //       >
// //         <FlatList
// //           data={messages}
// //           keyExtractor={(item) =>
// //             item.id
// //           }
// //           renderItem={renderMessage}
// //           contentContainerStyle={{
// //             padding: 10,
// //           }}
// //         />

// //         <View style={styles.inputArea}>
// //           <TextInput
// //             placeholder="Type a message..."
// //             value={message}
// //             onChangeText={setMessage}
// //             style={styles.input}
// //           />

// //           <TouchableOpacity
// //             style={styles.sendBtn}
// //             onPress={sendMessage}
// //           >
// //             <Text
// //               style={styles.sendText}
// //             >
// //               Send
// //             </Text>
// //           </TouchableOpacity>
// //         </View>
// //       </KeyboardAvoidingView>
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //     backgroundColor: "#F8FAFC",
// //   },

// //   messageContainer: {
// //     marginVertical: 4,
// //   },

// //   myContainer: {
// //     alignItems: "flex-end",
// //   },

// //   otherContainer: {
// //     alignItems: "flex-start",
// //   },

// //   bubble: {
// //     maxWidth: "80%",
// //     padding: 12,
// //     borderRadius: 14,
// //   },

// //   myBubble: {
// //     backgroundColor: "#2563EB",
// //   },

// //   otherBubble: {
// //     backgroundColor: "#FFFFFF",
// //     borderWidth: 1,
// //     borderColor: "#E5E7EB",
// //   },

// //   messageText: {
// //     fontSize: 15,
// //   },

// //   messageTime: {
// //     fontSize: 11,
// //     marginTop: 5,
// //     textAlign: "right",
// //   },

// //   inputArea: {
// //     flexDirection: "row",
// //     padding: 10,
// //     backgroundColor: "#FFFFFF",
// //     borderTopWidth: 1,
// //     borderColor: "#E5E7EB",
// //   },

// //   input: {
// //     flex: 1,
// //     backgroundColor: "#F3F4F6",
// //     borderRadius: 25,
// //     paddingHorizontal: 15,
// //     paddingVertical: 12,
// //   },

// //   sendBtn: {
// //     backgroundColor: "#2563EB",
// //     marginLeft: 10,
// //     borderRadius: 25,
// //     justifyContent: "center",
// //     paddingHorizontal: 20,
// //   },

// //   sendText: {
// //     color: "#FFFFFF",
// //     fontWeight: "bold",
// //   },
// // });


// import AppHeader from "@/components/AppHeader";
// import { useAuth } from "@/hooks/useAuth";
// import { supabase } from "@/lib/supabase";
// import { useLocalSearchParams } from "expo-router";
// import React, { useEffect, useRef, useState } from "react";

// import {
//   FlatList,
//   KeyboardAvoidingView,
//   Platform,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";

// export default function ChatScreen() {
//   const { id, name } = useLocalSearchParams();
//   const { user } = useAuth();

//   const [message, setMessage] = useState("");
//   const [messages, setMessages] = useState<any[]>([]);
//   const [otherUser, setOtherUser] = useState<any>(null);

//   const flatListRef = useRef<FlatList>(null);

//   useEffect(() => {
//     loadMessages();
//     markMessagesSeen();
//     getOtherUser();

//     // Message subscription
//     const msgChannel = supabase
//       .channel(`chat-messages-${id}`)
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "messages",
//           filter: `chat_id=eq.${id}`,
//         },
//         (payload) => {
//           if (payload.eventType === "INSERT") {
//             setMessages((prev) => {
//               const exists = prev.find((m) => m.id === payload.new.id);
//               if (exists) return prev;
              
//               if (payload.new.sender_id !== user?.id) {
//                 markMessagesSeen();
//               }
              
//               return [...prev, payload.new];
//             });
//             scrollBottom();
//           } else if (payload.eventType === "UPDATE") {
//             setMessages((prev) =>
//               prev.map((m) =>
//                 m.id === payload.new.id ? payload.new : m
//               )
//             );
//           }
//         }
//       )
//       .subscribe();

//     // Profile subscription for online status
//     const profileChannel = supabase
//       .channel(`chat-profile-${id}`)
//       .on(
//         "postgres_changes",
//         {
//           event: "UPDATE",
//           schema: "public",
//           table: "profiles",
//         },
//         (payload) => {
//           setOtherUser((current: any) => {
//             if (current && payload.new.id === current.id) {
//               return payload.new;
//             }
//             return current;
//           });
//         }
//       )
//       .subscribe();

//     return () => {
//       supabase.removeChannel(msgChannel);
//       supabase.removeChannel(profileChannel);
//     };
//   }, [id, user?.id]);

//   const getOtherUser = async () => {
//     const { data: member } = await supabase
//       .from("chat_members")
//       .select("user_id")
//       .eq("chat_id", id)
//       .neq("user_id", user?.id)
//       .maybeSingle();

//     if (member) {
//       const { data: profile } = await supabase
//         .from("profiles")
//         .select("*")
//         .eq("id", member.user_id)
//         .maybeSingle();
      
//       if (profile) setOtherUser(profile);
//     }
//   };

//   const scrollBottom = () => {
//     setTimeout(() => {
//       flatListRef.current?.scrollToEnd({
//         animated: true,
//       });
//     }, 100);
//   };

//   const markMessagesSeen = async () => {
//     if (!user?.id || !id) return;

//     await supabase
//       .from("messages")
//       .update({
//         is_seen: true,
//       })
//       .eq("chat_id", id)
//       .neq("sender_id", user.id)
//       .eq("is_seen", false);
//   };


//   const loadMessages = async () => {
//     const { data, error } = await supabase
//       .from("messages")
//       .select("*")
//       .eq("chat_id", id)
//       .order("created_at", {
//         ascending: true,
//       });

//     if (error) {
//       console.log(error);
//       return;
//     }

//     setMessages(data || []);
//     scrollBottom();
//   };

//   const sendMessage = async () => {
//     if (!message.trim() || !user?.id) return;

//     const text = message.trim();
//     const tempId = Date.now().toString();

//     const tempMessage = {
//       id: tempId,
//       chat_id: id,
//       sender_id: user.id,
//       message: text,
//       created_at: new Date().toISOString(),
//       is_seen: false,
//       is_delivered: true,
//     };

//     setMessages((prev) => [...prev, tempMessage]);
//     setMessage("");
//     scrollBottom();

//     const { data, error } = await supabase
//       .from("messages")
//       .insert({
//         chat_id: id,
//         sender_id: user.id,
//         message: text,
//         is_seen: false,
//         is_delivered: true,
//       })
//       .select()
//       .single();

//     if (error) {
//       console.log(error);
//       setMessages((prev) => prev.filter(m => m.id !== tempId));
//     } else if (data) {
//       setMessages((prev) => 
//         prev.map(m => m.id === tempId ? data : m)
//       );
//     }
//   };

//   const renderMessage = ({ item }: any) => {
//     const isMine =
//       item.sender_id === user?.id;

//     return (
//       <View
//         style={[
//           styles.messageContainer,
//           isMine
//             ? styles.myContainer
//             : styles.otherContainer,
//         ]}
//       >
//         <View
//           style={[
//             styles.bubble,
//             isMine
//               ? styles.myBubble
//               : styles.otherBubble,
//           ]}
//         >
//           <Text
//             style={[
//               styles.messageText,
//               {
//                 color: "#111827",
//               },
//             ]}
//           >
//             {item.message}
//           </Text>

//           <View
//             style={{
//               flexDirection: "row",
//               justifyContent: "flex-end",
//               alignItems: "center",
//               marginTop: 4,
//             }}
//           >
//             <Text
//               style={[
//                 styles.timeText,
//                 {
//                   color: "#6B7280",
//                 },
//               ]}
//             >
//               {new Date(
//                 item.created_at
//               ).toLocaleTimeString(
//                 "en-IN",
//                 {
//                   hour: "2-digit",
//                   minute: "2-digit",
//                   hour12: true,
//                 }
//               )}
//             </Text>

//             {isMine && (
//               <Text
//                 style={{
//                   marginLeft: 5,
//                   fontSize: 11,
//                   color: item.is_seen
//                     ? "#3B82F6"
//                     : "#9CA3AF",
//                 }}
//               >
//                 {item.is_seen
//                   ? "✓✓"
//                   : "✓✓"}
//               </Text>
//             )}
//           </View>
//         </View>
//       </View>
//     );
//   };

//   return (
//     <View style={styles.container}>
//       <View style={styles.customHeader}>
//         <TouchableOpacity onPress={() => router.back()}>
//           <Text style={styles.backBtn}>←</Text>
//         </TouchableOpacity>
//         <View style={styles.headerInfo}>
//           <Text style={styles.headerName}>{String(name)}</Text>
//           {otherUser?.is_online ? (
//             <Text style={styles.onlineText}>● Online</Text>
//           ) : (
//             <Text style={styles.offlineText}>
//               {otherUser?.last_seen 
//                 ? `Last seen ${new Date(otherUser.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
//                 : "Offline"}
//             </Text>
//           )}
//         </View>
//       </View>

//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={
//           Platform.OS === "ios"
//             ? "padding"
//             : undefined
//         }
//       >
//         <FlatList
//           ref={flatListRef}
//           data={messages}
//           keyExtractor={(item) =>
//             item.id.toString()
//           }
//           renderItem={renderMessage}
//           contentContainerStyle={{
//             padding: 10,
//           }}
//           onContentSizeChange={() => scrollBottom()}
//           onLayout={() => scrollBottom()}
//         />

//         <View style={styles.inputArea}>
//           <TextInput
//             style={styles.input}
//             value={message}
//             onChangeText={setMessage}
//             placeholder="Type message..."
//           />

//           <TouchableOpacity
//             style={styles.sendBtn}
//             onPress={sendMessage}
//           >
//             <Text
//               style={styles.sendText}
//             >
//               Send
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </KeyboardAvoidingView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#F8FAFC",
//   },

//   messageContainer: {
//     marginVertical: 4,
//   },

//   myContainer: {
//     alignItems: "flex-end",
//   },

//   otherContainer: {
//     alignItems: "flex-start",
//   },

//   bubble: {
//     maxWidth: "80%",
//     padding: 12,
//     borderRadius: 14,
//   },

//   myBubble: {
//     backgroundColor: "#ffffff",
//   },

//   otherBubble: {
//     backgroundColor: "#FFFFFF",
//     borderWidth: 1,
//     borderColor: "#E5E7EB",
//   },

//   messageText: {
//     fontSize: 15,
//   },

//   timeText: {
//     fontSize: 11,
//   },

//   inputArea: {
//     flexDirection: "row",
//     padding: 10,
//     backgroundColor: "#FFFFFF",
//     borderTopWidth: 1,
//     borderColor: "#E5E7EB",
//   },

//   input: {
//     flex: 1,
//     backgroundColor: "#F3F4F6",
//     borderRadius: 25,
//     paddingHorizontal: 15,
//     paddingVertical: 12,
//   },

//   sendBtn: {
//     backgroundColor: "#2563EB",
//     marginLeft: 10,
//     borderRadius: 25,
//     justifyContent: "center",
//     paddingHorizontal: 20,
//   },

//   sendText: {
//     color: "#FFFFFF",
//     fontWeight: "bold",
//   },
//   customHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     padding: 15,
//     paddingTop: 50,
//     backgroundColor: "#FFFFFF",
//     borderBottomWidth: 1,
//     borderBottomColor: "#E5E7EB",
//   },
//   backBtn: {
//     fontSize: 24,
//     color: "#2563EB",
//     marginRight: 15,
//     fontWeight: "bold",
//   },
//   headerInfo: {
//     flex: 1,
//   },
//   headerName: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "#111827",
//   },
//   onlineText: {
//     fontSize: 12,
//     color: "#22C55E",
//     marginTop: 2,
//   },
//   offlineText: {
//     fontSize: 12,
//     color: "#9CA3AF",
//     marginTop: 2,
//   },
// });




/**
 * app/chat/[id].tsx
 *
 * Works in Expo Go — no native modules.
 * - Real-time messages (Supabase Realtime)
 * - Optimistic UI (instant send)
 * - Image, video (limited to 60s via picker), file sending
 * - Double tick: grey = delivered, blue = seen
 * - Online status / last seen in header
 */

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { Mic, Pause, Phone, Play, StopCircle, Video } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ChatSettingsModal from "../../components/ChatSettingsModal";
import {
  clearChat,
  getChatDetails,
  updateChatSettings,
  updateMemberSettings
} from "../../services/chatService";
import { blockUser } from "../../services/friendService";

// ─── Local Caching ──────────────────────────────────────────

const CHAT_MEDIA_DIR = `${FileSystem.documentDirectory}chat-media/`;

async function ensureMediaDir() {
  const dirInfo = await FileSystem.getInfoAsync(CHAT_MEDIA_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CHAT_MEDIA_DIR, { intermediates: true });
  }
}

async function getLocalMediaUri(remoteUrl: string, mediaPath: string) {
  if (!mediaPath) return remoteUrl;
  await ensureMediaDir();
  const fileName = mediaPath.split("/").pop();
  const localUri = `${CHAT_MEDIA_DIR}${fileName}`;
  
  const fileInfo = await FileSystem.getInfoAsync(localUri);
  if (fileInfo.exists) return localUri;
  
  try {
    const { uri } = await FileSystem.downloadAsync(remoteUrl, localUri);
    return uri;
  } catch (e) {
    console.log("Download error:", e);
    return remoteUrl;
  }
}

async function deleteRemoteMedia(mediaPath: string) {
  try {
    const { error } = await supabase.storage.from("chat-media").remove([mediaPath]);
    if (error) throw error;
    return true;
  } catch (e) {
    console.log("Delete remote error:", e);
    return false;
  }
}

// ─── Helpers ────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatLastSeen(iso?: string) {
  if (!iso) return "Offline";
  const date = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 1) return "Last seen just now";
  if (diffMin < 60) return `Last seen ${diffMin}m ago`;
  return `Last seen at ${date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })}`;
}

function TickIcon({ isSeen, isDelivered }: { isSeen: boolean; isDelivered: boolean }) {
  const color = isSeen ? "#60A5FA" : isDelivered ? "#9CA3AF" : "#D1D5DB";
  return (
    <Text style={{ fontSize: 12, color, marginLeft: 4 }}>
      {isDelivered || isSeen ? "✓✓" : "✓"}
    </Text>
  );
}

// ─── Upload to Supabase Storage ──────────────────────────────

async function uploadToStorage(
  uri: string,
  mimeType: string,
  folder: string
): Promise<{ url: string; path: string } | null> {
  try {
    const ext = uri.split(".").pop()?.split("?")[0] || "bin";
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const { error } = await supabase.storage
      .from("chat-media")
      .upload(path, arrayBuffer, { contentType: mimeType, upsert: false });

    if (error) {
      console.log("Upload error:", error.message);
      return null;
    }

    const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
    return { url: data.publicUrl, path };
  } catch (e: any) {
    console.log("uploadToStorage:", e.message);
    return null;
  }
}

// ─── Message Bubble ──────────────────────────────────────────

// ─── Message Bubble ──────────────────────────────────────────

function VoiceMessagePlayer({ uri, isMine }: { uri: string; isMine: boolean }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const formatDur = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  async function playSound() {
    try {
      if (sound) {
        await sound.playAsync();
        setIsPlaying(true);
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (e) {
      console.log("Play sound error:", e);
    }
  }

  async function pauseSound() {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  }

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View style={styles.voicePlayer}>
      <TouchableOpacity onPress={isPlaying ? pauseSound : playSound} style={styles.playBtn}>
        {isPlaying ? <Pause size={20} color={isMine ? "#FFF" : "#2563EB"} /> : <Play size={20} color={isMine ? "#FFF" : "#2563EB"} />}
      </TouchableOpacity>
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: isMine ? "#BFDBFE" : "#2563EB" }]} />
      </View>
      <Text style={[styles.voiceTime, { color: isMine ? "#BFDBFE" : "#6B7280" }]}>
        {formatDur(Math.floor(position / 1000))}
      </Text>
    </View>
  );
}

function MessageBubble({ item, isMine }: { item: any; isMine: boolean }) {
  const type: string = item.message_type || "text";
  const [localUri, setLocalUri] = useState<string | null>(null);

  useEffect(() => {
    if (type !== "text") {
      loadLocal();
    }
  }, [item.message, item.media_path]);

  const loadLocal = async () => {
    try {
      const uri = await getLocalMediaUri(item.message, item.media_path);
      if (uri) {
        setLocalUri(uri);
        // ONLY cleanup IF the local download was successful
        if (!isMine && !item.is_seen && item.media_path && uri.startsWith("file://")) {
           await deleteRemoteMedia(item.media_path);
        }
      }
    } catch (e) {
      console.log("loadLocal error:", e);
    }
  };

  // ─── Important: Don't render player until localUri is ready to avoid AVPlayer -1008 error ───
  if (type !== "text" && !localUri) {
    return (
      <View style={[styles.msgContainer, isMine ? styles.myContainer : styles.otherContainer]}>
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.otherBubble, { opacity: 0.6 }]}>
           <ActivityIndicator size="small" color={isMine ? "#FFF" : "#2563EB"} />
        </View>
      </View>
    );
  }

  const displayUri = localUri || item.message;

  return (
    <View style={[styles.msgContainer, isMine ? styles.myContainer : styles.otherContainer]}>
      <View style={[styles.bubble, isMine ? styles.myBubble : styles.otherBubble]}>

        {type === "image" && (
          <Image
            source={{ uri: displayUri }}
            style={styles.msgImage}
            resizeMode="cover"
          />
        )}

        {type === "audio" && (
          <VoiceMessagePlayer uri={displayUri} isMine={isMine} />
        )}

        {type === "video" && (
          <View style={styles.videoBox}>
            <Text style={styles.videoIcon}>🎥</Text>
            <Text style={styles.videoLabel}>Video</Text>
          </View>
        )}

        {type === "file" && (
          <View style={styles.fileRow}>
            <Text style={styles.fileIcon}>📄</Text>
            <Text style={[styles.fileLabel, isMine ? styles.myText : styles.otherText]} numberOfLines={2}>
              {item.file_name || "File"}
            </Text>
          </View>
        )}

        {type === "text" && (
          <Text style={[styles.msgText, isMine ? styles.myText : styles.otherText]}>
            {item.message}
          </Text>
        )}

        <View style={styles.metaRow}>
          <Text style={[styles.msgTime, isMine ? styles.myTime : styles.otherTime]}>
            {formatTime(item.created_at)}
          </Text>
          {isMine && <TickIcon isSeen={item.is_seen} isDelivered={item.is_delivered} />}
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────

export default function ChatScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { user } = useAuth();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission Denied", "Microphone access is needed to record voice messages.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
      setRecordDuration(0);
      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        await sendMedia(uri, "audio/m4a", "audio");
      }
    } catch (err) {
      console.error("Failed to stop recording", err);
    }
    setRecording(null);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [chatSettings, setChatSettings] = useState<any>({
    chat_theme: "Default",
    disappearing_messages_ttl: null,
    is_locked: false,
  });
  const [backgroundConfig, setBackgroundConfig] = useState<{
    type: "color" | "image";
    value: string;
  }>({ type: "color", value: "#EEF2FF" });

  const flatListRef = useRef<FlatList>(null);

  const loadBackgroundConfig = useCallback(async () => {
    if (!otherUser?.id) return;
    try {
      const type = await AsyncStorage.getItem(`chat_bg_type_${otherUser.id}`);
      if (type === "image") {
        const uri = await AsyncStorage.getItem(`chat_image_uri_${otherUser.id}`);
        if (uri) setBackgroundConfig({ type: "image", value: uri });
      } else {
        const hex = await AsyncStorage.getItem(`chat_color_hex_${otherUser.id}`);
        setBackgroundConfig({ type: "color", value: hex || "#EEF2FF" });
      }
    } catch (e) {
      console.error("Load BG error:", e);
    }
  }, [otherUser?.id]);

  useEffect(() => {
    if (otherUser) loadBackgroundConfig();
  }, [otherUser, loadBackgroundConfig, settingsVisible]);

  const loadChatDetails = useCallback(async () => {
    if (!id || !user?.id) return;
    const details = await getChatDetails(id, user.id);
    if (details) {
      setChatSettings({
        chat_theme: details.chat_theme || "Default",
        disappearing_messages_ttl: details.disappearing_messages_ttl,
        is_locked: details.is_locked || false,
      });
    }
  }, [id, user?.id]);

  useEffect(() => {
    loadChatDetails();
  }, [loadChatDetails]);

  const handleUpdateSettings = async (settings: any) => {
    if (!id) return;
    const success = await updateChatSettings(id, settings);
    if (success) {
      setChatSettings((prev: any) => ({ ...prev, ...settings }));
    }
  };

  const handleUpdateMemberSettings = async (settings: any) => {
    if (!id || !user?.id) return;
    const success = await updateMemberSettings(id, user.id, settings);
    if (success) {
      setChatSettings((prev: any) => ({ ...prev, ...settings }));
    }
  };

  const handleClearChat = async () => {
    if (!id) return;
    const success = await clearChat(id);
    if (success) {
      setMessages([]);
      setSettingsVisible(false);
      Alert.alert("Success", "Chat cleared.");
    }
  };

  const handleBlockUser = async () => {
    if (!user?.id || !otherUser?.id) return;
    const { success, error } = await blockUser(user.id, otherUser.id);
    if (success) {
      Alert.alert("Blocked", `${otherUser.full_name} has been blocked.`);
      router.back();
    } else {
      Alert.alert("Error", error);
    }
  };

  const scrollBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);
  }, []);

  const markSeen = useCallback(async () => {
    if (!user?.id || !id) return;
    await supabase
      .from("messages")
      .update({ is_seen: true, is_delivered: true })
      .eq("chat_id", id)
      .neq("sender_id", user.id)
      .eq("is_seen", false);
  }, [id, user?.id]);

  const markDelivered = useCallback(async (messageId: string) => {
    if (!user?.id) return;
    await supabase
      .from("messages")
      .update({ is_delivered: true })
      .eq("id", messageId)
      .neq("sender_id", user.id)
      .eq("is_delivered", false);
  }, [user?.id]);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", id)
      .order("created_at", { ascending: true });
    
    if (data) {
      setMessages(data);
      // Mark all received messages as delivered if they aren't already
      const undelivered = data.filter(m => m.sender_id !== user?.id && !m.is_delivered);
      if (undelivered.length > 0) {
        await supabase
          .from("messages")
          .update({ is_delivered: true })
          .in("id", undelivered.map(m => m.id))
          .neq("sender_id", user?.id);
      }
    }
    scrollBottom();
  }, [id, user?.id]);

  const getOtherUser = useCallback(async () => {
    const { data: member } = await supabase
      .from("chat_members")
      .select("user_id")
      .eq("chat_id", id)
      .neq("user_id", user?.id)
      .maybeSingle();

    if (member) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", member.user_id)
        .maybeSingle();
      if (profile) setOtherUser(profile);
    }
  }, [id, user?.id]);

  useEffect(() => {
    loadMessages();
    markSeen();
    getOtherUser();

    const msgCh = supabase
      .channel(`chat-msg-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `chat_id=eq.${id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMessages((prev) => {
              if (prev.find((m) => m.id === payload.new.id)) return prev;
              
              if (payload.new.sender_id !== user?.id) {
                // If we are the recipient, mark as delivered (and seen if we are in chat)
                markDelivered(payload.new.id);
                markSeen();
              }
              return [...prev, payload.new];
            });
            scrollBottom();
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? payload.new : m))
            );
          }
        }
      )
      .subscribe();

    const profileCh = supabase
      .channel(`chat-profile-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          setOtherUser((cur: any) =>
            cur && payload.new.id === cur.id ? payload.new : cur
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgCh);
      supabase.removeChannel(profileCh);
    };
  }, [id, user?.id]);

  // ── Send text ──
  const sendText = async () => {
    const text = message.trim();
    if (!text || !user?.id) return;

    const tempId = `temp_${Date.now()}`;
    const now = new Date().toISOString();
    
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        chat_id: id,
        sender_id: user.id,
        message: text,
        message_type: "text",
        created_at: now,
        is_seen: false,
        is_delivered: false,
      },
    ]);
    setMessage("");
    scrollBottom();

    const { data, error } = await supabase
      .from("messages")
      .insert({ 
        chat_id: id, 
        sender_id: user.id, 
        message: text, 
        message_type: "text", 
        is_seen: false, 
        is_delivered: false 
      })
      .select()
      .single();

    setMessages((prev) =>
      error ? prev.filter((m) => m.id !== tempId) : prev.map((m) => (m.id === tempId ? data : m))
    );
  };

  // ── Send media ──
  // ── Send media ──
  const sendMedia = async (uri: string, mimeType: string, type: "image" | "video" | "file" | "audio", fileName?: string) => {
    if (!user?.id) return;
    setUploading(true);
    try {
      const folder = type === "image" ? "images" : type === "video" ? "videos" : type === "audio" ? "audio" : "files";
      const result = await uploadToStorage(uri, mimeType, folder);
      if (!result) {
        Alert.alert("Upload failed", "Check your Supabase storage bucket 'chat-media' is public.");
        return;
      }
      
      const { url, path } = result;

      const { data } = await supabase
        .from("messages")
        .insert({ 
          chat_id: id, 
          sender_id: user.id, 
          message: url, 
          media_path: path,
          message_type: type, 
          file_name: fileName, 
          is_seen: false, 
          is_delivered: false 
        })
        .select()
        .single();
      
      if (data) { 
        setMessages((prev) => [...prev, data]); 
        scrollBottom(); 
        // Cache it locally immediately for the sender
        await getLocalMediaUri(url, path);
      }
    } finally {
      setUploading(false);
    }
  };


  // ── Pick image ──
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Allow photo access to send images."); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      await sendMedia(a.uri, a.mimeType || "image/jpeg", "image");
    }
  };

  // ── Pick video (limited to 60s by picker — no FFmpeg needed) ──
  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Allow photo access to send videos."); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 60,   // iOS/Android enforce this — no FFmpeg needed
      quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      await sendMedia(a.uri, a.mimeType || "video/mp4", "video");
    }
  };

  // ── Pick file ──
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]) {
        const a = result.assets[0];
        const sizeMB = (a.size || 0) / (1024 * 1024);
        if (sizeMB > 50) { Alert.alert("File too large", "Maximum file size is 50 MB."); return; }
        await sendMedia(a.uri, a.mimeType || "application/octet-stream", "file", a.name);
      }
    } catch (e: any) { console.log("file picker:", e.message); }
  };

  // ── Attachment menu ──
  const showAttachMenu = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Photo / Image", "Video (max 1 min)", "File"], cancelButtonIndex: 0 },
        (idx) => { if (idx === 1) pickImage(); else if (idx === 2) pickVideo(); else if (idx === 3) pickFile(); }
      );
    } else {
      Alert.alert("Send", "Choose what to send", [
        { text: "📷 Photo / Image", onPress: pickImage },
        { text: "🎥 Video (max 1 min)", onPress: pickVideo },
        { text: "📄 File", onPress: pickFile },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, backgroundConfig.type === "color" && { backgroundColor: backgroundConfig.value }]}>
      {backgroundConfig.type === "image" && (
        <Image 
          source={{ uri: backgroundConfig.value }} 
          style={StyleSheet.absoluteFillObject} 
          resizeMode="cover"
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 10 }}
          onPress={() => setSettingsVisible(true)}
        >
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{(name || "U").charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>{name || "Chat"}</Text>
            {otherUser?.is_online ? (
              <Text style={styles.onlineText}>● Online</Text>
            ) : (
              <Text style={styles.offlineText}>{formatLastSeen(otherUser?.last_seen)}</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Call Actions */}
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerActionBtn} 
            onPress={() => Alert.alert("Voice Call", `Starting voice call with ${name}...`)}
          >
            <Phone size={20} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerActionBtn} 
            onPress={() => Alert.alert("Video Call", `Starting video call with ${name}...`)}
          >
            <Video size={22} color="#2563EB" />
          </TouchableOpacity>
        </View>
      </View>

      <ChatSettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        otherUser={otherUser}
        chatSettings={chatSettings}
        onUpdateSettings={handleUpdateSettings}
        onUpdateMemberSettings={handleUpdateMemberSettings}
        onClearChat={handleClearChat}
        onBlockUser={handleBlockUser}
      />

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <MessageBubble item={item} isMine={item.sender_id === user?.id} />
          )}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={scrollBottom}
          onLayout={scrollBottom}
          showsVerticalScrollIndicator={false}
        />

        {uploading && (
          <View style={styles.uploadingBar}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputArea}>
          {!isRecording && (
            <TouchableOpacity style={styles.attachBtn} onPress={showAttachMenu}>
              <Text style={styles.attachIcon}>📎</Text>
            </TouchableOpacity>
          )}

          {isRecording ? (
            <View style={styles.recordingOverlay}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording {formatDuration(recordDuration)}</Text>
            </View>
          ) : (
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={2000}
            />
          )}

          {message.trim().length === 0 ? (
            <TouchableOpacity
              style={[styles.sendBtn, isRecording && { backgroundColor: "#EF4444" }]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? <StopCircle size={22} color="#FFF" /> : <Mic size={22} color="#FFF" />}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]}
              onPress={sendText}
              disabled={!message.trim()}
            >
              <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EEF2FF" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    gap: 10,
  },

  backBtn: { padding: 6 },
  backIcon: { fontSize: 22, color: "#2563EB", fontWeight: "700" },

  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },

  headerAvatarText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  headerName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  onlineText: { fontSize: 12, color: "#22C55E", marginTop: 1 },
  offlineText: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActionBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
  },

  messageList: { padding: 12, paddingBottom: 8 },

  msgContainer: { marginVertical: 3 },
  myContainer: { alignItems: "flex-end" },
  otherContainer: { alignItems: "flex-start" },

  bubble: {
    maxWidth: "78%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  myBubble: { backgroundColor: "#2563EB", borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: "#FFFFFF", borderBottomLeftRadius: 4, borderWidth: 0.5, borderColor: "#E5E7EB" },

  msgText: { fontSize: 15, lineHeight: 21 },
  myText: { color: "#FFFFFF" },
  otherText: { color: "#111827" },

  metaRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 4 },
  msgTime: { fontSize: 11 },
  myTime: { color: "#BFDBFE" },
  otherTime: { color: "#9CA3AF" },

  voicePlayer: {
    flexDirection: "row",
    alignItems: "center",
    width: 220,
    paddingVertical: 6,
    gap: 10,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 2,
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
  },
  voiceTime: {
    fontSize: 10,
    minWidth: 30,
  },

  msgImage: { width: 220, height: 160, borderRadius: 10, marginBottom: 4 },

  videoBox: {
    width: 220,
    height: 120,
    borderRadius: 10,
    backgroundColor: "#1E3A5F",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  videoIcon: { fontSize: 36 },
  videoLabel: { color: "#BFDBFE", fontSize: 13, marginTop: 6 },

  fileRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4, gap: 8 },
  fileIcon: { fontSize: 28 },
  fileLabel: { flex: 1, fontSize: 14 },

  uploadingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    backgroundColor: "#EFF6FF",
    gap: 8,
  },
  uploadingText: { fontSize: 13, color: "#2563EB" },

  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    paddingBottom: Platform.OS === "ios" ? 28 : 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0.5,
    borderTopColor: "#E5E7EB",
    gap: 8,
  },

  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  attachIcon: { fontSize: 20 },

  input: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    maxHeight: 120,
  },

  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { backgroundColor: "#BFDBFE" },
  sendIcon: { color: "#FFFFFF", fontSize: 18, marginLeft: 2 },

  recordingOverlay: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 22,
    paddingHorizontal: 16,
    height: 44,
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  recordingText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
  },
});