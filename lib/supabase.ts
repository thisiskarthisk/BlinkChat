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

const customStorage = {
  getItem: async (key: string) => {
    if (typeof window === 'undefined') {
      return null;
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // customStorage wraps AsyncStorage and avoids SSR crashes
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,     // ← THIS is what keeps users logged in
    detectSessionInUrl: false,
  },
});