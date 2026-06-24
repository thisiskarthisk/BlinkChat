import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/hooks/use-theme";
import Slider from "@react-native-community/slider";
import { Audio, ResizeMode, Video } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import * as Sharing from "expo-sharing";
import {
  Download,
  ExternalLink,
  Mic,
  Pause,
  Phone,
  Play,
  StopCircle,
  X
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Clipboard,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import ChatSettingsModal from "../../components/ChatSettingsModal";
import {
  clearChat,
  getChatDetails,
  updateChatSettings,
  updateMemberSettings
} from "../../services/chatService";
import { blockUser, getAcceptedFriends } from "../../services/friendService";
import { sendPushForMessage } from "../../services/pushNotificationService";
import { getCachedMessages, saveCachedMessages } from "../../services/storageService";


// ─── Local Caching ──────────────────────────────────────────

const CHAT_MEDIA_DIR = `${FileSystem.documentDirectory}chat-media/`;

async function ensureMediaDir() {
  const dirInfo = await FileSystem.getInfoAsync(CHAT_MEDIA_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CHAT_MEDIA_DIR, { intermediates: true });
  }
}

async function getLocalMediaUri(remoteUrl: string, mediaPath: string) {
  if (Platform.OS === "web") {
    return remoteUrl;
  }
  if (!mediaPath) return remoteUrl;
  try {
    await ensureMediaDir();
    const fileName = mediaPath.split("/").pop();
    const localUri = `${CHAT_MEDIA_DIR}${fileName}`;
    
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo.exists) return localUri;
    
    const downloadUrl = remoteUrl.startsWith("http")
      ? remoteUrl
      : supabase.storage.from("chat-media").getPublicUrl(mediaPath).data.publicUrl;

    const { uri } = await FileSystem.downloadAsync(downloadUrl, localUri);
    return uri;
  } catch (e) {
    console.log("getLocalMediaUri error, falling back to remoteUrl:", e);
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

const triggerWebDownload = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename || "file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.error("Web download error, falling back to window.open:", error);
    window.open(url, "_blank");
  }
};

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

// Helper to convert Base64 string to ArrayBuffer (for mobile uploads)
import { decode as decodeBase64 } from "base64-arraybuffer";
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  return decodeBase64(base64);
}

async function uploadToStorage(
  uri: string,
  mimeType: string,
  folder: string
): Promise<{ url: string; path: string }> {
  let ext = "bin";
  if (mimeType.includes("image/jpeg") || mimeType.includes("image/jpg")) {
    ext = "jpg";
  } else if (mimeType.includes("image/png")) {
    ext = "png";
  } else if (mimeType.includes("image/gif")) {
    ext = "gif";
  } else if (mimeType.includes("video/mp4")) {
    ext = "mp4";
  } else if (mimeType.includes("audio/mp4") || mimeType.includes("audio/m4a")) {
    ext = "m4a";
  } else if (mimeType.includes("audio/webm")) {
    ext = "webm";
  } else if (mimeType.includes("audio/ogg")) {
    ext = "ogg";
  } else if (mimeType.includes("audio/wav") || mimeType.includes("audio/x-wav")) {
    ext = "wav";
  } else {
    const parts = uri.split(".");
    const candidate = parts[parts.length - 1]?.split("?")[0] || "";
    if (candidate && /^[a-zA-Z0-9]{2,5}$/.test(candidate)) {
      ext = candidate;
    }
  }
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  let uploadBody: any;
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    uploadBody = await response.blob();
  } else {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
    uploadBody = base64ToArrayBuffer(base64);
  }

  const { error } = await supabase.storage
    .from("chat-media")
    .upload(path, uploadBody, { contentType: mimeType, upsert: false });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
  return { url: data.publicUrl, path };
}

