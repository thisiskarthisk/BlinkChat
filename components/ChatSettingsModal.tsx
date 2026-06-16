// import {
//   ArrowLeft,
//   Clock,
//   Lock,
//   Palette,
//   Shield,
//   Trash2,
//   X,
// } from "lucide-react-native";
// import React, { useState } from "react";
// import {
//   Alert,
//   Modal,
//   SafeAreaView,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";

// interface ChatSettingsModalProps {
//   visible: boolean;
//   onClose: () => void;
//   otherUser: any;
//   chatSettings: any;
//   onUpdateSettings: (settings: any) => Promise<void>;
//   onUpdateMemberSettings: (settings: any) => Promise<void>;
//   onClearChat: () => Promise<void>;
//   onBlockUser: () => Promise<void>;
// }

// const THEMES = [
//   { name: "Default", color: "#F8FAFC" },
//   { name: "Ocean", color: "#E0F2FE" },
//   { name: "Lavender", color: "#F5F3FF" },
//   { name: "Mint", color: "#F0FDF4" },
//   { name: "Sunset", color: "#FFF7ED" },
// ];

// const TTL_OPTIONS = [
//   { label: "Off", value: null },
//   { label: "1 Hour", value: "1 hour" },
//   { label: "1 Day", value: "1 day" },
//   { label: "1 Week", value: "1 week" },
// ];

// export default function ChatSettingsModal({
//   visible,
//   onClose,
//   otherUser,
//   chatSettings,
//   onUpdateSettings,
//   onUpdateMemberSettings,
//   onClearChat,
//   onBlockUser,
// }: ChatSettingsModalProps) {
//   const [loading, setLoading] = useState(false);

//   const handleThemeSelect = async (theme: string) => {
//     setLoading(true);
//     await onUpdateMemberSettings({ chat_theme: theme });
//     setLoading(false);
//   };

//   const handleTTLSelect = async (ttl: string | null) => {
//     setLoading(true);
//     await onUpdateSettings({ disappearing_messages_ttl: ttl });
//     setLoading(false);
//   };

//   const handleToggleLock = async () => {
//     setLoading(true);
//     await onUpdateMemberSettings({ is_locked: !chatSettings.is_locked });
//     setLoading(false);
//   };

//   const confirmClear = () => {
//     Alert.alert("Clear Chat", "Are you sure you want to delete all messages?", [
//       { text: "Cancel", style: "cancel" },
//       { text: "Clear", style: "destructive", onPress: onClearChat },
//     ]);
//   };

//   const confirmBlock = () => {
//     Alert.alert("Block User", `Are you sure you want to block ${otherUser?.full_name}?`, [
//       { text: "Cancel", style: "cancel" },
//       { text: "Block", style: "destructive", onPress: onBlockUser },
//     ]);
//   };

//   return (
//     <Modal visible={visible} animationType="slide" transparent={false}>
//       <SafeAreaView style={styles.container}>
//         <View style={styles.header}>
//           <TouchableOpacity onPress={onClose} style={styles.backBtn}>
//             <X size={24} color="#111827" />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Chat Settings</Text>
//         </View>

//         <ScrollView style={styles.content}>
//           {/* Profile Section */}
//           <View style={styles.profileSection}>
//             <View style={styles.avatar}>
//               <Text style={styles.avatarText}>
//                 {otherUser?.full_name?.[0].toUpperCase() || "?"}
//               </Text>
//             </View>
//             <Text style={styles.userName}>{otherUser?.full_name}</Text>
//             <Text style={styles.userStatus}>
//               {otherUser?.status || "Hey there! I am using BlinkChat"}
//             </Text>
//           </View>

//           {/* Settings Groups */}
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Customization</Text>
//             <View style={styles.settingItem}>
//               <View style={styles.settingLabelRow}>
//                 <Palette size={20} color="#4B5563" />
//                 <Text style={styles.settingLabel}>Chat Theme</Text>
//               </View>
//               <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.themeList}>
//                 {THEMES.map((t) => (
//                   <TouchableOpacity
//                     key={t.name}
//                     onPress={() => handleThemeSelect(t.name)}
//                     style={[
//                       styles.themeCircle,
//                       { backgroundColor: t.color },
//                       chatSettings.chat_theme === t.name && styles.activeTheme,
//                     ]}
//                   />
//                 ))}
//               </ScrollView>
//             </View>
//           </View>

