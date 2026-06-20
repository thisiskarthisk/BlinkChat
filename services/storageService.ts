import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { supabase } from "../lib/supabase";

const CHAT_MEDIA_DIR = `${FileSystem.documentDirectory}chat-media/`;

// Local keys
const KEY_PREFIX_MESSAGES = "blinkchat_cached_messages_";
const KEY_AUTO_DELETE_ENABLED = "blinkchat_auto_delete_enabled";
const KEY_AUTO_DELETE_DAYS = "blinkchat_auto_delete_days";
const KEY_AUTO_DELETE_START_TIME = "blinkchat_auto_delete_start_time";
const KEY_LAST_SUPABASE_CLEANUP = "blinkchat_last_supabase_cleanup";

// Ensure media directory exists
async function ensureMediaDir() {
  const dirInfo = await FileSystem.getInfoAsync(CHAT_MEDIA_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CHAT_MEDIA_DIR, { intermediates: true });
  }
}

// Download media to local storage if it hasn't been already
export async function cacheMediaFile(remoteUrl: string, mediaPath: string): Promise<string> {
  if (!mediaPath || !remoteUrl) return remoteUrl;
  await ensureMediaDir();
  const fileName = mediaPath.split("/").pop();
  const localUri = `${CHAT_MEDIA_DIR}${fileName}`;
  
  const fileInfo = await FileSystem.getInfoAsync(localUri);
  if (fileInfo.exists) return localUri;
  
  try {
    const { uri } = await FileSystem.downloadAsync(remoteUrl, localUri);
    return uri;
  } catch (e) {
    console.log("Failed to cache media file locally:", e);
    return remoteUrl;
  }
}

// Get cached messages for a chat
export async function getCachedMessages(chatId: string): Promise<any[]> {
  try {
    const cached = await AsyncStorage.getItem(`${KEY_PREFIX_MESSAGES}${chatId}`);
    return cached ? JSON.parse(cached) : [];
  } catch (e) {
    console.error("getCachedMessages error:", e);
    return [];
  }
}