// ─── Message Bubble ─────────────────────────────────────────
function VoiceMessagePlayer({
  uri,
  isMine,
  onPress,
}: {
  uri: string;
  isMine: boolean;
  onPress?: () => void;
}) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const isSliding = useRef(false);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  const formatTime = (millis: number) => {
    const sec = Math.floor(millis / 1000);
    const min = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${min}:${String(rem).padStart(2, "0")}`;
  };

  const playbackUpdate = useCallback(async (status: any) => {
    if (!status.isLoaded) return;

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPosition(0);
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(0);
      }
    } else {
      if (!isSliding.current) {
        setPosition(status.positionMillis);
      }
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);
    }
  }, []);

  const playPause = async () => {
    try {
      if (!sound) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          {
            shouldPlay: true,
            rate: speed,
            shouldCorrectPitch: true,
          },
          playbackUpdate
        );
        soundRef.current = newSound;
        setSound(newSound);
        setIsPlaying(true);
        return;
      }

      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;

      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        // If it was finished, restart from 0
        if (status.positionMillis >= (status.durationMillis || 0)) {
          await sound.playFromPositionAsync(0);
        } else {
          await sound.playAsync();
        }
        setIsPlaying(true);
      }
    } catch (e) {
      console.log("playPause error:", e);
    }
  };

  const seekAudio = async (value: number) => {
    if (!sound) return;
    await sound.setPositionAsync(value);
    setPosition(value);
  };

  const onSlidingStart = () => {
    isSliding.current = true;
  };

  const onSlidingComplete = async (value: number) => {
    isSliding.current = false;
    await seekAudio(value);
  };

  const changeSpeed = async () => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (sound) {
      await sound.setRateAsync(next, true);
    }
  };

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  return (
    <View
      style={{
        width: 250,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={playPause}
          style={{
            width: 32,
            height: 32,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {isPlaying ? (
            <Pause size={22} color={isMine ? "#FFF" : "#2563EB"} />
          ) : (
            <Play size={22} color={isMine ? "#FFF" : "#2563EB"} />
          )}
        </TouchableOpacity>

        <Slider
          style={{
            flex: 1,
            marginHorizontal: 10,
          }}
          minimumValue={0}
          maximumValue={duration}
          value={position}
          onSlidingStart={onSlidingStart}
          onSlidingComplete={onSlidingComplete}
          minimumTrackTintColor={isMine ? "#FFF" : "#2563EB"}
          maximumTrackTintColor={isMine ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.1)"}
          thumbTintColor={isMine ? "#FFF" : "#2563EB"}
        />

        <TouchableOpacity
          onPress={changeSpeed}
        >
          <View
            style={{
              backgroundColor: "#6B7280",
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 3,
            }}
          >
            <Text
              style={{
                color: "#FFF",
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {speed}x
            </Text>
          </View>
        </TouchableOpacity>

        {onPress && (
          <TouchableOpacity
            onPress={onPress}
            style={{
              marginLeft: 10,
              padding: 4,
            }}
          >
            <Download size={18} color={isMine ? "#FFF" : "#2563EB"} />
          </TouchableOpacity>
        )}
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent:
            "space-between",
          marginTop: 4,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            color: isMine
              ? "#FFF"
              : "#666",
          }}
        >
          {formatTime(position)}
        </Text>

        <Text
          style={{
            fontSize: 11,
            color: isMine
              ? "#FFF"
              : "#666",
          }}
        >
          {formatTime(duration)}
        </Text>
      </View>
    </View>
  );
}


const BUBBLE_THEMES: Record<string, {
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

function parseMessageContent(rawMessage: string, messageType: string) {
  let isForwarded = false;
  let replyInfo = null;
  let cleanMessage = rawMessage || "";
  let caption = "";

  if (cleanMessage.startsWith("|||forwarded:true|||")) {
    isForwarded = true;
    cleanMessage = cleanMessage.substring("|||forwarded:true|||".length);
  }

  if (cleanMessage.startsWith("|||reply_id:")) {
    const parts = cleanMessage.split("|||");
    let replyId = "";
    let replyText = "";
    let replyType = "text";
    let replySender = "";
    for (let i = 1; i < parts.length - 1; i++) {
      if (parts[i].startsWith("reply_id:")) replyId = parts[i].substring("reply_id:".length);
      if (parts[i].startsWith("reply_text:")) replyText = parts[i].substring("reply_text:".length);
      if (parts[i].startsWith("reply_type:")) replyType = parts[i].substring("reply_type:".length);
      if (parts[i].startsWith("reply_sender:")) replySender = parts[i].substring("reply_sender:".length);
    }
    replyInfo = { id: replyId, text: replyText, type: replyType, sender: replySender };
    cleanMessage = parts[parts.length - 1];
  }

  if (messageType !== "text" && messageType !== "location" && messageType !== "live_location") {
    if (cleanMessage.includes("|||caption:")) {
      const idx = cleanMessage.indexOf("|||caption:");
      caption = cleanMessage.substring(idx + "|||caption:".length);
      cleanMessage = cleanMessage.substring(0, idx);
    }
  }

  return { isForwarded, replyInfo, cleanMessage, caption };
}

function MessageBubble({
  item,
  isMine,
  onMediaPress,
  otherUserAvatarUrl,
  otherUserName,
  themeId,
  bgType,
  onReply,
  onLongPress,
  onReplyClick,
  multiSelectMode,
  isSelected,
  onToggleSelect,
}: {
  item: any;
  isMine: boolean;
  onMediaPress: (uri: string, type: "image" | "video" | "file" | "audio", fileName?: string) => void;
  otherUserAvatarUrl?: string;
  otherUserName?: string;
  themeId?: string;
  bgType?: "color" | "image";
  onReply: (message: any) => void;
  onLongPress: (message: any) => void;
  onReplyClick: (replyId: string) => void;
  multiSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect: (msgId: string) => void;
}) {
  const type: string = item.message_type || "text";
  const [localUri, setLocalUri] = useState<string | null>(null);

  const { isForwarded, replyInfo, cleanMessage, caption } = parseMessageContent(item.message, type);
  const baseMessage = cleanMessage;

  useEffect(() => {
    if (type !== "text" && type !== "location" && type !== "live_location") {
      loadLocal();
    }
  }, [baseMessage, item.media_path]);

  const loadLocal = async () => {
    try {
      const uri = await getLocalMediaUri(baseMessage, item.media_path);
      if (uri) {
        setLocalUri(uri);
      }
    } catch (e) {
      console.log("loadLocal error:", e);
    }
  };

  const activeThemeId = themeId && BUBBLE_THEMES[themeId] ? themeId : (bgType === "image" ? "bg_whatsapp" : "bg_default");
  const theme = BUBBLE_THEMES[activeThemeId] || BUBBLE_THEMES.bg_default;

  const swipeAnim = React.useRef(new Animated.Value(0)).current;

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (multiSelectMode) return false;
        return Math.abs(gestureState.dx) > 15 && gestureState.dx > 0 && Math.abs(gestureState.dy) < 8;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0 && gestureState.dx < 80) {
          swipeAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 45) {
          onReply(item);
        }
        Animated.spring(swipeAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const handleLocationPress = (coordsString: string) => {
    const [lat, lng] = coordsString.split(",");
    if (!lat || !lng) return;
    
    const scheme = Platform.select({
      ios: `maps://?q=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}`
    });
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    
    Alert.alert(
      "Open Location",
      "How would you like to view this location?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Google Maps", onPress: () => Linking.openURL(googleMapsUrl) },
        Platform.OS === "ios" ? { text: "Apple Maps", onPress: () => Linking.openURL(scheme!) } : { text: "Default Maps App", onPress: () => Linking.openURL(scheme!) }
      ].filter(Boolean) as any
    );
  };

  if (type !== "text" && type !== "location" && type !== "live_location" && !localUri) {
    return (
      <View style={[styles.msgContainer, isMine ? styles.myContainer : styles.otherContainer]}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", maxWidth: "100%" }}>
          {!isMine && (
            <View style={{ marginRight: 8, marginBottom: 2 }}>
              {otherUserAvatarUrl ? (
                <Image source={{ uri: otherUserAvatarUrl }} style={{ width: 28, height: 28, borderRadius: 14 }} />
              ) : (
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#3B82F6", justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "700" }}>
                    {((otherUserName || "U")[0] || "U").toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}
          <View style={[
            styles.bubble,
            isMine ? { backgroundColor: theme.myBubbleBg } : { backgroundColor: theme.otherBubbleBg }
          ]}>
            <ActivityIndicator size="small" color={isMine ? "#FFF" : "#2563EB"} />
          </View>
        </View>
      </View>
    );
  }

  const displayUri = localUri || baseMessage;
  const isBroadcast = type === "text" && item.message?.startsWith("⚠️ IMPORTANT UPDATE");

  return (
    <View style={[
      styles.msgContainer,
      isBroadcast ? styles.broadcastContainer : (isMine ? styles.myContainer : styles.otherContainer),
      isSelected && { backgroundColor: "rgba(37, 99, 235, 0.15)" }
    ]}>
      <Animated.View 
        {...panResponder.panHandlers}
        style={{ 
          transform: [{ translateX: swipeAnim }], 
          flexDirection: "row", 
          alignItems: "flex-end", 
          width: "100%",
          justifyContent: isMine ? "flex-end" : "flex-start"
        }}
      >
        {multiSelectMode && (
          <TouchableOpacity 
            onPress={() => onToggleSelect(item.id)} 
            style={{ 
              marginRight: 8, 
              alignSelf: "center", 
              width: 18, 
              height: 18, 
              borderRadius: 9, 
              borderWidth: 1.5, 
              borderColor: isSelected ? "#2563EB" : "#9CA3AF", 
              backgroundColor: isSelected ? "#2563EB" : "transparent",
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            {isSelected && <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "bold" }}>✓</Text>}
          </TouchableOpacity>
        )}

        {!isMine && !isBroadcast && (
          <View style={{ marginRight: 8, marginBottom: 2 }}>
            {otherUserAvatarUrl ? (
              <Image source={{ uri: otherUserAvatarUrl }} style={{ width: 28, height: 28, borderRadius: 14 }} />
            ) : (
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#3B82F6", justifyContent: "center", alignItems: "center" }}>
                <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "700" }}>
                  {((otherUserName || "U")[0] || "U").toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        )}
        
        <TouchableOpacity
          activeOpacity={multiSelectMode ? 0.8 : 1}
          onPress={() => {
            if (multiSelectMode) {
              onToggleSelect(item.id);
            }
          }}
          onLongPress={() => {
            if (!multiSelectMode) {
              onLongPress(item);
            }
          }}
          style={[
            styles.bubble,
            isBroadcast ? styles.broadcastBubble : (isMine ? {
              backgroundColor: theme.myBubbleBg,
              borderBottomRightRadius: 4,
              borderBottomLeftRadius: 12,
            } : {
              backgroundColor: theme.otherBubbleBg,
              borderBottomRightRadius: 12,
              borderBottomLeftRadius: 4,
              borderWidth: theme.otherBorder ? 0.5 : 0,
              borderColor: theme.otherBorder,
            })
          ]}
        >
          {isForwarded && (
            <Text style={{ 
              fontSize: 10, 
              fontStyle: "italic", 
              color: isMine ? "rgba(255,255,255,0.7)" : "#6B7280", 
              marginBottom: 4 
            }}>
              ↗ Forwarded
            </Text>
          )}

          {replyInfo && (
            <TouchableOpacity 
              activeOpacity={0.8}
              style={{ 
                backgroundColor: isMine ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.05)", 
                borderLeftWidth: 3, 
                borderLeftColor: isMine ? "#FFF" : "#2563EB", 
                padding: 6, 
                borderRadius: 4, 
                marginBottom: 6 
              }}
              onPress={() => onReplyClick(replyInfo.id)}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: isMine ? "#FFF" : "#2563EB" }}>
                {replyInfo.sender}
              </Text>
              <Text style={{ fontSize: 11, color: isMine ? "rgba(255,255,255,0.8)" : "#4B5563" }} numberOfLines={1}>
                {replyInfo.type === "text" ? replyInfo.text : `[${replyInfo.type}]`}
              </Text>
            </TouchableOpacity>
          )}

          {type === "image" && (
            <TouchableOpacity onPress={() => onMediaPress(displayUri, "image")}>
              <Image
                source={{ uri: displayUri }}
                style={styles.msgImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}

          {isAudioMessage(item) && (
            <VoiceMessagePlayer
              uri={displayUri}
              isMine={isMine}
              onPress={() => onMediaPress(displayUri, "audio", item.file_name || "audio.mp3")}
            />
          )}

          {type === "video" && (
            <TouchableOpacity onPress={() => onMediaPress(displayUri, "video")}>
              <View style={styles.videoCard}>
                {/* Play Button Overlay */}
                <View style={styles.videoPlayOverlay}>
                  <View style={styles.videoPlayBtn}>
                    <Play size={18} color="#2563EB" fill="#2563EB" style={{ marginLeft: 2 }} />
                  </View>
                </View>
                {/* Bottom Title Bar */}
                <View style={styles.videoCardTitleBar}>
                  <Text style={styles.videoCardTitle} numberOfLines={1}>
                    🎥 Video Message
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {type === "file" && !isAudioMessage(item) && (
            <TouchableOpacity onPress={() => onMediaPress(displayUri, "file", item.file_name)}>
              <View style={[
                styles.fileCard,
                isMine ? styles.myFileCard : styles.otherFileCard
              ]}>
                <View style={styles.fileCardIconContainer}>
                  <Text style={styles.fileCardIcon}>📄</Text>
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.fileCardName, isMine ? styles.myText : styles.otherText]} numberOfLines={1}>
                    {item.file_name || "Document"}
                  </Text>
                  <Text style={[styles.fileCardSize, isMine ? styles.myTime : styles.otherTime]}>
                    Click to Open • File
                  </Text>
                </View>
                <View style={styles.fileCardDownloadIcon}>
                  <Download size={16} color={isMine ? "#FFF" : "#2563EB"} />
                </View>
              </View>
            </TouchableOpacity>
          )}

          {(type === "location" || type === "live_location") && (
            <TouchableOpacity onPress={() => handleLocationPress(cleanMessage)}>
              <View style={[
                styles.locationCard,
                isMine ? styles.myLocationCard : styles.otherLocationCard
              ]}>
                {/* Visual Map Grid Design */}
                <View style={styles.locationMapGrid}>
                  <Text style={{ fontSize: 28 }}>📍</Text>
                </View>
                <View style={styles.locationCardFooter}>
                  <View style={{ flex: 1, marginRight: 4 }}>
                    <Text style={[styles.locationTitle, isMine ? styles.myLocationText : styles.otherLocationText]} numberOfLines={1}>
                      {type === "live_location" ? "🟢 Live Location" : "Shared Location"}
                    </Text>
                    <Text style={[styles.locationSubtitle, isMine ? styles.myTime : styles.otherTime]}>
                      Tap to open in Map View
                    </Text>
                  </View>
                  <ExternalLink size={14} color={isMine ? "#FFF" : "#2563EB"} />
                </View>
              </View>
            </TouchableOpacity>
          )}

          {type === "text" && (
            <Text style={[
              styles.msgText, 
              isBroadcast ? styles.broadcastText : (isMine ? styles.myText : styles.otherText)
            ]}>
              {cleanMessage}
            </Text>
          )}

          {caption ? (
            <Text style={[
              styles.msgText, 
              isMine ? styles.myText : styles.otherText, 
              { marginTop: 6, fontWeight: "500" }
            ]}>
              {caption}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <Text style={[
              styles.msgTime, 
              isBroadcast ? styles.broadcastTime : (isMine ? styles.myTime : styles.otherTime)
            ]}>
              {formatTime(item.created_at)}
            </Text>
            {isMine && !isBroadcast && <TickIcon isSeen={item.is_seen} isDelivered={item.is_delivered} />}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Media Modal ─────────────────────────────────────────────

function getFileCategory(fileName?: string): "image" | "video" | "audio" | "file" {
  if (!fileName) return "file";
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) return "file";
  
  const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "heic", "heif"];
  const videoExts = ["mp4", "mov", "m4v", "avi", "mkv", "webm", "3gp", "mpeg", "mpg"];
  const audioExts = ["mp3", "wav", "m4a", "aac", "ogg", "webm", "mpga", "flac", "amr"];
  
  if (imageExts.includes(ext)) return "image";
  if (videoExts.includes(ext)) return "video";
  if (audioExts.includes(ext)) return "audio";
  return "file";
}

function MediaModal({
  visible,
  onClose,
  uri,
  type,
  fileName,
}: {
  visible: boolean;
  onClose: () => void;
  uri: string;
  type: "image" | "video" | "file" | "audio";
  fileName?: string;
}) {
  const [loading, setLoading] = useState(true);

  const resolvedType = type === "file" ? getFileCategory(fileName) : type;

  const handleShare = async () => {
    try {
      if (Platform.OS === "web") {
        const name = fileName || uri.split("/").pop() || "file";
        await triggerWebDownload(uri, name);
        return;
      }
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Error", "Sharing is not available on this device");
        return;
      }
      await Sharing.shareAsync(uri);
    } catch (e) {
      console.log("Sharing error:", e);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <X color="#FFF" size={28} />
          </TouchableOpacity>
          <Text style={styles.modalTitle} numberOfLines={1}>
            {resolvedType === "file" || resolvedType === "audio" ? fileName : resolvedType.charAt(0).toUpperCase() + resolvedType.slice(1)}
          </Text>
          <TouchableOpacity onPress={handleShare} style={styles.modalShareBtn}>
            <Download color="#FFF" size={24} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.modalContent}>
          {resolvedType === "image" && (
            <Image
              source={{ uri }}
              style={styles.fullImage}
              resizeMode="contain"
              onLoadEnd={() => setLoading(false)}
            />
          )}

          {resolvedType === "video" && (
            <Video
              source={{ uri }}
              rate={1.0}
              volume={1.0}
              isMuted={false}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              useNativeControls
              style={styles.fullVideo}
              onLoad={() => setLoading(false)}
            />
          )}

          {resolvedType === "audio" && (
            <View style={{ alignItems: "center", justifyContent: "center", padding: 24, width: "100%" }}>
              <Text style={{ fontSize: 64, marginBottom: 20 }}>🎵</Text>
              <Text style={[styles.fileNameLarge, { color: "#FFF", textAlign: "center", marginBottom: 30 }]} numberOfLines={2}>
                {fileName || "Audio File"}
              </Text>
              <View style={{
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                borderRadius: 20,
                paddingHorizontal: 20,
                paddingVertical: 24,
                width: 290,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.25)"
              }}>
                <VoiceMessagePlayer uri={uri} isMine={true} />
              </View>
            </View>
          )}

          {resolvedType === "file" && (
            <View style={styles.filePreview}>
              <Text style={styles.fileIconLarge}>📄</Text>
              <Text style={styles.fileNameLarge}>{fileName}</Text>
              <TouchableOpacity style={styles.openFileBtn} onPress={handleShare}>
                <ExternalLink color="#FFF" size={20} />
                <Text style={styles.openFileText}>Open / Save File</Text>
              </TouchableOpacity>
            </View>
          )}

          {loading && resolvedType !== "file" && resolvedType !== "audio" && (
            <ActivityIndicator
              size="large"
              color="#FFF"
              style={StyleSheet.absoluteFill}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function BouncingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -6,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.delay(300),
        ])
      );
    };

    const anim1 = createAnimation(dot1, 0);
    const anim2 = createAnimation(dot2, 150);
    const anim3 = createAnimation(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  return (
    <View style={styles.dotsRow}>
      <Animated.Text style={[styles.dotText, { transform: [{ translateY: dot1 }] }]}>•</Animated.Text>
      <Animated.Text style={[styles.dotText, { transform: [{ translateY: dot2 }] }]}>•</Animated.Text>
      <Animated.Text style={[styles.dotText, { transform: [{ translateY: dot3 }] }]}>•</Animated.Text>
    </View>
  );
}

function SoundwaveIndicator() {
  const bar1 = useRef(new Animated.Value(3)).current;
  const bar2 = useRef(new Animated.Value(3)).current;
  const bar3 = useRef(new Animated.Value(3)).current;
  const bar4 = useRef(new Animated.Value(3)).current;

  useEffect(() => {
    const createAnimation = (bar: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(bar, {
            toValue: 15,
            duration: 250,
            useNativeDriver: false,
          }),
          Animated.timing(bar, {
            toValue: 3,
            duration: 250,
            useNativeDriver: false,
          }),
        ])
      );
    };

    const anim1 = createAnimation(bar1, 0);
    const anim2 = createAnimation(bar2, 100);
    const anim3 = createAnimation(bar3, 200);
    const anim4 = createAnimation(bar4, 300);

    anim1.start();
    anim2.start();
    anim3.start();
    anim4.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
      anim4.stop();
    };
  }, []);

  return (
    <View style={styles.soundwaveRow}>
      <Animated.View style={[styles.soundwaveBar, { height: bar1 }]} />
      <Animated.View style={[styles.soundwaveBar, { height: bar2 }]} />
      <Animated.View style={[styles.soundwaveBar, { height: bar3 }]} />
      <Animated.View style={[styles.soundwaveBar, { height: bar4 }]} />
    </View>
  );
}
// ─── Web Audio WAV Recorder Helpers ──────────────────────────
let webAudioContext: any = null;
let webMediaStream: MediaStream | null = null;
let webMediaStreamSource: any = null;
let webRecorderProcessor: any = null;
let webAudioChunks: Float32Array[] = [];
let webRecordingLength = 0;
let webSampleRate = 44100;

