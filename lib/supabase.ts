// import { createClient } from '@supabase/supabase-js';


// const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
// const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// export const supabase = createClient(supabaseUrl, supabaseAnonKey);


/**
 * lib/supabase.ts
 * 
 * IMPORTANT: Uses AsyncStorage so sessions persist across app restarts.
 * User stays logged in even after closing and reopening the app.
 * Only supabase.auth.signOut() clears the session.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;       // ← replace
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!; // ← replace

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // AsyncStorage makes the session survive app close/open
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,     // ← THIS is what keeps users logged in
    detectSessionInUrl: false,
  },
});