//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Privacy & Security</Text>
            
//             <View style={styles.settingItem}>
//               <View style={styles.settingLabelRow}>
//                 <Clock size={20} color="#4B5563" />
//                 <Text style={styles.settingLabel}>Disappearing Messages</Text>
//               </View>
//               <View style={styles.optionsRow}>
//                 {TTL_OPTIONS.map((opt) => (
//                   <TouchableOpacity
//                     key={opt.label}
//                     onPress={() => handleTTLSelect(opt.value)}
//                     style={[
//                       styles.optionBtn,
//                       chatSettings.disappearing_messages_ttl === opt.value && styles.activeOption,
//                     ]}
//                   >
//                     <Text style={[
//                       styles.optionText,
//                       chatSettings.disappearing_messages_ttl === opt.value && styles.activeOptionText
//                     ]}>
//                       {opt.label}
//                     </Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </View>

//             <TouchableOpacity style={styles.settingRow} onPress={handleToggleLock}>
//               <View style={styles.settingLabelRow}>
//                 <Lock size={20} color="#4B5563" />
//                 <Text style={styles.settingLabel}>Lock Chat</Text>
//               </View>
//               <View style={[styles.toggle, chatSettings.is_locked && styles.toggleActive]}>
//                 <View style={[styles.toggleDot, chatSettings.is_locked && styles.toggleDotActive]} />
//               </View>
//             </TouchableOpacity>
//           </View>

//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Actions</Text>
            
//             <TouchableOpacity style={styles.actionRow} onPress={confirmClear}>
//               <Trash2 size={20} color="#EF4444" />
//               <Text style={[styles.actionLabel, { color: "#EF4444" }]}>Clear Chat</Text>
//             </TouchableOpacity>

//             <TouchableOpacity style={styles.actionRow} onPress={confirmBlock}>
//               <Shield size={20} color="#EF4444" />
//               <Text style={[styles.actionLabel, { color: "#EF4444" }]}>Block User</Text>
//             </TouchableOpacity>
//           </View>
//         </ScrollView>
//       </SafeAreaView>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#FFFFFF" },
//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     padding: 16,
//     borderBottomWidth: 0.5,
//     borderBottomColor: "#E5E7EB",
//   },
//   backBtn: { marginRight: 16 },
//   headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
//   content: { flex: 1 },
//   profileSection: {
//     alignItems: "center",
//     padding: 32,
//     borderBottomWidth: 8,
//     borderBottomColor: "#F8FAFC",
//   },
//   avatar: {
//     width: 80,
//     height: 80,
//     borderRadius: 40,
//     backgroundColor: "#2563EB",
//     justifyContent: "center",
//     alignItems: "center",
//     marginBottom: 16,
//   },
//   avatarText: { fontSize: 32, fontWeight: "700", color: "#FFFFFF" },
//   userName: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 4 },
//   userStatus: { fontSize: 14, color: "#6B7280", textAlign: "center" },
//   section: { padding: 20, borderBottomWidth: 0.5, borderBottomColor: "#E5E7EB" },
//   sectionTitle: {
//     fontSize: 13,
//     fontWeight: "600",
//     color: "#9CA3AF",
//     textTransform: "uppercase",
//     letterSpacing: 0.5,
//     marginBottom: 16,
//   },
//   settingItem: { marginBottom: 12 },
//   settingRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     paddingVertical: 12,
//   },
//   settingLabelRow: { flexDirection: "row", alignItems: "center", gap: 12 },
//   settingLabel: { fontSize: 16, color: "#374151", fontWeight: "500" },
//   themeList: { flexDirection: "row", marginTop: 12 },
//   themeCircle: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     marginRight: 12,
//     borderWidth: 2,
//     borderColor: "transparent",
//   },
//   activeTheme: { borderColor: "#2563EB" },
//   optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
//   optionBtn: {
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 8,
//     backgroundColor: "#F3F4F6",
//   },
//   activeOption: { backgroundColor: "#2563EB" },
//   optionText: { fontSize: 13, color: "#4B5563" },
//   activeOptionText: { color: "#FFFFFF", fontWeight: "600" },
//   toggle: {
//     width: 44,
//     height: 24,
//     borderRadius: 12,
//     backgroundColor: "#E5E7EB",
//     padding: 2,
//   },
//   toggleActive: { backgroundColor: "#10B981" },
//   toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF" },
//   toggleDotActive: { transform: [{ translateX: 20 }] },
//   actionRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
//   actionLabel: { fontSize: 16, fontWeight: "500" },
// });