// Save cached messages for a chat
export async function saveCachedMessages(chatId: string, messages: any[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${KEY_PREFIX_MESSAGES}${chatId}`, JSON.stringify(messages));
  } catch (e) {
    console.error("saveCachedMessages error:", e);
  }
}

/**
 * 24-hour cleanup policy:
 * At 1:00 AM, supabase deletes all chats/media from previous days.
 * The app backs them up to local storage first, then executes the delete.
 */
export async function syncAndCleanupSupabase(userId: string) {
  try {
    // 1. Fetch user's chats
    const { data: myChats, error } = await supabase
      .from("chat_members")
      .select("chat_id")
      .eq("user_id", userId);

    if (error || !myChats?.length) return;

    // We'll perform sync for all chats
    for (const chat of myChats) {
      const chatId = chat.chat_id;
      
      // Get remote messages from Supabase
      const { data: remoteMessages } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (!remoteMessages) continue;

      // Get local cached messages
      const localMessages = await getCachedMessages(chatId);

      // Merge (avoid duplicates)
      const mergedMap = new Map();
      localMessages.forEach((m) => mergedMap.set(m.id, m));
      remoteMessages.forEach((m) => mergedMap.set(m.id, m));
      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Cache media for messages that have media
      for (const msg of merged) {
        if (msg.message_type !== "text" && msg.media_path && msg.message) {
          await cacheMediaFile(msg.message, msg.media_path);
        }
      }

      // Save to local cache
      await saveCachedMessages(chatId, merged);
    }

    // 2. Perform 1:00 AM clean up if past 1:00 AM and hasn't run today
    const now = new Date();
    const todayStr = now.toDateString(); // e.g. "Sat Jun 20 2026"
    const lastCleanup = await AsyncStorage.getItem(KEY_LAST_SUPABASE_CLEANUP);

    if (lastCleanup !== todayStr) {
      // Decide if we are past 1:00 AM
      const currentHour = now.getHours();
      
      if (currentHour >= 1) {
        // Cutoff is today at 00:00:00. Any message created before today is deleted from Supabase.
        const cutoffDate = new Date();
        cutoffDate.setHours(0, 0, 0, 0);

        for (const chat of myChats) {
          const chatId = chat.chat_id;

          // Find remote messages to delete to clean up remote storage files
          const { data: oldMessages } = await supabase
            .from("messages")
            .select("media_path")
            .eq("chat_id", chatId)
            .lt("created_at", cutoffDate.toISOString());

          if (oldMessages?.length) {
            // Delete remote files from Supabase Storage
            const mediaPaths = oldMessages
              .map((m) => m.media_path)
              .filter((p) => !!p) as string[];
            
            if (mediaPaths.length > 0) {
              await supabase.storage.from("chat-media").remove(mediaPaths);
            }
          }

          // Delete messages from Supabase Database
          await supabase
            .from("messages")
            .delete()
            .eq("chat_id", chatId)
            .lt("created_at", cutoffDate.toISOString());
        }

        // Record cleanup success
        await AsyncStorage.setItem(KEY_LAST_SUPABASE_CLEANUP, todayStr);
        console.log("Nightly 1:00 AM clean up completed successfully for date:", todayStr);
      }
    }
  } catch (err) {
    console.error("syncAndCleanupSupabase error:", err);
  }
}

/**
 * Custom Auto Data Delete Policy (3, 7, 15, 30 days)
 * One day before deletion date, notify user and show countdown.
 */
export interface AutoDeleteInfo {
  enabled: boolean;
  days: number;
  timeLeftMs: number;
  triggerWarning: boolean;
  warningText: string;
  affectedChats: number;
  affectedFiles: number;
}

export async function checkAutoDeletePolicy(userId: string): Promise<AutoDeleteInfo> {
  const enabledStr = await AsyncStorage.getItem(KEY_AUTO_DELETE_ENABLED);
  const daysStr = await AsyncStorage.getItem(KEY_AUTO_DELETE_DAYS);
  const startTimeStr = await AsyncStorage.getItem(KEY_AUTO_DELETE_START_TIME);

  const enabled = enabledStr === "true";
  const days = daysStr ? parseInt(daysStr, 10) : 7;

  if (!enabled || !startTimeStr) {
    return {
      enabled: false,
      days,
      timeLeftMs: 0,
      triggerWarning: false,
      warningText: "",
      affectedChats: 0,
      affectedFiles: 0,
    };
  }

  const startTime = new Date(startTimeStr).getTime();
  const policyDurationMs = days * 24 * 60 * 60 * 1000;
  const expirationTime = startTime + policyDurationMs;
  const now = new Date().getTime();
  const timeLeftMs = expirationTime - now;

  // Calculate statistics
  let affectedChats = 0;
  let affectedFiles = 0;

  try {
    const keys = await AsyncStorage.getAllKeys();
    const chatKeys = keys.filter(k => k.startsWith(KEY_PREFIX_MESSAGES));
    affectedChats = chatKeys.length;

    // Count cached files in directory
    await ensureMediaDir();
    const files = await FileSystem.readDirectoryAsync(CHAT_MEDIA_DIR);
    affectedFiles = files.length;
  } catch (e) {
    console.log("Error counting chats/files:", e);
  }

  // 1. Time is up -> WIPE ALL DATA
  if (timeLeftMs <= 0) {
    await performFullDataWipe(userId);
    // Reset cycle
    await AsyncStorage.setItem(KEY_AUTO_DELETE_START_TIME, new Date().toISOString());
    
    return {
      enabled,
      days,
      timeLeftMs: policyDurationMs,
      triggerWarning: false,
      warningText: "All chat data was automatically deleted as per your retention policy.",
      affectedChats: 0,
      affectedFiles: 0,
    };
  }

  // 2. Warning window: 1 day before deletion (less than 24 hours remaining)
  const oneDayMs = 24 * 60 * 60 * 1000;
  const triggerWarning = timeLeftMs <= oneDayMs;
  
  let warningText = "";
  if (triggerWarning) {
    const hoursLeft = Math.max(0, Math.floor(timeLeftMs / (1000 * 60 * 60)));
    const minutesLeft = Math.max(0, Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60)));
    warningText = `Your data will be completely deleted tomorrow (${hoursLeft}h ${minutesLeft}m remaining). Affected: ${affectedChats} chats and ${affectedFiles} media files.`;
  }

  return {
    enabled,
    days,
    timeLeftMs,
    triggerWarning,
    warningText,
    affectedChats,
    affectedFiles,
  };
}

// Enable or change the auto-delete policy
export async function updateAutoDeletePolicy(enabled: boolean, days: number): Promise<void> {
  await AsyncStorage.setItem(KEY_AUTO_DELETE_ENABLED, enabled ? "true" : "false");
  await AsyncStorage.setItem(KEY_AUTO_DELETE_DAYS, days.toString());
  
  if (enabled) {
    // Start or restart countdown
    await AsyncStorage.setItem(KEY_AUTO_DELETE_START_TIME, new Date().toISOString());
  } else {
    await AsyncStorage.removeItem(KEY_AUTO_DELETE_START_TIME);
  }
}

// Perform full wipe of all local data
export async function performFullDataWipe(userId: string): Promise<void> {
  try {
    // 1. Clear all local AsyncStorage caches for messages
    const keys = await AsyncStorage.getAllKeys();
    const chatKeys = keys.filter(k => k.startsWith(KEY_PREFIX_MESSAGES));
    if (chatKeys.length > 0) {
      await AsyncStorage.multiRemove(chatKeys);
    }

    // 2. Clear local media directory
    await ensureMediaDir();
    const files = await FileSystem.readDirectoryAsync(CHAT_MEDIA_DIR);
    for (const file of files) {
      await FileSystem.deleteAsync(`${CHAT_MEDIA_DIR}${file}`, { idempotent: true });
    }

    // 3. Clear Supabase database for this user's messages
    const { data: myChats } = await supabase
      .from("chat_members")
      .select("chat_id")
      .eq("user_id", userId);

    if (myChats?.length) {
      for (const chat of myChats) {
        // Delete remote media files
        const { data: oldMessages } = await supabase
          .from("messages")
          .select("media_path")
          .eq("chat_id", chat.chat_id);
          
        if (oldMessages?.length) {
          const paths = oldMessages.map((m) => m.media_path).filter(p => !!p) as string[];
          if (paths.length > 0) {
            await supabase.storage.from("chat-media").remove(paths);
          }
        }

        // Delete from messages table
        await supabase.from("messages").delete().eq("chat_id", chat.chat_id);
      }
    }
    
    console.log("Full data wipe executed successfully.");
  } catch (e) {
    console.error("performFullDataWipe error:", e);
  }
}

// Backup all chats and media
export async function backupAllData(userId: string): Promise<boolean> {
  try {
    // 1. Fetch all chats and messages
    const { data: myChats } = await supabase
      .from("chat_members")
      .select("chat_id")
      .eq("user_id", userId);

    if (!myChats?.length) {
      return false;
    }

    const backupData: any = {
      backupDate: new Date().toISOString(),
      userId,
      chats: [],
    };

    for (const chat of myChats) {
      const chatId = chat.chat_id;
      const messages = await getCachedMessages(chatId);

      // Fetch other member profile
      const { data: otherMember } = await supabase
        .from("chat_members")
        .select("user_id")
        .eq("chat_id", chatId)
        .neq("user_id", userId)
        .maybeSingle();

      let otherProfile = null;
      if (otherMember) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", otherMember.user_id)
          .maybeSingle();
        otherProfile = data;
      }

      backupData.chats.push({
        chatId,
        otherUser: otherProfile,
        messages,
      });
    }

    // 2. Write backup JSON to file
    const backupFileUri = `${FileSystem.documentDirectory}blinkchat_backup_${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(backupFileUri, JSON.stringify(backupData, null, 2));

    // 3. Share the file via Native sharing
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(backupFileUri, {
        mimeType: "application/json",
        dialogTitle: "BlinkChat Chat History Backup",
      });
      return true;
    } else {
      console.log("Sharing is not available on this device.");
      return false;
    }
  } catch (e) {
    console.error("backupAllData error:", e);
    return false;
  }
}
