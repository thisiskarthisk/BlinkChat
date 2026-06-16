import { supabase } from "../lib/supabase";

/*
|--------------------------------------------------------------------------
| Create or Get Existing Private Chat
|--------------------------------------------------------------------------
*/

export async function createOrGetChat(
  currentUserId: string,
  otherUserId: string
) {
  try {
    // Check if chat already exists
    const { data: existingChats, error: searchError } = await supabase
      .from("chat_members")
      .select("chat_id")
      .eq("user_id", currentUserId);

    if (searchError) throw searchError;

    if (existingChats && existingChats.length > 0) {
      const chatIds = existingChats.map((c) => c.chat_id);

      const { data: commonChat, error: commonError } = await supabase
        .from("chat_members")
        .select("chat_id")
        .in("chat_id", chatIds)
        .eq("user_id", otherUserId)
        .maybeSingle();

      if (commonChat) {
        return commonChat.chat_id;
      }
    }

    // Create new chat if not exists
    const { data: newChat, error } = await supabase
      .from("chats")
      .insert({})
      .select()
      .single();

    if (error) throw error;

    const chatId = newChat.id;

    const { error: memberError } = await supabase
      .from("chat_members")
      .insert([
        {
          chat_id: chatId,
          user_id: currentUserId,
        },
        {
          chat_id: chatId,
          user_id: otherUserId,
        },
      ]);

    if (memberError) {
      throw memberError;
    }

    return chatId;
  } catch (err) {
    console.log("Chat Error:", err);
    return null;
  }
}

/*
|--------------------------------------------------------------------------
| Send Message
|--------------------------------------------------------------------------
*/

export async function sendMessage(
  chatId: string,
  senderId: string,
  message: string
) {
  try {
    const { error } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        message: message,
        is_seen: false,
      });

    if (error) throw error;

    return true;
  } catch (error) {
    console.log("Send Message Error:", error);
    return false;
  }
}

/*
|--------------------------------------------------------------------------
| Get Messages
|--------------------------------------------------------------------------
*/

export async function getMessages(chatId: string) {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", {
        ascending: true,
      });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.log("Get Messages Error:", error);
    return [];
  }
}

/*
|--------------------------------------------------------------------------
| Delete Message
|--------------------------------------------------------------------------
*/

export async function deleteMessage(
  messageId: string
) {
  try {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.log("Delete Message Error:", error);
    return false;
  }
}

/*
|--------------------------------------------------------------------------
| Mark Messages Delivered
|--------------------------------------------------------------------------
*/

export async function markMessagesDelivered(
  chatId: string,
  userId: string
) {
  try {
    const { error } = await supabase
      .from("messages")
      .update({
        is_delivered: true,
      })
      .eq("chat_id", chatId)
      .neq("sender_id", userId)
      .eq("is_delivered", false);

    if (error) throw error;

    return true;
  } catch (error) {
    console.log("Delivery Status Error:", error);
    return false;
  }
}

export async function markAllMessagesDelivered(
  userId: string
) {
  try {
    // Get all chat IDs for this user
    const { data: chats } = await supabase
      .from("chat_members")
      .select("chat_id")
      .eq("user_id", userId);

    if (!chats || chats.length === 0) return;

    const chatIds = chats.map(c => c.chat_id);

    const { error } = await supabase
      .from("messages")
      .update({
        is_delivered: true,
      })
      .in("chat_id", chatIds)
      .neq("sender_id", userId)
      .eq("is_delivered", false);

    if (error) throw error;
  } catch (error) {
    console.log("markAllMessagesDelivered Error:", error);
  }
}

/*
|--------------------------------------------------------------------------
| Mark Message Read
|--------------------------------------------------------------------------
*/

export async function markMessageRead(
  messageId: string
) {
  try {
    const { error } = await supabase
      .from("messages")
      .update({
        is_read: true,
      })
      .eq("id", messageId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.log("Read Status Error:", error);
    return false;
  }
}

/*
|--------------------------------------------------------------------------
| Listen For New Messages
|--------------------------------------------------------------------------
*/

export function subscribeToMessages(
  callback: (payload: any) => void
) {
  return supabase
    .channel("messages-channel")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      callback
    )
    .subscribe();
}

/*
|--------------------------------------------------------------------------
| Stop Realtime Listener
|--------------------------------------------------------------------------
*/

export async function unsubscribeMessages(
  channel: any
) {
  await supabase.removeChannel(channel);
}
/*
|--------------------------------------------------------------------------
| Clear Chat
|--------------------------------------------------------------------------
*/

export async function clearChat(chatId: string) {
  try {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("chat_id", chatId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.log("Clear Chat Error:", error);
    return false;
  }
}

/*
|--------------------------------------------------------------------------
| Update Chat/Member Settings
|--------------------------------------------------------------------------
*/

export async function updateChatSettings(chatId: string, settings: any) {
  try {
    const { error } = await supabase
      .from("chats")
      .update(settings)
      .eq("id", chatId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.log("Update Chat Settings Error:", error);
    return false;
  }
}

export async function updateMemberSettings(chatId: string, userId: string, settings: any) {
  try {
    const { error } = await supabase
      .from("chat_members")
      .update(settings)
      .eq("chat_id", chatId)
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.log("Update Member Settings Error:", error);
    return false;
  }
}

export async function getChatDetails(chatId: string, userId: string) {
  try {
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .single();

    if (chatError) throw chatError;

    const { data: member, error: memberError } = await supabase
      .from("chat_members")
      .select("*")
      .eq("chat_id", chatId)
      .eq("user_id", userId)
      .single();

    if (memberError) throw memberError;

    return { ...chat, ...member };
  } catch (error) {
    console.log("Get Chat Details Error:", error);
    return null;
  }
}