async function startWebRecording() {
  webAudioChunks = [];
  webRecordingLength = 0;
  
  webMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
  webAudioContext = new AudioContextClass();
  webSampleRate = webAudioContext.sampleRate;
  
  webMediaStreamSource = webAudioContext.createMediaStreamSource(webMediaStream);
  webRecorderProcessor = webAudioContext.createScriptProcessor(4096, 1, 1);
  
  webRecorderProcessor.onaudioprocess = (e: any) => {
    const chunk = e.inputBuffer.getChannelData(0);
    webAudioChunks.push(new Float32Array(chunk));
    webRecordingLength += chunk.length;
  };
  
  webMediaStreamSource.connect(webRecorderProcessor);
  webRecorderProcessor.connect(webAudioContext.destination);
}

function stopWebRecording(): string {
  if (webRecorderProcessor) {
    webRecorderProcessor.disconnect();
    webRecorderProcessor.onaudioprocess = null;
  }
  if (webMediaStreamSource) {
    webMediaStreamSource.disconnect();
  }
  if (webMediaStream) {
    webMediaStream.getTracks().forEach((track) => track.stop());
  }
  if (webAudioContext) {
    webAudioContext.close();
  }
  
  const mergedBuffer = new Float32Array(webRecordingLength);
  let offset = 0;
  for (const chunk of webAudioChunks) {
    mergedBuffer.set(chunk, offset);
    offset += chunk.length;
  }
  
  const buffer = new ArrayBuffer(44 + webRecordingLength * 2);
  const view = new DataView(buffer);
  
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + webRecordingLength * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, webSampleRate, true);
  view.setUint32(28, webSampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, webRecordingLength * 2, true);
  
  let index = 44;
  for (let i = 0; i < mergedBuffer.length; i++) {
    let sample = mergedBuffer[i];
    sample = Math.max(-1, Math.min(1, sample));
    view.setInt16(index, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    index += 2;
  }
  
  const blob = new Blob([view], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// ─── Main Screen ─────────────────────────────────────────────

export default function ChatScreen() {
  const { colors } = useTheme();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [isOpponentTyping, setIsOpponentTyping] = useState(false);
  const [isOpponentRecording, setIsOpponentRecording] = useState(false);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<any>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const broadcastChRef = useRef<any>(null);

  // Media Modal State
  const [selectedMedia, setSelectedMedia] = useState<{
    uri: string;
    type: "image" | "video" | "file" | "audio";
    fileName?: string;
  } | null>(null);

  // Pending media selection for Caption Send
  const [pendingMedia, setPendingMedia] = useState<{ uri: string; mimeType: string; type: "image" | "video" | "file" | "audio"; fileName?: string } | null>(null);

  // Block State
  const [isBlocked, setIsBlocked] = useState(false); // Have I blocked them?
  const [amIBlocked, setAmIBlocked] = useState(false); // Have they blocked me?

  // Chat feature extensions
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null);
  const [selectedMenuMessage, setSelectedMenuMessage] = useState<any | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messagesToForward, setMessagesToForward] = useState<any[]>([]);
  const [deletedForMeIds, setDeletedForMeIds] = useState<string[]>([]);
  const [friendsList, setFriendsList] = useState<any[]>([]);

  const handleMediaPress = (uri: string, type: "image" | "video" | "file" | "audio", fileName?: string) => {
    setSelectedMedia({ uri, type, fileName });
  };

  const handleReplyClick = (replyId: string) => {
    const index = messages.findIndex((m) => m.id.toString() === replyId.toString());
    if (index !== -1) {
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }
  };

  const checkBlockStatus = useCallback(async () => {
    if (!user?.id || !otherUser?.id) return;
    
    // Check if I blocked them
    const { data: iBlocked } = await supabase
      .from("blocked_users")
      .select("*")
      .eq("blocker_id", user.id)
      .eq("blocked_id", otherUser.id)
      .maybeSingle();
    
    // Check if they blocked me
    const { data: theyBlocked } = await supabase
      .from("blocked_users")
      .select("*")
      .eq("blocker_id", otherUser.id)
      .eq("blocked_id", user.id)
      .maybeSingle();

    setIsBlocked(!!iBlocked);
    setAmIBlocked(!!theyBlocked);
  }, [user?.id, otherUser?.id]);

  useEffect(() => {
    checkBlockStatus();
  }, [otherUser?.id]);

  const startRecording = async () => {
    try {
      if (Platform.OS === "web") {
        await startWebRecording();
        setIsRecording(true);
        setRecordDuration(0);
        timerRef.current = setInterval(() => {
          setRecordDuration((prev) => prev + 1);
        }, 1000) as any;

        // Broadcast recording status
        broadcastChRef.current?.send({
          type: "broadcast",
          event: "recording",
          payload: { isRecording: true, userId: user?.id },
        });
        return;
      }

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
      }, 1000) as any;

      // Broadcast recording status
      broadcastChRef.current?.send({
        type: "broadcast",
        event: "recording",
        payload: { isRecording: true, userId: user?.id },
      });
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  // const stopRecording = async () => {
  //   if (!recording) return;
    
  //   setIsRecording(false);
  //   if (timerRef.current) clearInterval(timerRef.current);
    
  //   try {
  //     await recording.stopAndUnloadAsync();
  //     const uri = recording.getURI();
  //     console.log("Recording stopped and saved at:", uri);
  //     if (uri) {
  //       await sendMedia(uri, "audio/mp4", "audio" , undefined , recordDuration);
  //     }
  //   } catch (err) {
  //     console.error("Failed to stop recording", err);
  //   }
  //   setRecording(null);
  // };

  const stopRecording = async () => {
    if (Platform.OS !== "web" && !recording) return;

    setIsRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Broadcast recording status
    broadcastChRef.current?.send({
      type: "broadcast",
      event: "recording",
      payload: { isRecording: false, userId: user?.id },
    });

    try {
      let uri: string | null = null;
      if (Platform.OS === "web") {
        uri = stopWebRecording();
      } else if (recording) {
        await recording.stopAndUnloadAsync();
        uri = recording.getURI();
      }

      console.log("Audio URI:", uri);

      if (uri) {
        if (Platform.OS !== "web") {
          const info = await FileSystem.getInfoAsync(uri);
          console.log("Audio file info:", info);
        }

        const mimeType = Platform.OS === "web" ? "audio/wav" : "audio/mp4";

        await sendMedia(
          uri,
          mimeType,
          "audio",
          undefined,
          recordDuration
        );
      }
    } catch (err) {
      console.log(err);
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
    id?: string;
  }>({ type: "color", value: "#EEF2FF", id: "bg_default" });

  const flatListRef = useRef<FlatList>(null);

  const loadBackgroundConfig = useCallback(async () => {
    if (!otherUser?.id || !user?.id) return;
    try {
      const type = await AsyncStorage.getItem(`chat_bg_type_${user.id}_${otherUser.id}`);
      if (type === "image") {
        const uri = await AsyncStorage.getItem(`chat_image_uri_${user.id}_${otherUser.id}`);
        if (uri) setBackgroundConfig({ type: "image", value: uri, id: "custom_image" });
      } else {
        const colorId = await AsyncStorage.getItem(`chat_color_id_${user.id}_${otherUser.id}`) || "bg_default";
        const hex = await AsyncStorage.getItem(`chat_color_hex_${user.id}_${otherUser.id}`);
        setBackgroundConfig({ type: "color", value: hex || "#EEF2FF", id: colorId });
      }
    } catch (e) {
      console.error("Load BG error:", e);
    }
  }, [user?.id, otherUser?.id]);

  useEffect(() => {
    if (otherUser && user) loadBackgroundConfig();
  }, [otherUser, user, loadBackgroundConfig, settingsVisible]);

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

  const loadFriendsAndLocalDeletes = useCallback(async () => {
    if (!user?.id) return;
    try {
      const friends = await getAcceptedFriends(user.id);
      setFriendsList(friends);

      const localDeletes = await AsyncStorage.getItem(`deleted_messages_${user.id}`);
      if (localDeletes) {
        setDeletedForMeIds(JSON.parse(localDeletes));
      }
    } catch (e) {
      console.error("loadFriendsAndLocalDeletes error:", e);
    }
  }, [user?.id]);

  useEffect(() => {
    loadChatDetails();
    loadFriendsAndLocalDeletes();
  }, [loadChatDetails, loadFriendsAndLocalDeletes]);

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

  const handleDeleteForMe = async (messageId: string) => {
    try {
      const newDeletedIds = [...deletedForMeIds, messageId];
      setDeletedForMeIds(newDeletedIds);
      await AsyncStorage.setItem(`deleted_messages_${user?.id}`, JSON.stringify(newDeletedIds));
      Alert.alert("Success", "Message deleted for you.");
    } catch (e) {
      console.error("handleDeleteForMe error:", e);
    }
  };

  const handleDeleteForEveryone = async (msgItem: any) => {
    try {
      const { error } = await supabase.from("messages").delete().eq("id", msgItem.id);
      if (error) throw error;
      
      // Also broadcast deletion event so opponent UI updates instantly
      broadcastChRef.current?.send({
        type: "broadcast",
        event: "message_delete",
        payload: { id: msgItem.id },
      });
      
      Alert.alert("Success", "Message deleted for everyone.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to delete message.");
    }
  };

  const handleCopyMessage = (text: string) => {
    Clipboard.setString(text);
    Alert.alert("Success", "Copied to clipboard.");
  };

  const handleForwardMessage = async (friendProfile: any) => {
    try {
      setShowForwardModal(false);
      setMultiSelectMode(false);
      setSelectedMessageIds([]);

      // 1. Find existing chat or create one
      const { data: myChats } = await supabase
        .from("chat_members")
        .select("chat_id")
        .eq("user_id", user?.id);

      const { data: friendChats } = await supabase
        .from("chat_members")
        .select("chat_id")
        .eq("user_id", friendProfile.id);

      let targetChatId = null;
      if (myChats && friendChats) {
        const myIds = myChats.map(c => c.chat_id);
        const match = friendChats.find(c => myIds.includes(c.chat_id));
        if (match) targetChatId = match.chat_id;
      }

      if (!targetChatId) {
        const { data: newChat, error: chatError } = await supabase
          .from("chats")
          .insert({})
          .select()
          .single();
        if (chatError) throw chatError;

        await supabase.from("chat_members").insert([
          { chat_id: newChat.id, user_id: user?.id },
          { chat_id: newChat.id, user_id: friendProfile.id },
        ]);
        targetChatId = newChat.id;
      }

      // 2. Loop and forward
      for (const msg of messagesToForward) {
        let originalContent = msg.message;
        if (originalContent.startsWith("|||forwarded:true|||")) {
          originalContent = originalContent.substring("|||forwarded:true|||".length);
        }
        if (originalContent.startsWith("|||reply_id:")) {
          const parts = originalContent.split("|||");
          originalContent = parts[parts.length - 1];
        }

        const finalContent = `|||forwarded:true|||${originalContent}`;

        await supabase.from("messages").insert({
          chat_id: targetChatId,
          sender_id: user?.id,
          message: finalContent,
          message_type: msg.message_type || "text",
          file_name: msg.file_name,
          media_path: msg.media_path,
          is_seen: false,
          is_delivered: false,
        });
      }

      Alert.alert("Success", "Messages forwarded successfully!");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to forward messages.");
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
    if (!id) return;
    
    // 1. Load local cache first for instant display
    const localMessages = await getCachedMessages(id as string);
    if (localMessages.length > 0) {
      setMessages(localMessages);
      scrollBottom();
    }

    // 2. Fetch from Supabase
    const { data: remoteMessages } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", id)
      .order("created_at", { ascending: true });
    
    if (remoteMessages) {
      // Merge cache and remote to avoid losing nightly deleted messages
      const mergedMap = new Map();
      localMessages.forEach((m) => mergedMap.set(m.id, m));
      remoteMessages.forEach((m) => mergedMap.set(m.id, m));
      
      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      setMessages(merged);
      await saveCachedMessages(id as string, merged);

      // Mark received messages as delivered
      const undelivered = remoteMessages.filter(m => m.sender_id !== user?.id && !m.is_delivered);
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

  // Automatically save messages state to local cache
  useEffect(() => {
    if (messages.length > 0 && id) {
      saveCachedMessages(id as string, messages);
    }
  }, [messages, id]);

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
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // Check block status before showing message
            if (payload.new.sender_id !== user?.id) {
              const { data: blocked } = await supabase
                .from("blocked_users")
                .select("*")
                .eq("blocker_id", user?.id)
                .eq("blocked_id", payload.new.sender_id)
                .maybeSingle();
              
              if (blocked) return; // Do not show message if blocked
            }

            // Perform markDelivered and markSeen outside the state updater function!
            if (payload.new.sender_id !== user?.id) {
              await markDelivered(payload.new.id);
              await markSeen();
            }

            setMessages((prev) => {
              const existingIndex = prev.findIndex((m) => 
                m.id === payload.new.id || 
                (m.sender_id === payload.new.sender_id && 
                 m.message === payload.new.message && 
                 m.message_type === payload.new.message_type &&
                 String(m.id).startsWith("temp_"))
              );

              if (existingIndex !== -1) {
                const updated = [...prev];
                updated[existingIndex] = payload.new;
                return updated;
              }

              return [...prev, payload.new];
            });
            scrollBottom();
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? payload.new : m))
            );
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) =>
              prev.filter((m) => m.id !== payload.old.id)
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocked_users" },
        () => {
          checkBlockStatus();
        }
      )
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

    // Supabase Realtime Broadcast Channel
    const broadcastCh = supabase.channel(`chat-broadcast-${id}`);
    broadcastChRef.current = broadcastCh;

    broadcastCh
      .on("broadcast", { event: "message" }, async (payload) => {
        const newMsg = payload.payload;
        if (newMsg.sender_id !== user?.id) {
          // Check block status before showing message
          const { data: blocked } = await supabase
            .from("blocked_users")
            .select("*")
            .eq("blocker_id", user?.id)
            .eq("blocked_id", newMsg.sender_id)
            .maybeSingle();

          if (blocked) return;

          // Call markDelivered and markSeen to mark received broadcast message as read!
          await markDelivered(newMsg.id);
          await markSeen();

          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id || (newMsg.tempId && m.id === newMsg.tempId))) {
              return prev;
            }
            return [...prev, newMsg];
          });
          scrollBottom();
        }
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        const { isTyping, userId } = payload.payload;
        if (userId !== user?.id) {
          setIsOpponentTyping(isTyping);
        }
      })
      .on("broadcast", { event: "recording" }, (payload) => {
        const { isRecording, userId } = payload.payload;
        if (userId !== user?.id) {
          setIsOpponentRecording(isRecording);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgCh);
      if (broadcastCh) {
        supabase.removeChannel(broadcastCh);
      }
      broadcastChRef.current = null;
    };
  }, [id, user?.id]);

  // ── Send text ──
  const sendText = async () => {
    const text = message.trim();
    if (!text || !user?.id) return;

    if (isBlocked || amIBlocked) {
      Alert.alert("Blocked", "You cannot send messages to this contact.");
      return;
    }

    const tempId = `temp_${Date.now()}`;
    const now = new Date().toISOString();
    
    let finalMessageText = text;
    if (replyingToMessage) {
      const cleanReplyText = replyingToMessage.message
        .replace(/\|\|\|/g, " ")
        .substring(0, 100);
      const replySender = replyingToMessage.sender_id === user?.id ? "You" : (otherUser?.full_name || "User");
      const replyPrefix = `|||reply_id:${replyingToMessage.id}|||reply_text:${cleanReplyText}|||reply_type:${replyingToMessage.message_type || "text"}|||reply_sender:${replySender}`;
      finalMessageText = `${replyPrefix}|||${text}`;
      setReplyingToMessage(null);
    }

    const tempMsg = {
      id: tempId,
      tempId: tempId,
      chat_id: id,
      sender_id: user.id,
      message: finalMessageText,
      message_type: "text",
      created_at: now,
      is_seen: false,
      is_delivered: false,
    };

    setMessages((prev) => [...prev, tempMsg]);
    setMessage("");
    scrollBottom();

    // Broadcast instantly
    broadcastChRef.current?.send({
      type: "broadcast",
      event: "message",
      payload: tempMsg,
    });

    // Clear typing status
    if (isTypingRef.current) {
      isTypingRef.current = false;
      broadcastChRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { isTyping: false, userId: user.id },
      });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const { data, error } = await supabase
      .from("messages")
      .insert({ 
        chat_id: id, 
        sender_id: user.id, 
        message: finalMessageText, 
        message_type: "text", 
        is_seen: false, 
        is_delivered: false 
      })
      .select()
      .single();

    setMessages((prev) =>
      error ? prev.filter((m) => m.id !== tempId) : prev.map((m) => (m.id === tempId ? data : m))
    );

    if (!error && data) {
      sendPushForMessage(id as string, user.id, text, "text");
    }
  };

  const sendLocation = async () => {
    if (!user?.id) return;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Permission to access location is required.');
      return;
    }

    Alert.alert(
      "Share Location",
      "Choose location sharing option",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Send Current Location", 
          onPress: () => performSendLocation("location") 
        },
        { 
          text: "Share Live Location (15m)", 
          onPress: () => performSendLocation("live_location") 
        }
      ]
    );
  };

  const performSendLocation = async (type: "location" | "live_location") => {
    if (!user?.id) return;
    try {
      setUploading(true);
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      const locationMessage = `${lat},${lng}`;

      const { data, error } = await supabase
        .from("messages")
        .insert({
          chat_id: id,
          sender_id: user.id,
          message: locationMessage,
          message_type: type,
          is_seen: false,
          is_delivered: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        setMessages((prev) => [...prev, data]);
        broadcastChRef.current?.send({
          type: "broadcast",
          event: "message",
          payload: data,
        });
        const notifyText = type === "live_location" ? "🟢 Shared live location" : "📍 Shared a location";
        sendPushForMessage(id as string, user.id, notifyText, type);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to fetch location.");
    } finally {
      setUploading(false);
    }
  };

  const handleSendPress = async () => {
    if (pendingMedia) {
      const media = pendingMedia;
      setPendingMedia(null);
      const captionText = message;
      setMessage("");
      await sendMedia(media.uri, media.mimeType, media.type, media.fileName, undefined, captionText);
    } else {
      await sendText();
    }
  };

  const handleMessageChange = (text: string) => {
    setMessage(text);
    if (!user?.id) return;

    if (text.trim().length === 0) {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        broadcastChRef.current?.send({
          type: "broadcast",
          event: "typing",
          payload: { isTyping: false, userId: user.id },
        });
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      broadcastChRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { isTyping: true, userId: user.id },
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        broadcastChRef.current?.send({
          type: "broadcast",
          event: "typing",
          payload: { isTyping: false, userId: user.id },
        });
      }
    }, 2000);
  };

  // ── Send media ──
  const sendMedia = async (uri: string, mimeType: string, type: "image" | "video" | "file" | "audio", fileName?: string, duration?: number, caption?: string) => {
    if (!user?.id) return;

    if (isBlocked || amIBlocked) {
      Alert.alert("Blocked", "You cannot send media to this contact.");
      return;
    }

    setUploading(true);
    try {
      const folder = type === "image" ? "images" : type === "video" ? "videos" : type === "audio" ? "audio" : "files";
      
      let result;
      try {
        result = await uploadToStorage(uri, mimeType, folder);
      } catch (uploadError: any) {
        Alert.alert("Upload failed", uploadError.message || "Failed to upload to storage.");
        return;
      }
      
      const { url, path } = result;
      
      let replyPrefix = "";
      if (replyingToMessage) {
        const cleanReplyText = replyingToMessage.message
          .replace(/\|\|\|/g, " ")
          .substring(0, 100);
        const replySender = replyingToMessage.sender_id === user?.id ? "You" : (otherUser?.full_name || "User");
        replyPrefix = `|||reply_id:${replyingToMessage.id}|||reply_text:${cleanReplyText}|||reply_type:${replyingToMessage.message_type || "text"}|||reply_sender:${replySender}|||`;
        setReplyingToMessage(null);
      }

      const finalMessage = `${replyPrefix}${caption && caption.trim() ? `${url}|||caption:${caption.trim()}` : url}`;

      const { data, error } = await supabase
        .from("messages")
        .insert({ 
          chat_id: id, 
          sender_id: user.id, 
          message: finalMessage, 
          media_path: path,
          message_type: type, 
          file_name: fileName, 
          audio_duration: duration,
          is_seen: false, 
          is_delivered: false 
        })
        .select()
        .single();
      
      if (error) {
        console.error("Database insert error:", error);
        Alert.alert("Failed to send message", error.message || "Database insert failed.");
        return;
      }

      if (data) { 
        setMessages((prev) => [...prev, data]); 
        scrollBottom(); 
        // Cache it locally immediately for the sender
        await getLocalMediaUri(url, path);

        // Broadcast media message instantly
        broadcastChRef.current?.send({
          type: "broadcast",
          event: "message",
          payload: data,
        });

        // Trigger push notification for media message
        sendPushForMessage(id as string, user.id, url, type);
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
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      await sendMedia(
        a.uri,
        a.mimeType || "image/jpeg",
        "image",
        a.fileName || "photo.jpg"
      );
    }
  };

  // ── Pick video (limited to 60s by picker — no FFmpeg needed) ──
  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Allow photo access to send videos."); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 60,   // iOS/Android enforce this
      quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      await sendMedia(
        a.uri,
        a.mimeType || "video/mp4",
        "video",
        a.fileName || "video.mp4"
      );
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
        await sendMedia(
          a.uri,
          a.mimeType || "application/octet-stream",
          "file",
          a.name
        );
      }
    } catch (e: any) { console.log("file picker:", e.message); }
  };

  // ── Attachment menu ──
  const showAttachMenu = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Photo / Image", "Video (max 1 min)", "File", "📍 Location"], cancelButtonIndex: 0 },
        (idx) => { 
          if (idx === 1) pickImage(); 
          else if (idx === 2) pickVideo(); 
          else if (idx === 3) pickFile(); 
          else if (idx === 4) sendLocation();
        }
      );
    } else {
      setShowAttachmentSheet(true);
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
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 10 }}
          onPress={() => setSettingsVisible(true)}
        >
          <View style={styles.headerAvatar}>
            {otherUser?.avatar_url ? (
              <Image source={{ uri: otherUser.avatar_url }} style={styles.headerAvatarImage} />
            ) : (
              <Text style={styles.headerAvatarText}>{(name || "U").charAt(0).toUpperCase()}</Text>
            )}
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
            onPress={() =>
              Alert.alert(
                "Video Call",
                `Starting video call with ${name}...`
              )
            }
          >
            {/* <ExpoVideo
              source={{ uri: displayUri }}
              style={{
                width: 220,
                height: 180,
                borderRadius: 10,
              }}
              useNativeControls
              resizeMode="contain"
            /> */}
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
        chatId={id as string}
      />

      {/* Messages */}
      <KeyboardAvoidingView
        key="kbd-avoiding-view"
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages.filter(m => !deletedForMeIds.includes(m.id.toString()) && !deletedForMeIds.includes(m.id))}
          extraData={{
            userId: user?.id,
            otherUser,
            selectedMessageIds,
            multiSelectMode,
            themeId: backgroundConfig.id
          }}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <MessageBubble 
               item={item} 
               isMine={item.sender_id === user?.id} 
               onMediaPress={handleMediaPress}
               otherUserAvatarUrl={otherUser?.avatar_url}
               otherUserName={otherUser?.full_name || otherUser?.username || "User"}
               themeId={backgroundConfig.id}
               bgType={backgroundConfig.type}
               onReply={(msg) => setReplyingToMessage(msg)}
               onLongPress={(msg) => {
                 setSelectedMenuMessage(msg);
                 setShowActionsModal(true);
               }}
               onReplyClick={handleReplyClick}
               multiSelectMode={multiSelectMode}
               isSelected={selectedMessageIds.includes(item.id.toString()) || selectedMessageIds.includes(item.id)}
               onToggleSelect={(msgId) => {
                 const idStr = msgId.toString();
                 setSelectedMessageIds((prev) => 
                   prev.includes(idStr) ? prev.filter(id => id !== idStr) : [...prev, idStr]
                 );
               }}
             />
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

        {/* Typing and Recording indicators */}
        {isOpponentTyping && (
          <View style={styles.indicatorContainer}>
            <View style={styles.indicatorBubble}>
              <Text style={styles.indicatorText}>{otherUser?.full_name || "Opponent"} is typing</Text>
              <BouncingDots />
            </View>
          </View>
        )}

        {isOpponentRecording && (
          <View style={styles.indicatorContainer}>
            <View style={styles.indicatorBubble}>
              <View style={styles.recordingDotSmall} />
              <Text style={styles.indicatorText}>{otherUser?.full_name || "Opponent"} is recording audio</Text>
              <SoundwaveIndicator />
            </View>
          </View>
        )}

        {/* Input area or Multi-Select bottom toolbar */}
        {multiSelectMode ? (
          <View style={{
            flexDirection: "row",
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#E5E7EB",
            paddingVertical: 12,
            paddingHorizontal: 20,
            justifyContent: "space-between",
            alignItems: "center",
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 4
          }}>
            <TouchableOpacity onPress={() => {
              setMultiSelectMode(false);
              setSelectedMessageIds([]);
            }}>
              <Text style={{ color: "#6B7280", fontWeight: "bold", fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
              {selectedMessageIds.length} Selected
            </Text>

            <View style={{ flexDirection: "row", gap: 20 }}>
              {/* Forward Selected */}
              <TouchableOpacity 
                disabled={selectedMessageIds.length === 0}
                onPress={() => {
                  const msgs = messages.filter(m => selectedMessageIds.includes(m.id.toString()) || selectedMessageIds.includes(m.id));
                  setMessagesToForward(msgs);
                  setShowForwardModal(true);
                }}
                style={{ opacity: selectedMessageIds.length === 0 ? 0.4 : 1 }}
              >
                <Text style={{ color: "#2563EB", fontWeight: "bold", fontSize: 14 }}>Forward</Text>
              </TouchableOpacity>

              {/* Delete Selected */}
              <TouchableOpacity 
                disabled={selectedMessageIds.length === 0}
                onPress={async () => {
                  Alert.alert(
                    "Delete Messages",
                    "Do you want to delete these messages for yourself?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { 
                        text: "Delete for Me", 
                        onPress: async () => {
                          const newDeletedIds = [...deletedForMeIds, ...selectedMessageIds];
                          setDeletedForMeIds(newDeletedIds);
                          await AsyncStorage.setItem(`deleted_messages_${user?.id}`, JSON.stringify(newDeletedIds));
                          setMultiSelectMode(false);
                          setSelectedMessageIds([]);
                          Alert.alert("Success", "Messages deleted.");
                        } 
                      }
                    ]
                  );
                }}
                style={{ opacity: selectedMessageIds.length === 0 ? 0.4 : 1 }}
              >
                <Text style={{ color: "#EF4444", fontWeight: "bold", fontSize: 14 }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          (isBlocked || amIBlocked) ? (
            <View style={styles.blockedNotice}>
              <Text style={styles.blockedNoticeText}>
                {isBlocked ? "You have blocked this contact." : "This contact has blocked you."}
              </Text>
            </View>
          ) : (
            <View>
              {replyingToMessage && (
                <View style={{
                  flexDirection: "row",
                  backgroundColor: "#F3F4F6",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderTopWidth: 1,
                  borderTopColor: "#E5E7EB",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <View style={{ borderLeftWidth: 3, borderLeftColor: "#2563EB", paddingLeft: 8, flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#2563EB" }}>
                      Replying to {replyingToMessage.sender_id === user?.id ? "You" : (otherUser?.full_name || "User")}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#4B5563" }} numberOfLines={1}>
                      {replyingToMessage.message_type === "text" ? replyingToMessage.message : `[${replyingToMessage.message_type}]`}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setReplyingToMessage(null)} style={{ padding: 4 }}>
                    <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "bold" }}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              {pendingMedia && (
                <View style={styles.pendingMediaPreview}>
                  <View style={styles.pendingMediaThumbnailContainer}>
                    {pendingMedia.type === "image" ? (
                      <Image source={{ uri: pendingMedia.uri }} style={styles.pendingMediaImage} />
                    ) : (
                      <View style={styles.pendingMediaPlaceholder}>
                        <Text style={{ fontSize: 18 }}>
                          {pendingMedia.type === "video" ? "🎥" : pendingMedia.type === "audio" ? "🎵" : "📄"}
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity style={styles.pendingMediaCloseBtn} onPress={() => setPendingMedia(null)}>
                      <Text style={{ color: "#FFF", fontSize: 9, fontWeight: "bold" }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1, paddingLeft: 8, justifyContent: "center" }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151" }} numberOfLines={1}>
                      {pendingMedia.fileName || `${pendingMedia.type.charAt(0).toUpperCase() + pendingMedia.type.slice(1)} selected`}
                    </Text>
                    <Text style={{ fontSize: 10, color: "#6B7280" }}>Type a caption and press ➤ to send</Text>
                  </View>
                </View>
              )}
              <View style={[styles.inputArea, { paddingBottom: Platform.OS === "ios" ? (isKeyboardVisible ? 10 : Math.max(insets.bottom, 12)) : Math.max(insets.bottom, 12) }]}>
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
                    placeholder={pendingMedia ? "Add a caption..." : "Type a message..."}
                    placeholderTextColor="#9CA3AF"
                    value={message}
                    onChangeText={handleMessageChange}
                    multiline
                    maxLength={2000}
                  />
                )}

                {(message.trim().length === 0 && !pendingMedia) ? (
                  <TouchableOpacity
                    style={[styles.sendBtn, isRecording && { backgroundColor: "#EF4444" }]}
                    onPress={isRecording ? stopRecording : startRecording}
                  >
                    {isRecording ? <StopCircle size={22} color="#FFF" /> : <Mic size={22} color="#FFF" />}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.sendBtn}
                    onPress={handleSendPress}
                  >
                    <Text style={styles.sendIcon}>➤</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )
        )}

        {selectedMedia && (
          <MediaModal
            visible={!!selectedMedia}
            onClose={() => setSelectedMedia(null)}
            uri={selectedMedia.uri}
            type={selectedMedia.type}
            fileName={selectedMedia.fileName}
          />
        )}

        {/* Attachment Sheet Modal for Android and Web */}
        <Modal
          visible={showAttachmentSheet}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAttachmentSheet(false)}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "flex-end",
            }}
            activeOpacity={1}
            onPress={() => setShowAttachmentSheet(false)}
          >
            <View
              style={{
                backgroundColor: colors.cardBg,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                paddingBottom: Platform.OS === "ios" ? 40 : 24,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ width: 40, height: 4, backgroundColor: colors.textSecondary + "40", borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
              
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 16, textAlign: "center" }}>
                Share Media / Location
              </Text>

              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    borderRadius: 14,
                    backgroundColor: colors.backgroundElement,
                  }}
                  onPress={() => {
                    setShowAttachmentSheet(false);
                    setTimeout(pickImage, 100);
                  }}
                >
                  <Text style={{ fontSize: 22, marginRight: 16 }}>📷</Text>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>Photo / Image</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    borderRadius: 14,
                    backgroundColor: colors.backgroundElement,
                  }}
                  onPress={() => {
                    setShowAttachmentSheet(false);
                    setTimeout(pickVideo, 100);
                  }}
                >
                  <Text style={{ fontSize: 22, marginRight: 16 }}>🎥</Text>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>Video (max 1 min)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    borderRadius: 14,
                    backgroundColor: colors.backgroundElement,
                  }}
                  onPress={() => {
                    setShowAttachmentSheet(false);
                    setTimeout(pickFile, 100);
                  }}
                >
                  <Text style={{ fontSize: 22, marginRight: 16 }}>📄</Text>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>File / Document</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    borderRadius: 14,
                    backgroundColor: colors.backgroundElement,
                  }}
                  onPress={() => {
                    setShowAttachmentSheet(false);
                    setTimeout(sendLocation, 100);
                  }}
                >
                  <Text style={{ fontSize: 22, marginRight: 16 }}>📍</Text>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>Location</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    alignItems: "center",
                    padding: 16,
                    marginTop: 8,
                    borderRadius: 14,
                    backgroundColor: colors.border,
                  }}
                  onPress={() => setShowAttachmentSheet(false)}
                >
                  <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Message Long Press Actions Modal */}
        <Modal
          visible={showActionsModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowActionsModal(false)}
        >
          <TouchableOpacity 
            style={{ 
              flex: 1, 
              backgroundColor: "rgba(0,0,0,0.5)", 
              justifyContent: "flex-end" 
            }}
            activeOpacity={1}
            onPress={() => setShowActionsModal(false)}
          >
            <View style={{ 
              backgroundColor: "#FFF", 
              borderTopLeftRadius: 20, 
              borderTopRightRadius: 20, 
              paddingVertical: 16,
              paddingHorizontal: 20,
              gap: 4
            }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#6B7280", marginBottom: 8, textAlign: "center", letterSpacing: 0.5 }}>
                MESSAGE OPTIONS
              </Text>

              <TouchableOpacity 
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 }}
                onPress={() => {
                  setReplyingToMessage(selectedMenuMessage);
                  setShowActionsModal(false);
                }}
              >
                <Text style={{ fontSize: 18 }}>↩️</Text>
                <Text style={{ fontSize: 16, color: "#1F2937", fontWeight: "500" }}>Reply</Text>
              </TouchableOpacity>

              {selectedMenuMessage?.message_type === "text" && (
                <TouchableOpacity 
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 }}
                  onPress={() => {
                    handleCopyMessage(selectedMenuMessage.message);
                    setShowActionsModal(false);
                  }}
                >
                  <Text style={{ fontSize: 18 }}>📋</Text>
                  <Text style={{ fontSize: 16, color: "#1F2937", fontWeight: "500" }}>Copy Text</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 }}
                onPress={() => {
                  setMessagesToForward([selectedMenuMessage]);
                  setShowForwardModal(true);
                  setShowActionsModal(false);
                }}
              >
                <Text style={{ fontSize: 18 }}>↗️</Text>
                <Text style={{ fontSize: 16, color: "#1F2937", fontWeight: "500" }}>Forward</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 }}
                onPress={() => {
                  setMultiSelectMode(true);
                  setSelectedMessageIds([selectedMenuMessage.id.toString()]);
                  setShowActionsModal(false);
                }}
              >
                <Text style={{ fontSize: 18 }}>☑️</Text>
                <Text style={{ fontSize: 16, color: "#1F2937", fontWeight: "500" }}>Select Multiple</Text>
              </TouchableOpacity>

              <View style={{ height: 0.5, backgroundColor: "#E5E7EB", marginVertical: 8 }} />

              <TouchableOpacity 
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 }}
                onPress={() => {
                  handleDeleteForMe(selectedMenuMessage.id);
                  setShowActionsModal(false);
                }}
              >
                <Text style={{ fontSize: 18 }}>🗑️</Text>
                <Text style={{ fontSize: 16, color: "#EF4444", fontWeight: "500" }}>Delete for Me</Text>
              </TouchableOpacity>

              {selectedMenuMessage?.sender_id === user?.id && (
                <TouchableOpacity 
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 }}
                  onPress={() => {
                    handleDeleteForEveryone(selectedMenuMessage);
                    setShowActionsModal(false);
                  }}
                >
                  <Text style={{ fontSize: 18 }}>🔥</Text>
                  <Text style={{ fontSize: 16, color: "#EF4444", fontWeight: "700" }}>Delete for Everyone</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Message Forward Modal */}
        <Modal
          visible={showForwardModal}
          animationType="slide"
          onRequestClose={() => setShowForwardModal(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }}>
            <View style={{ 
              flexDirection: "row", 
              alignItems: "center", 
              paddingVertical: 14, 
              paddingHorizontal: 16, 
              borderBottomWidth: 0.5, 
              borderBottomColor: "#E5E7EB" 
            }}>
              <TouchableOpacity onPress={() => setShowForwardModal(false)} style={{ padding: 4 }}>
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: "bold", marginLeft: 12, color: "#111827" }}>
                Forward Message
              </Text>
            </View>

            <FlatList
              data={friendsList}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <View style={{ padding: 40, alignItems: "center" }}>
                  <Text style={{ color: "#6B7280" }}>No friends found to forward to.</Text>
                </View>
              }
              renderItem={({ item }) => {
                const name = item.friendProfile?.full_name || item.friendProfile?.username || "User";
                return (
                  <TouchableOpacity 
                    style={{ 
                      flexDirection: "row", 
                      alignItems: "center", 
                      paddingVertical: 12, 
                      borderBottomWidth: 0.5, 
                      borderBottomColor: "#F3F4F6" 
                    }}
                    onPress={() => handleForwardMessage(item.friendProfile)}
                  >
                    {item.friendProfile?.avatar_url ? (
                      <Image source={{ uri: item.friendProfile.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                    ) : (
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#2563EB", justifyContent: "center", alignItems: "center" }}>
                        <Text style={{ color: "#FFF", fontWeight: "bold" }}>{name[0].toUpperCase()}</Text>
                      </View>
                    )}
                    <Text style={{ marginLeft: 12, fontSize: 16, color: "#1F2937", fontWeight: "600" }}>{name}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </SafeAreaView>
        </Modal>
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
  headerAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  headerAvatarText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  headerName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  onlineText: { fontSize: 12, color: "#22C55E", marginTop: 1 },
  offlineText: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },

  // Media Modal Styles
  modalContainer: { flex: 1, backgroundColor: "#000" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 10,
  },
  modalCloseBtn: { padding: 5 },
  modalShareBtn: { padding: 5 },
  modalTitle: { color: "#FFF", fontSize: 16, fontWeight: "600", flex: 1, textAlign: "center", marginHorizontal: 15 },
  modalContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  fullImage: { width: "100%", height: "100%" },
  fullVideo: { width: "100%", height: "100%" },
  filePreview: { alignItems: "center", padding: 30 },
  fileIconLarge: { fontSize: 80, marginBottom: 20 },
  fileNameLarge: { color: "#FFF", fontSize: 18, fontWeight: "600", textAlign: "center", marginBottom: 30 },
  openFileBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 10,
  },
  openFileText: { color: "#FFF", fontSize: 16, fontWeight: "600" },

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
  broadcastContainer: { alignItems: "center", alignSelf: "center", width: "100%", marginVertical: 8 },

  bubble: {
    maxWidth: "78%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  myBubble: { backgroundColor: "#2563EB", borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: "#FFFFFF", borderBottomLeftRadius: 4, borderWidth: 0.5, borderColor: "#E5E7EB" },
  broadcastBubble: { backgroundColor: "#FFFBEB", borderWidth: 1.5, borderColor: "#F59E0B", borderRadius: 16, width: "92%", maxWidth: "92%", paddingHorizontal: 16, paddingVertical: 12 },

  msgText: { fontSize: 15, lineHeight: 21 },
  myText: { color: "#FFFFFF" },
  otherText: { color: "#111827" },
  broadcastText: { color: "#78350F", fontSize: 14, fontWeight: "500", lineHeight: 20 },

  metaRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 4 },
  msgTime: { fontSize: 11 },
  myTime: { color: "#BFDBFE" },
  otherTime: { color: "#9CA3AF" },
  broadcastTime: { color: "#B45309" },

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

  msgImage: { width: 220, height: 160, borderRadius: 12, marginBottom: 4 },

  // Video Card Styles
  videoCard: {
    width: 220,
    height: 130,
    borderRadius: 12,
    backgroundColor: "#1E293B",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 4,
  },
  videoPlayOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  videoPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  videoCardTitleBar: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  videoCardTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },

  // File Card Styles
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    width: 230,
    borderWidth: 1,
    marginBottom: 4,
  },
  myFileCard: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  otherFileCard: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  fileCardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  fileCardIcon: {
    fontSize: 18,
    color: "#FFF",
  },
  fileCardName: {
    fontSize: 14,
    fontWeight: "600",
  },
  fileCardSize: {
    fontSize: 11,
    marginTop: 2,
  },
  fileCardDownloadIcon: {
    justifyContent: "center",
    alignItems: "center",
  },

  // Location Card Styles
  locationCard: {
    width: 230,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 4,
  },
  myLocationCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  otherLocationCard: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  locationMapGrid: {
    height: 75,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  locationCardFooter: {
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  locationTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  myLocationText: {
    color: "#FFFFFF",
  },
  otherLocationText: {
    color: "#1F2937",
  },
  locationSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },

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
  blockedNotice: {
    padding: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#E5E7EB",
  },
  blockedNoticeText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  indicatorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "transparent",
  },
  indicatorBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    gap: 8,
    maxWidth: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  indicatorText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "500",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 10,
  },
  dotText: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "900",
  },
  soundwaveRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 16,
  },
  soundwaveBar: {
    width: 3,
    backgroundColor: "#EF4444",
    borderRadius: 1.5,
  },
  recordingDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
  },
  pendingMediaPreview: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    alignItems: "center",
  },
  pendingMediaThumbnailContainer: {
    position: "relative",
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: "visible",
  },
  pendingMediaImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  pendingMediaPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  pendingMediaCloseBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
});