// import { supabase } from "../lib/supabase";

// export async function getChats(
//   userId: string
// ) {
//   const { data, error } =
//     await supabase
//       .from("chat_members")
//       .select("*")
//       .eq("user_id", userId);

//   if (error) {
//     console.log(error);
//     return [];
//   }

//   return data || [];
// }


import { supabase } from "../lib/supabase";

export async function getChatList(
  currentUserId: string
) {
  const { data: members } =
    await supabase
      .from("chat_members")
      .select("*")
      .eq("user_id", currentUserId);

  if (!members) return [];

  const chats = [];

  for (const member of members) {
    const { data: otherMember } =
      await supabase
        .from("chat_members")
        .select("*")
        .eq("chat_id", member.chat_id)
        .neq("user_id", currentUserId)
        .maybeSingle();

    if (!otherMember) continue;

    const { data: profile } =
      await supabase
        .from("profiles")
        .select("*")
        .eq("id", otherMember.user_id)
        .maybeSingle();

    chats.push({
      chat_id: member.chat_id,
      profile,
    });
  }

  return chats;
}