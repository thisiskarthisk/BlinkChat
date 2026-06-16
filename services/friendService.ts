import { supabase } from "../lib/supabase";

/**
 * services/friendService.ts
 * Logic for friend requests and blocking
 */

async function createNotification(userId: string, type: string, actorId: string, relatedId?: string) {
  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      type: type,
      actor_id: actorId,
      related_id: relatedId,
    });
  } catch (error) {
    console.log("createNotification error:", error);
  }
}

export async function sendFriendRequest(senderId: string, receiverId: string) {
  try {
    // Check if blocked
    const { data: blocked } = await supabase
      .from("blocked_users")
      .select("*")
      .or(`and(blocker_id.eq.${senderId},blocked_id.eq.${receiverId}),and(blocker_id.eq.${receiverId},blocked_id.eq.${senderId})`)
      .maybeSingle();

    if (blocked) return { error: "User is blocked" };

    // Check if already has 3 rejections
    const { data: existingRequest } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("sender_id", senderId)
      .eq("receiver_id", receiverId)
      .maybeSingle();

    if (existingRequest && existingRequest.rejection_count >= 3) {
      return { error: "You cannot send more requests to this user." };
    }

    if (existingRequest) {
      const { data, error } = await supabase
        .from("friend_requests")
        .update({ status: "pending" })
        .eq("id", existingRequest.id)
        .select()
        .single();
      
      if (error) throw error;

      // Notify receiver of new request (re-sent)
      await createNotification(receiverId, "new_request", senderId, data.id.toString());

      return { data };
    }

    const { data, error } = await supabase
      .from("friend_requests")
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    // Notify receiver of new request
    await createNotification(receiverId, "new_request", senderId, data.id.toString());

    return { data };
  } catch (error: any) {
    console.log("sendFriendRequest:", error.message);
    return { error: error.message };
  }
}

export async function acceptFriendRequest(requestId: number) {
  try {
    const { data: request, error: getError } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (getError) throw getError;

    // Update request status
    const { error: updateError } = await supabase
      .from("friend_requests")
      .update({ status: "accepted" })
      .eq("id", requestId);

    if (updateError) throw updateError;

    // Create chat automatically when accepted
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .insert({})
      .select()
      .single();

    if (chatError) throw chatError;

    await supabase.from("chat_members").insert([
      { chat_id: chat.id, user_id: request.sender_id },
      { chat_id: chat.id, user_id: request.receiver_id },
    ]);

    // Send welcome message
    await supabase.from("messages").insert({
      chat_id: chat.id,
      sender_id: request.receiver_id, // Acceptor sends the welcome message
      message: "Hey! I accepted your request. Let's chat!",
      message_type: "text",
    });

    // Notify sender that request was accepted
    await createNotification(request.sender_id, "request_accepted", request.receiver_id, chat.id);

    return { success: true, chatId: chat.id };
  } catch (error: any) {
    console.log("acceptFriendRequest:", error.message);
    return { error: error.message };
  }
}

export async function rejectFriendRequest(requestId: number) {
  try {
    const { data: request, error: getError } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (getError) throw getError;

    const newRejectionCount = (request.rejection_count || 0) + 1;

    const { error } = await supabase
      .from("friend_requests")
      .update({ 
        status: "rejected",
        rejection_count: newRejectionCount
      })
      .eq("id", requestId);

    if (error) throw error;

    // Notify sender that request was rejected
    await createNotification(request.sender_id, "request_rejected", request.receiver_id, requestId.toString());

    return { success: true };
  } catch (error: any) {
    console.log("rejectFriendRequest:", error.message);
    return { error: error.message };
  }
}

export async function getPendingRequests(userId: string) {
  try {
    const { data, error } = await supabase
      .from("friend_requests")
      .select(`
        *,
        sender:profiles!friend_requests_sender_id_fkey(*)
      `)
      .eq("receiver_id", userId)
      .eq("status", "pending");

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.log("getPendingRequests:", error.message);
    return [];
  }
}

export async function getNotifications(userId: string) {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select(`
        *,
        actor:profiles!notifications_actor_id_fkey(*)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.log("getNotifications:", error.message);
    return [];
  }
}

export async function markNotificationsRead(userId: string) {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.log("markNotificationsRead:", error.message);
    return { error: error.message };
  }
}

export async function blockUser(blockerId: string, blockedId: string) {
  try {
    const { error } = await supabase
      .from("blocked_users")
      .insert({ blocker_id: blockerId, blocked_id: blockedId });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.log("blockUser:", error.message);
    return { error: error.message };
  }
}

export async function unblockUser(blockerId: string, blockedId: string) {
  try {
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", blockerId)
      .eq("blocked_id", blockedId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.log("unblockUser:", error.message);
    return { error: error.message };
  }
}