import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  Lock,
  Palette,
  Shield,
  Trash2,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ChatSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  otherUser: any;
  chatSettings: any;
  onUpdateSettings: (settings: any) => Promise<void>;
  onUpdateMemberSettings: (settings: any) => Promise<void>;
  onClearChat: () => Promise<void>;
  onBlockUser: () => Promise<void>;
}

const COLOR_THEMES = [
  { id: "bg_default", name: "Default", color: "#F1F5F9" },
  { id: "bg_whatsapp", name: "WhatsApp Teal", color: "#E8F5E9" },
  { id: "bg_ocean", name: "Soft Blue", color: "#E0F2FE" },
  { id: "bg_lavender", name: "Lavender", color: "#F5F3FF" },
  { id: "bg_dark", name: "Dark Charcoal", color: "#1E293B" },
];

const TTL_OPTIONS = [
  { label: "Off", value: null },
  { label: "1 Hour", value: "1 hour" },
  { label: "1 Day", value: "1 day" },
  { label: "1 Week", value: "1 week" },
];

export default function ChatSettingsModal({
  visible,
  onClose,
  otherUser,
  chatSettings,
  onUpdateSettings,
  onUpdateMemberSettings,
  onClearChat,
  onBlockUser,
}: ChatSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [bgType, setBgType] = useState<"color" | "image">("color");
  const [selectedColorId, setSelectedColorId] = useState("bg_default");
  const [customImageUri, setCustomImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (otherUser?.id) {
      loadBackgroundConfiguration();
    }
  }, [otherUser?.id]);

  const loadBackgroundConfiguration = async () => {
    try {
      const savedType = await AsyncStorage.getItem(`chat_bg_type_${otherUser.id}`);
      const savedColorId = await AsyncStorage.getItem(`chat_color_id_${otherUser.id}`);
      const savedImageUri = await AsyncStorage.getItem(`chat_image_uri_${otherUser.id}`);

      if (savedType === "image" && savedImageUri) {
        setBgType("image");
        setCustomImageUri(savedImageUri);
      } else {
        setBgType("color");
        setSelectedColorId(savedColorId || "bg_default");
      }
    } catch (e) {
      console.error("Error loading chat backgrounds:", e);
    }
  };

  const handleColorSelect = async (colorId: string, colorHex: string) => {
    try {
      setBgType("color");
      setSelectedColorId(colorId);
      
      await AsyncStorage.setItem(`chat_bg_type_${otherUser.id}`, "color");
      await AsyncStorage.setItem(`chat_color_id_${otherUser.id}`, colorId);
      await AsyncStorage.setItem(`chat_color_hex_${otherUser.id}`, colorHex);
      
      await onUpdateMemberSettings({ chat_theme: colorId });
    } catch (err) {
      console.error(err);
    }
  };

  const handlePickImage = async () => {
    const permissions = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissions.granted) {
      Alert.alert("Permission Denied", "We need storage access to fetch photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
      aspect: [9, 16],
    });

    if (!result.canceled && result.assets[0].uri) {
      const pickedUri = result.assets[0].uri;
      try {
        setBgType("image");
        setCustomImageUri(pickedUri);

        await AsyncStorage.setItem(`chat_bg_type_${otherUser.id}`, "image");
        await AsyncStorage.setItem(`chat_image_uri_${otherUser.id}`, pickedUri);
        
        await onUpdateMemberSettings({ chat_theme: "custom_image" });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleTTLSelect = async (ttl: string | null) => {
    setLoading(true);
    await onUpdateSettings({ disappearing_messages_ttl: ttl });
    setLoading(false);
  };

  const handleToggleLock = async () => {
    setLoading(true);
    await onUpdateMemberSettings({ is_locked: !chatSettings.is_locked });
    setLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        
        {/* Header Block */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <ArrowLeft size={24} color="#075E54" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Wallpaper & Theme</Text>
            <Text style={styles.headerSubtitle}>{otherUser?.full_name || "Chat Room"}</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Wallpaper Preview Component */}
          <View style={styles.previewContainer}>
            <Text style={styles.whatsappLabel}>PREVIEW</Text>
            <View 
              style={[
                styles.chatMockBubbleContainer, 
                bgType === "color" 
                  ? { backgroundColor: COLOR_THEMES.find(t => t.id === selectedColorId)?.color || "#F1F5F9" }
                  : { backgroundColor: "#E5DDD5" }
              ]}
            >
              {bgType === "image" && customImageUri && (
                <Image source={{ uri: customImageUri }} style={StyleSheet.absoluteFillObject} />
              )}
              
              <View style={styles.mockBubbleLeft}>
                <Text style={styles.mockBubbleText}>Hey! Check out my new chat styling setup.</Text>
                <Text style={styles.mockBubbleTime}>10:42 AM</Text>
              </View>

              <View style={styles.mockBubbleRight}>
                <Text style={[styles.mockBubbleText, { color: "#000" }]}>Wow, looks exactly like WhatsApp! 🚀</Text>
                <Text style={[styles.mockBubbleTime, { color: "#657577" }]}>10:43 AM</Text>
              </View>
            </View>
          </View>

          {/* Core Customization Panel */}
          <View style={styles.section}>
            <Text style={styles.whatsappSectionHeader}>CHOOSE CHAT WALLPAPER</Text>
            
            <View style={styles.optionsListBlock}>
              <TouchableOpacity style={styles.whatsappRow} onPress={handlePickImage} activeOpacity={0.7}>
                <View style={styles.rowLeftGroup}>
                  <View style={[styles.iconWrapper, { backgroundColor: "#ECEFF1" }]}>
                    <ImageIcon size={20} color="#455A64" />
                  </View>
                  <Text style={styles.rowTitle}>Custom Gallery Photo</Text>
                </View>
                <View style={styles.rowRightGroup}>
                  {bgType === "image" && <Check size={18} color="#075E54" style={styles.checkMark} />}
                  <ChevronRight size={18} color="#B0BEC5" />
                </View>
              </TouchableOpacity>

              <View style={styles.rowDivider} />

              {/* Solid Colors Roll */}
              <View style={[styles.whatsappRow, { flexDirection: "column", alignItems: "flex-start", gap: 12 }]}>
                {/* FIXED: Replaced <div> with <View> */}
                <View style={styles.rowLeftGroup}>
                  <View style={[styles.iconWrapper, { backgroundColor: "#E8F5E9" }]}>
                    <Palette size={20} color="#2E7D32" />
                  </View>
                  <Text style={styles.rowTitle}>Solid Wallpaper Colors</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorStrip}>
                  {COLOR_THEMES.map((theme) => {
                    const isCurrentColorActive = bgType === "color" && selectedColorId === theme.id;
                    return (
                      <TouchableOpacity
                        key={theme.id}
                        onPress={() => handleColorSelect(theme.id, theme.color)}
                        style={[styles.colorBubble, { backgroundColor: theme.color }]}
                        activeOpacity={0.8}
                      >
                        {isCurrentColorActive && (
                          <View style={styles.colorBubbleCheckedOverlay}>
                            <Check size={16} color={theme.id === "bg_dark" ? "#FFF" : "#075E54"} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </View>

          {/* Preferences Settings Group */}
          <View style={styles.section}>
            <Text style={styles.whatsappSectionHeader}>CHAT PREFERENCES</Text>
            <View style={styles.optionsListBlock}>
              
              <View style={[styles.whatsappRow, { flexDirection: "column", alignItems: "flex-start", gap: 10 }]}>
                {/* FIXED: Replaced <div> with <View> */}
                <View style={styles.rowLeftGroup}>
                  <Clock size={18} color="#546E7A" />
                  <Text style={styles.preferenceLabel}>Disappearing Messages</Text>
                </View>
                <View style={styles.gridTtlOptions}>
                  {TTL_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.label}
                      onPress={() => handleTTLSelect(opt.value)}
                      style={[
                        styles.ttlChip,
                        chatSettings.disappearing_messages_ttl === opt.value && styles.ttlChipActive,
                      ]}
                    >
                      <Text style={[
                        styles.ttlChipText,
                        chatSettings.disappearing_messages_ttl === opt.value && styles.ttlChipTextActive
                      ]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.rowDivider} />

              <TouchableOpacity style={styles.whatsappRow} onPress={handleToggleLock} activeOpacity={0.7}>
                <View style={styles.rowLeftGroup}>
                  <Lock size={18} color="#546E7A" />
                  <Text style={styles.preferenceLabel}>Lock Secure Chat Room</Text>
                </View>
                <View style={[styles.toggleSwitch, chatSettings.is_locked && styles.toggleSwitchActive]}>
                  <View style={[styles.toggleHandle, chatSettings.is_locked && styles.toggleHandleActive]} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Destructive Actions Group */}
          <View style={[styles.section, { marginBottom: 30 }]}>
            <View style={styles.optionsListBlock}>
              <TouchableOpacity style={styles.whatsappRow} onPress={onClearChat}>
                <View style={styles.rowLeftGroup}>
                  <Trash2 size={18} color="#D32F2F" />
                  <Text style={[styles.preferenceLabel, { color: "#D32F2F", fontWeight: "600" }]}>Clear Chat Log</Text>
                </View>
              </TouchableOpacity>
              
              <View style={styles.rowDivider} />

              <TouchableOpacity style={styles.whatsappRow} onPress={onBlockUser}>
                <View style={styles.rowLeftGroup}>
                  <Shield size={18} color="#D32F2F" />
                  <Text style={[styles.preferenceLabel, { color: "#D32F2F", fontWeight: "600" }]}>Block Contact</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F5F7" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#075E54" },
  headerSubtitle: { fontSize: 13, color: "#546E7A", marginTop: 2 },
  content: { flex: 1 },
  
  previewContainer: { padding: 16, alignItems: "center" },
  whatsappLabel: { fontSize: 11, fontWeight: "700", color: "#78909C", alignSelf: "flex-start", marginBottom: 8, letterSpacing: 0.5 },
  chatMockBubbleContainer: {
    width: "100%",
    height: 170,
    borderRadius: 16,
    padding: 14,
    justifyContent: "center",
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  mockBubbleLeft: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderTopLeftRadius: 0,
    maxWidth: "80%",
    marginBottom: 12,
  },
  mockBubbleRight: {
    backgroundColor: "#DCF8C6",
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderTopRightRadius: 0,
    maxWidth: "80%",
  },
  mockBubbleText: { fontSize: 13, color: "#333" },
  mockBubbleTime: { fontSize: 9, color: "#999", alignSelf: "flex-end", marginTop: 4 },

  section: { marginTop: 16, paddingHorizontal: 12 },
  whatsappSectionHeader: { fontSize: 11, fontWeight: "700", color: "#546E7A", marginBottom: 6, marginLeft: 6, letterSpacing: 0.5 },
  optionsListBlock: { backgroundColor: "#FFFFFF", borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#E0E0E0" },
  whatsappRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 16 },
  rowLeftGroup: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowRightGroup: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconWrapper: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  rowTitle: { fontSize: 15, color: "#212121", fontWeight: "500" },
  checkMark: { marginRight: 4 },
  rowDivider: { height: 1, backgroundColor: "#EEEEEE", marginHorizontal: 16 },

  colorStrip: { flexDirection: "row", marginTop: 4, paddingBottom: 6 },
  colorBubble: { width: 46, height: 46, borderRadius: 23, marginRight: 12, borderWidth: 1.5, borderColor: "#E0E0E0", justifyContent: "center", alignItems: "center" },
  colorBubbleCheckedOverlay: { position: "absolute", inset: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 23 },

  preferenceLabel: { fontSize: 15, color: "#37474F", fontWeight: "500" },
  gridTtlOptions: { flexDirection: "row", width: "100%", gap: 6, marginTop: 4 },
  ttlChip: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: "#ECEFF1", alignItems: "center" },
  ttlChipActive: { backgroundColor: "#075E54" },
  ttlChipText: { fontSize: 12, color: "#455A64", fontWeight: "600" },
  ttlChipTextActive: { color: "#FFFFFF" },

  toggleSwitch: { width: 42, height: 22, borderRadius: 11, backgroundColor: "#CFD8DC", padding: 2 },
  toggleSwitchActive: { backgroundColor: "#075E54" },
  toggleHandle: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFFFFF" },
  toggleHandleActive: { transform: [{ translateX: 20 }] },
});