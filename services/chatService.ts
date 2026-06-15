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