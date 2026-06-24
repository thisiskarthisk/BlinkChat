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
import * as LocalAuthentication from "expo-local-authentication";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  Lock,
  Palette,
  Shield,
  Trash2,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../hooks/useAuth";
import { getCachedMessages } from "../services/storageService";

interface ChatSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  otherUser: any;
  chatSettings: any;
  onUpdateSettings: (settings: any) => Promise<void>;
  onUpdateMemberSettings: (settings: any) => Promise<void>;
  onClearChat: () => Promise<void>;
  onBlockUser: () => Promise<void>;
  chatId?: string;
}

const COLOR_THEMES = [
  { id: "bg_default", name: "Default", color: "#F1F5F9" },
  { id: "bg_whatsapp", name: "WhatsApp Teal", color: "#E8F5E9" },
  { id: "bg_ocean", name: "Soft Blue", color: "#E0F2FE" },
  { id: "bg_lavender", name: "Lavender", color: "#F5F3FF" },
  { id: "bg_dark", name: "Dark Charcoal", color: "#1E293B" },
];

const BUBBLE_THEMES_PREVIEW: Record<string, {
  myBubbleBg: string;
  myText: string;
  otherBubbleBg: string;
  otherText: string;
  otherBorder?: string;
  myTime: string;
  otherTime: string;
}> = {
  bg_default: {
    myBubbleBg: "#2563EB",
    myText: "#FFFFFF",
    otherBubbleBg: "#FFFFFF",
    otherText: "#1E293B",
    otherBorder: "#E5E7EB",
    myTime: "rgba(255, 255, 255, 0.7)",
    otherTime: "#6B7280",
  },
  bg_whatsapp: {
    myBubbleBg: "#DCF8C6",
    myText: "#1C2E1A",
    otherBubbleBg: "#FFFFFF",
    otherText: "#1F2937",
    otherBorder: "#E5E7EB",
    myTime: "rgba(0, 0, 0, 0.45)",
    otherTime: "rgba(0, 0, 0, 0.45)",
  },
  bg_ocean: {
    myBubbleBg: "#0284C7",
    myText: "#FFFFFF",
    otherBubbleBg: "#F0F9FF",
    otherText: "#0369A1",
    otherBorder: "#BAE6FD",
    myTime: "rgba(255, 255, 255, 0.7)",
    otherTime: "#0369A1",
  },
  bg_lavender: {
    myBubbleBg: "#7C3AED",
    myText: "#FFFFFF",
    otherBubbleBg: "#FAF5FF",
    otherText: "#6B21A8",
    otherBorder: "#E9D5FF",
    myTime: "rgba(255, 255, 255, 0.7)",
    otherTime: "#6B21A8",
  },
  bg_dark: {
    myBubbleBg: "#334155",
    myText: "#FFFFFF",
    otherBubbleBg: "#1E293B",
    otherText: "#E2E8F0",
    otherBorder: "#475569",
    myTime: "rgba(255, 255, 255, 0.7)",
    otherTime: "#94A3B8",
  },
};

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
  chatId,
}: ChatSettingsModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bgType, setBgType] = useState<"color" | "image">("color");
  const [selectedColorId, setSelectedColorId] = useState("bg_default");
  const [customImageUri, setCustomImageUri] = useState<string | null>(null);

  // Lock State
  const [isLockedLocal, setIsLockedLocal] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");

  // Media Vault items
  const [activeVaultTab, setActiveVaultTab] = useState<"photos" | "links" | "docs">("photos");
  const [vaultPhotos, setVaultPhotos] = useState<any[]>([]);
  const [vaultLinks, setVaultLinks] = useState<any[]>([]);
  const [vaultDocs, setVaultDocs] = useState<any[]>([]);
  const [selectedVaultMediaUri, setSelectedVaultMediaUri] = useState<string | null>(null);
  const [isMutedLocal, setIsMutedLocal] = useState(false);
  const [showMediaHubModal, setShowMediaHubModal] = useState(false);

  // Theme Preview state hooks
  const [showThemePreview, setShowThemePreview] = useState(false);
  const [previewBgType, setPreviewBgType] = useState<"color" | "image">("color");
  const [previewColorId, setPreviewColorId] = useState("bg_default");
  const [previewColorHex, setPreviewColorHex] = useState("#F1F5F9");
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (otherUser?.id) {
      loadBackgroundConfiguration();
      checkLockStatus();
      checkMuteStatus();
    }
  }, [otherUser?.id]);

  const checkMuteStatus = async () => {
    if (!user?.id || !otherUser?.id) return;
    try {
      const muted = await AsyncStorage.getItem(`chat_notifications_muted_${user.id}_${otherUser.id}`);
      setIsMutedLocal(muted === "true");
    } catch (e) {
      console.error("Error checking mute status:", e);
    }
  };

  const handleToggleMute = async () => {
    if (!user?.id || !otherUser?.id) return;
    try {
      const nextMuted = !isMutedLocal;
      setIsMutedLocal(nextMuted);
      await AsyncStorage.setItem(
        `chat_notifications_muted_${user.id}_${otherUser.id}`,
        nextMuted ? "true" : "false"
      );
    } catch (e) {
      console.error("Error toggling mute status:", e);
    }
  };

  const loadMediaItems = async () => {
    if (!chatId) return;
    try {
      const cachedMessages = await getCachedMessages(chatId);
      
      // 1. Filter Photos (images & videos)
      const photos = cachedMessages
        .filter((m: any) => ["image", "video"].includes(m.message_type))
        .map((m: any) => ({
          id: m.id,
          type: m.message_type,
          uri: m.message,
          created_at: m.created_at,
        }));
      setVaultPhotos(photos);

      // 2. Filter Links (text messages containing URLs)
      const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
      const links = cachedMessages
        .filter((m: any) => (m.message_type === "text" || !m.message_type) && m.message && urlRegex.test(m.message))
        .map((m: any) => {
          urlRegex.lastIndex = 0;
          const match = m.message.match(urlRegex);
          const url = match ? match[0] : m.message;
          return {
            id: m.id,
            url: url,
            created_at: m.created_at,
          };
        });
      setVaultLinks(links);

      // 3. Filter Docs (files/documents)
      const docs = cachedMessages
        .filter((m: any) => m.message_type === "file")
        .map((m: any) => ({
          id: m.id,
          uri: m.message,
          file_name: m.file_name || "Document",
          created_at: m.created_at,
        }));
      setVaultDocs(docs);

    } catch (e) {
      console.error("loadMediaItems error:", e);
    }
  };

  useEffect(() => {
    if (visible && chatId) {
      loadMediaItems();
    }
  }, [visible, chatId]);

  const handleMediaItemPress = (item: any) => {
    if (item.type === "image") {
      setSelectedVaultMediaUri(item.uri);
    } else {
      Alert.alert(
        "Open Attachment",
        `Would you like to open this shared ${item.type || "video"}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Link",
            onPress: async () => {
              try {
                const uri = item.uri;
                if (!uri) return;
                const supported = await Linking.canOpenURL(uri);
                if (supported) {
                  await Linking.openURL(uri);
                } else {
                  Alert.alert("Error", "Cannot open this media URL on your device.");
                }
              } catch (e) {
                console.error("Error opening URL:", e);
              }
            },
          },
        ]
      );
    }
  };

  const handleLinkItemPress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot open this URL on your device.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDocItemPress = (item: any) => {
    Alert.alert(
      "Open Document",
      `Would you like to download/open "${item.file_name || "Document"}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open File",
          onPress: async () => {
            try {
              const supported = await Linking.canOpenURL(item.uri);
              if (supported) {
                await Linking.openURL(item.uri);
              } else {
                Alert.alert("Error", "Cannot open this file URL.");
              }
            } catch (e) {
              console.error(e);
            }
          },
        },
      ]
    );
  };

  const checkLockStatus = async () => {
    const locked = await AsyncStorage.getItem(`chat_locked_${user?.id}_${otherUser.id}`);
    setIsLockedLocal(locked === "true");
  };

  const authenticateAndLock = async () => {
    try {
      const globalPin = await AsyncStorage.getItem(`chat_pin_${user?.id}`);
      if (!globalPin) {
        setPin("");
        setConfirmPin("");
        setStep("enter");
        setShowPinSetup(true);
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Authenticate to lock this chat",
          fallbackLabel: "Use PIN",
        });

        if (result.success) {
          await proceedToLock();
          return;
        }
      }

      Alert.prompt(
        "Confirm Chat Lock",
        "Enter your 4-digit Chat Lock PIN to secure this chat",
        async (enteredPin) => {
          if (enteredPin === globalPin) {
            await proceedToLock();
          } else {
            Alert.alert("Error", "Incorrect PIN");
          }
        },
        "secure-text"
      );
    } catch (e) {
      console.error(e);
    }
  };

  const proceedToLock = async () => {
    await AsyncStorage.setItem(`chat_locked_${user?.id}_${otherUser.id}`, "true");
    setIsLockedLocal(true);
    Alert.alert("Success", "Chat has been locked.");
  };

  const handleToggleLock = () => {
    if (isLockedLocal) {
      Alert.alert("Unlock Chat", "Are you sure you want to unlock this chat?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlock",
          onPress: async () => {
            await AsyncStorage.removeItem(`chat_locked_${user?.id}_${otherUser.id}`);
            setIsLockedLocal(false);
          },
        },
      ]);
    } else {
      authenticateAndLock();
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 4) {
      Alert.alert("Error", "PIN must be 4 digits");
      return;
    }
    setStep("confirm");
  };

  const handleConfirmPinSubmit = async () => {
    if (pin !== confirmPin) {
      Alert.alert("Error", "PINs do not match. Try again.");
      setPin("");
      setConfirmPin("");
      setStep("enter");
      return;
    }

    try {
      await AsyncStorage.setItem(`chat_pin_${user?.id}`, pin);

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Authenticate to lock this chat",
          fallbackLabel: "Use PIN",
        });

        if (result.success) {
          await proceedToLock();
          setShowPinSetup(false);
          return;
        }
      }

      await proceedToLock();
      setShowPinSetup(false);
    } catch (e) {
      console.error(e);
    }
  };

  const loadBackgroundConfiguration = async () => {
    try {
      const savedType = await AsyncStorage.getItem(`chat_bg_type_${user?.id}_${otherUser.id}`);
      const savedColorId = await AsyncStorage.getItem(`chat_color_id_${user?.id}_${otherUser.id}`);
      const savedImageUri = await AsyncStorage.getItem(`chat_image_uri_${user?.id}_${otherUser.id}`);

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

  const handleColorClick = (colorId: string, colorHex: string) => {
    setPreviewBgType("color");
    setPreviewColorId(colorId);
    setPreviewColorHex(colorHex);
    setPreviewImageUri(null);
    setShowThemePreview(true);
  };

  const handleColorSelect = async (colorId: string, colorHex: string) => {
    try {
      setBgType("color");
      setSelectedColorId(colorId);
      
      await AsyncStorage.setItem(`chat_bg_type_${user?.id}_${otherUser.id}`, "color");
      await AsyncStorage.setItem(`chat_color_id_${user?.id}_${otherUser.id}`, colorId);
      await AsyncStorage.setItem(`chat_color_hex_${user?.id}_${otherUser.id}`, colorHex);
      
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
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.9,
      aspect: [9, 16],
    });

    if (!result.canceled && result.assets[0].uri) {
      const pickedUri = result.assets[0].uri;
      setPreviewBgType("image");
      setPreviewImageUri(pickedUri);
      setPreviewColorId("custom_image");
      setShowThemePreview(true);
    }
  };

  const handleApplyTheme = async () => {
    try {
      if (previewBgType === "image" && previewImageUri) {
        setBgType("image");
        setCustomImageUri(previewImageUri);
        await AsyncStorage.setItem(`chat_bg_type_${user?.id}_${otherUser.id}`, "image");
        await AsyncStorage.setItem(`chat_image_uri_${user?.id}_${otherUser.id}`, previewImageUri);
        await onUpdateMemberSettings({ chat_theme: "custom_image" });
      } else {
        setBgType("color");
        setSelectedColorId(previewColorId);
        await AsyncStorage.setItem(`chat_bg_type_${user?.id}_${otherUser.id}`, "color");
        await AsyncStorage.setItem(`chat_color_id_${user?.id}_${otherUser.id}`, previewColorId);
        await AsyncStorage.setItem(`chat_color_hex_${user?.id}_${otherUser.id}`, previewColorHex);
        await onUpdateMemberSettings({ chat_theme: previewColorId });
      }
      setShowThemePreview(false);
    } catch (err) {
      console.error("Apply theme error:", err);
    }
  };

  const handleCancelTheme = () => {
    setShowThemePreview(false);
  };

  const handleTTLSelect = async (ttl: string | null) => {
    setLoading(true);
    await onUpdateSettings({ disappearing_messages_ttl: ttl });
    setLoading(false);
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0][0].toUpperCase();
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
            <Text style={styles.headerTitle}>Contact info</Text>
            <Text style={styles.headerSubtitle}>{otherUser?.full_name || "Chat Room"}</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Profile Card View */}
          <View style={styles.profileDetailsSection}>
            <TouchableOpacity 
              onPress={() => otherUser?.avatar_url && setSelectedVaultMediaUri(otherUser.avatar_url)} 
              activeOpacity={0.8}
              style={styles.profileAvatarWrapper}
            >
              {otherUser?.avatar_url ? (
                <Image source={{ uri: otherUser.avatar_url }} style={styles.profileAvatarImage} />
              ) : (
                <View style={[styles.profileAvatarPlaceholder, { backgroundColor: "#128C7E" }]}>
                  <Text style={styles.profileAvatarInitials}>
                    {getInitials(otherUser?.full_name || otherUser?.username || "U")}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.profileNameText}>{otherUser?.full_name || "User"}</Text>
            <Text style={styles.profileUsernameText}>@{otherUser?.username || "username"}</Text>
            <Text style={styles.profileStatusText}>
              {otherUser?.status || "Hey there! I am using BlinkChat"}
            </Text>
          </View>

          {/* Chat Wallpaper Trigger Row */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.whatsappRow} 
              onPress={() => {
                setPreviewBgType(bgType);
                setPreviewColorId(selectedColorId);
                const activeColorHex = COLOR_THEMES.find(t => t.id === selectedColorId)?.color || "#F1F5F9";
                setPreviewColorHex(activeColorHex);
                setPreviewImageUri(customImageUri);
                setShowThemePreview(true);
              }} 
              activeOpacity={0.7}
            >
              <View style={styles.rowLeftGroup}>
                <View style={[styles.iconWrapper, { backgroundColor: "#E8F5E9" }]}>
                  <Palette size={20} color="#2E7D32" />
                </View>
                <Text style={styles.rowTitle}>Chat Wallpaper & Theme</Text>
              </View>
              <View style={styles.rowRightGroup}>
                <Text style={{ fontSize: 13, color: "#90A4AE", marginRight: 4 }}>
                  {bgType === "image" ? "Custom Photo" : (COLOR_THEMES.find(t => t.id === selectedColorId)?.name || "Default")}
                </Text>
                <ChevronRight size={18} color="#B0BEC5" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Media Hub Section Row */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.whatsappRow} 
              onPress={() => setShowMediaHubModal(true)} 
              activeOpacity={0.7}
            >
              <View style={styles.rowLeftGroup}>
                <View style={[styles.iconWrapper, { backgroundColor: "#E3F2FD" }]}>
                  <ImageIcon size={20} color="#1E88E5" />
                </View>
                <Text style={styles.rowTitle}>Media, Links, and Docs</Text>
              </View>
              <View style={styles.rowRightGroup}>
                <Text style={{ fontSize: 13, color: "#90A4AE", marginRight: 4 }}>
                  {vaultPhotos.length + vaultLinks.length + vaultDocs.length}
                </Text>
                <ChevronRight size={18} color="#B0BEC5" />
              </View>
            </TouchableOpacity>
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

              <TouchableOpacity style={styles.whatsappRow} onPress={handleToggleMute} activeOpacity={0.7}>
                <View style={styles.rowLeftGroup}>
                  <Bell size={18} color="#546E7A" />
                  <Text style={styles.preferenceLabel}>Mute Notifications</Text>
                </View>
                <View style={[styles.toggleSwitch, isMutedLocal && styles.toggleSwitchActive]}>
                  <View style={[styles.toggleHandle, isMutedLocal && styles.toggleHandleActive]} />
                </View>
              </TouchableOpacity>

              <View style={styles.rowDivider} />

              <TouchableOpacity style={styles.whatsappRow} onPress={handleToggleLock} activeOpacity={0.7}>
                <View style={styles.rowLeftGroup}>
                  <Lock size={18} color="#546E7A" />
                  <Text style={styles.preferenceLabel}>Lock Secure Chat Room</Text>
                </View>
                <View style={[styles.toggleSwitch, isLockedLocal && styles.toggleSwitchActive]}>
                  <View style={[styles.toggleHandle, isLockedLocal && styles.toggleHandleActive]} />
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

        {/* PIN Setup Modal */}
        <Modal visible={showPinSetup} transparent animationType="fade">
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <View style={styles.pinModalOverlay}>
              <View style={styles.pinModalContent}>
                <Text style={styles.pinModalTitle}>
                  {step === "enter" ? "Set Chat PIN" : "Confirm Chat PIN"}
                </Text>
                <Text style={styles.pinModalSub}>Enter a 4-digit PIN to lock this chat</Text>
                
                <TextInput
                  style={styles.pinInput}
                  value={step === "enter" ? pin : confirmPin}
                  onChangeText={step === "enter" ? setPin : setConfirmPin}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  autoFocus
                  placeholder="****"
                />

                <View style={styles.pinModalActions}>
                  <TouchableOpacity 
                    style={styles.pinCancelBtn} 
                    onPress={() => setShowPinSetup(false)}
                  >
                    <Text style={styles.pinCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.pinSubmitBtn} 
                    onPress={step === "enter" ? handlePinSubmit : handleConfirmPinSubmit}
                  >
                    <Text style={styles.pinSubmitText}>
                      {step === "enter" ? "Next" : "Lock Chat"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Media Hub Modal */}
        <Modal 
          visible={showMediaHubModal} 
          animationType="slide" 
          transparent={false}
          onRequestClose={() => setShowMediaHubModal(false)}
        >
          <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setShowMediaHubModal(false)} style={styles.backBtn}>
                <ArrowLeft size={24} color="#075E54" />
              </TouchableOpacity>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Media Hub</Text>
                <Text style={styles.headerSubtitle}>{otherUser?.full_name || "Shared Files"}</Text>
              </View>
            </View>

            {/* List/Grid Content Area */}
            <View style={{ flex: 1, padding: 16 }}>
              {activeVaultTab === "photos" && (
                vaultPhotos.length === 0 ? (
                  <View style={styles.emptyMediaBlock}>
                    <Text style={styles.emptyMediaText}>No shared photos or videos yet.</Text>
                  </View>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.mediaGridContainer}>
                      {vaultPhotos.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.mediaGridCard}
                          onPress={() => handleMediaItemPress(item)}
                          activeOpacity={0.8}
                        >
                          {item.type === "image" ? (
                            <Image source={{ uri: item.uri }} style={styles.mediaGridImage} />
                          ) : (
                            <View style={[styles.mediaGridPlaceholderCard, { backgroundColor: "#FFEBEE" }]}>
                              <Text style={{ fontSize: 28 }}>🎥</Text>
                              <Text style={styles.mediaPlaceholderLabel} numberOfLines={1}>Video</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )
              )}

              {activeVaultTab === "links" && (
                vaultLinks.length === 0 ? (
                  <View style={styles.emptyMediaBlock}>
                    <Text style={styles.emptyMediaText}>No shared links or URLs yet.</Text>
                  </View>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ gap: 12 }}>
                      {vaultLinks.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.linkListRow}
                          onPress={() => handleLinkItemPress(item.url)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.linkIconWrapper}>
                            <Text style={{ fontSize: 18 }}>🔗</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.linkLabel} numberOfLines={2}>{item.url}</Text>
                            <Text style={styles.linkDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )
              )}

              {activeVaultTab === "docs" && (
                vaultDocs.length === 0 ? (
                  <View style={styles.emptyMediaBlock}>
                    <Text style={styles.emptyMediaText}>No shared documents or files yet.</Text>
                  </View>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ gap: 12 }}>
                      {vaultDocs.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.docListRow}
                          onPress={() => handleDocItemPress(item)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.docIconWrapper}>
                            <Text style={{ fontSize: 18 }}>📄</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.docLabel} numberOfLines={1}>{item.file_name || "Document"}</Text>
                            <Text style={styles.docDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )
              )}
            </View>

            {/* Bottom Tab Bar */}
            <View style={styles.mediaHubBottomTabs}>
              <TouchableOpacity 
                style={[styles.mediaHubTabItem, activeVaultTab === "photos" && styles.mediaHubTabItemActive]} 
                onPress={() => setActiveVaultTab("photos")}
              >
                <Text style={[styles.mediaHubTabText, activeVaultTab === "photos" && styles.mediaHubTabTextActive]}>Media</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.mediaHubTabItem, activeVaultTab === "links" && styles.mediaHubTabItemActive]} 
                onPress={() => setActiveVaultTab("links")}
              >
                <Text style={[styles.mediaHubTabText, activeVaultTab === "links" && styles.mediaHubTabTextActive]}>Links</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.mediaHubTabItem, activeVaultTab === "docs" && styles.mediaHubTabItemActive]} 
                onPress={() => setActiveVaultTab("docs")}
              >
                <Text style={[styles.mediaHubTabText, activeVaultTab === "docs" && styles.mediaHubTabTextActive]}>Docs</Text>
              </TouchableOpacity>
            </View>
            {selectedVaultMediaUri && (
              <View style={styles.lightboxOverlay}>
                <Image source={{ uri: selectedVaultMediaUri }} style={styles.lightboxImage} resizeMode="contain" />
                <TouchableOpacity style={styles.lightboxCloseBtn} onPress={() => setSelectedVaultMediaUri(null)}>
                  <Text style={styles.lightboxCloseText}>✕ Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>
        </Modal>

        {/* Theme / Wallpaper Preview Modal */}
        <Modal 
          visible={showThemePreview} 
          animationType="slide" 
          transparent={false}
          onRequestClose={handleCancelTheme}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: "#111827" }}>
            {/* Preview Header */}
            <View style={{ 
              flexDirection: "row", 
              alignItems: "center", 
              paddingVertical: 14, 
              paddingHorizontal: 16, 
              backgroundColor: "#1F2937", 
              justifyContent: "space-between",
              borderBottomWidth: 0.5,
              borderBottomColor: "#374151"
            }}>
              <TouchableOpacity onPress={handleCancelTheme} style={{ padding: 4 }}>
                <ArrowLeft size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "#FFF" }}>Wallpaper Preview</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Simulated Chat Window Preview Container */}
            <View style={{ 
              flex: 1, 
              backgroundColor: previewBgType === "color" ? previewColorHex : "#F3F4F6", 
              justifyContent: "center", 
              padding: 16 
            }}>
              {previewBgType === "image" && previewImageUri && (
                <Image 
                  source={{ uri: previewImageUri }} 
                  style={{ 
                    position: "absolute", 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0 
                  }} 
                  resizeMode="cover" 
                />
              )}

              {/* Mock Chat History */}
              <View style={{ gap: 16, width: "100%" }}>
                {/* Left Opponent Bubble */}
                <View style={{ 
                  alignSelf: "flex-start", 
                  backgroundColor: previewBgType === "color" && BUBBLE_THEMES_PREVIEW[previewColorId] 
                    ? BUBBLE_THEMES_PREVIEW[previewColorId].otherBubbleBg 
                    : "#FFFFFF", 
                  padding: 12, 
                  borderRadius: 12, 
                  borderBottomLeftRadius: 4, 
                  maxWidth: "80%",
                  borderWidth: 0.5,
                  borderColor: "#E5E7EB"
                }}>
                  <Text style={{ 
                    fontSize: 14, 
                    color: previewBgType === "color" && BUBBLE_THEMES_PREVIEW[previewColorId] 
                      ? BUBBLE_THEMES_PREVIEW[previewColorId].otherText 
                      : "#1F2937" 
                  }}>
                    Hey there! How do you like this wallpaper style?
                  </Text>
                  <Text style={{ 
                    fontSize: 9, 
                    color: "#9CA3AF", 
                    alignSelf: "flex-end", 
                    marginTop: 4 
                  }}>
                    10:00 AM
                  </Text>
                </View>

                {/* Right My Bubble */}
                <View style={{ 
                  alignSelf: "flex-end", 
                  backgroundColor: previewBgType === "color" && BUBBLE_THEMES_PREVIEW[previewColorId] 
                    ? BUBBLE_THEMES_PREVIEW[previewColorId].myBubbleBg 
                    : "#DCF8C6", 
                  padding: 12, 
                  borderRadius: 12, 
                  borderBottomRightRadius: 4, 
                  maxWidth: "80%"
                }}>
                  <Text style={{ 
                    fontSize: 14, 
                    color: previewBgType === "color" && BUBBLE_THEMES_PREVIEW[previewColorId] 
                      ? BUBBLE_THEMES_PREVIEW[previewColorId].myText 
                      : "#1C2E1A" 
                  }}>
                    Wow, this looks really beautiful and premium!
                  </Text>
                  <Text style={{ 
                    fontSize: 9, 
                    color: "rgba(0,0,0,0.4)", 
                    alignSelf: "flex-end", 
                    marginTop: 4 
                  }}>
                    10:01 AM
                  </Text>
                </View>
              </View>
            </View>

            {/* Selector panel inside the modal */}
            <View style={{ 
              backgroundColor: "#1F2937", 
              paddingTop: 14, 
              paddingBottom: 4,
              paddingHorizontal: 16,
              borderTopWidth: 1,
              borderTopColor: "#374151"
            }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF", marginBottom: 8, letterSpacing: 0.5 }}>
                CHOOSE CHAT WALLPAPER & THEME
              </Text>
              
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
                {/* Custom Gallery Button */}
                <TouchableOpacity 
                  onPress={handlePickImage} 
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#374151",
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 8,
                    gap: 6
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 16 }}>📷</Text>
                  <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "600" }}>Gallery</Text>
                </TouchableOpacity>

                {/* Solid Colors Roll */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                  {COLOR_THEMES.map((theme) => {
                    const isCurrentColorActive = previewBgType === "color" && previewColorId === theme.id;
                    return (
                      <TouchableOpacity
                        key={theme.id}
                        onPress={() => {
                          setPreviewBgType("color");
                          setPreviewColorId(theme.id);
                          setPreviewColorHex(theme.color);
                          setPreviewImageUri(null);
                        }}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: theme.color,
                          marginRight: 8,
                          justifyContent: "center",
                          alignItems: "center",
                          borderWidth: isCurrentColorActive ? 2.5 : 0.5,
                          borderColor: isCurrentColorActive ? "#10B981" : "#4B5563"
                        }}
                        activeOpacity={0.8}
                      >
                        {isCurrentColorActive && (
                          <Text style={{ color: theme.id === "bg_dark" ? "#FFF" : "#075E54", fontSize: 12, fontWeight: "bold" }}>✓</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Bottom Actions Bar */}
            <View style={{ 
              flexDirection: "row", 
              backgroundColor: "#1F2937", 
              paddingVertical: 16, 
              paddingHorizontal: 20, 
              gap: 12 
            }}>
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  paddingVertical: 12, 
                  borderRadius: 8, 
                  borderWidth: 1, 
                  borderColor: "#374151", 
                  alignItems: "center" 
                }} 
                onPress={handleCancelTheme}
              >
                <Text style={{ color: "#9CA3AF", fontWeight: "bold" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  backgroundColor: "#10B981", 
                  paddingVertical: 12, 
                  borderRadius: 8, 
                  alignItems: "center" 
                }} 
                onPress={handleApplyTheme}
              >
                <Text style={{ color: "#FFF", fontWeight: "bold" }}>Apply Wallpaper</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>

        {selectedVaultMediaUri && (
          <View style={styles.lightboxOverlay}>
            <Image source={{ uri: selectedVaultMediaUri }} style={styles.lightboxImage} resizeMode="contain" />
            <TouchableOpacity style={styles.lightboxCloseBtn} onPress={() => setSelectedVaultMediaUri(null)}>
              <Text style={styles.lightboxCloseText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
        )}
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

  // WhatsApp Profile details card styles
  profileDetailsSection: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    marginTop: 16,
  },
  profileAvatarWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: "hidden",
    marginBottom: 12,
  },
  profileAvatarImage: {
    width: "100%",
    height: "100%",
  },
  profileAvatarPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  profileAvatarInitials: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
  },
  profileNameText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212121",
    marginBottom: 4,
  },
  profileUsernameText: {
    fontSize: 13,
    color: "#546E7A",
    fontWeight: "600",
    marginBottom: 8,
  },
  profileStatusText: {
    fontSize: 14,
    color: "#78909C",
    textAlign: "center",
    lineHeight: 18,
    fontStyle: "italic",
  },

  // Media Vault tab selector
  vaultTabSelector: {
    flexDirection: "row",
    backgroundColor: "#ECEFF1",
    borderRadius: 10,
    padding: 3,
    marginBottom: 8,
    marginHorizontal: 12,
  },
  vaultTabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  vaultTabItemActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  vaultTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#546E7A",
  },
  vaultTabTextActive: {
    color: "#075E54",
  },

  // Media Vault Styles
  mediaVaultContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: 12,
  },
  emptyMediaBlock: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyMediaText: {
    fontSize: 13,
    color: "#78909C",
    textAlign: "center",
  },
  mediaHorizontalScroll: {
    gap: 8,
  },
  mediaVaultCard: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ECEFF1",
  },
  mediaVaultImage: {
    width: "100%",
    height: "100%",
  },
  mediaVaultPlaceholderCard: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  mediaPlaceholderLabel: {
    fontSize: 10,
    color: "#37474F",
    marginTop: 4,
    fontWeight: "500",
    textAlign: "center",
  },
  
  // Lightbox Styles
  lightboxOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999,
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

  // Media Hub Grid and Lists Styles
  mediaGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 8,
  },
  mediaGridCard: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ECEFF1",
  },
  mediaGridImage: {
    width: "100%",
    height: "100%",
  },
  mediaGridPlaceholderCard: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 6,
  },
  linkListRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  linkIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
  },
  linkLabel: {
    fontSize: 14,
    color: "#0D47A1",
    fontWeight: "500",
  },
  linkDate: {
    fontSize: 11,
    color: "#78909C",
    marginTop: 4,
  },
  docListRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  docIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  docLabel: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "500",
  },
  docDate: {
    fontSize: 11,
    color: "#78909C",
    marginTop: 4,
  },
  mediaHubBottomTabs: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#CFD8DC",
    backgroundColor: "#FFFFFF",
    height: 56,
    alignItems: "center",
    justifyContent: "space-around",
  },
  mediaHubTabItem: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  mediaHubTabItemActive: {
    backgroundColor: "#E8F5E9",
  },
  mediaHubTabText: {
    fontSize: 14,
    color: "#546E7A",
    fontWeight: "600",
  },
  mediaHubTabTextActive: {
    color: "#075E54",
  },
});