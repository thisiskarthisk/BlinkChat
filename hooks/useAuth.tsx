/**
 * hooks/useAuth.tsx
 * 
 * - Session persists across app close/open (Supabase AsyncStorage handles this)
 * - On login: mark user online
 * - On logout / app kill: mark user offline
 * - Profile auto-created if missing
 */

import { Session, User } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { supabase } from "../lib/supabase";
import { markAllMessagesDelivered } from "../services/chatService";
import { registerForPushNotificationsAsync } from "../services/pushNotificationService";

interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: string | null;
  is_online: boolean;
  last_seen: string | null;
  company_name: string | null;
  company_id: string | null;
  is_company_admin: boolean;
  is_company_account: boolean;
  website: string | null;
  push_token: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, metadata?: { full_name?: string; phone?: string }) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (updated: Partial<Profile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const appState = useRef(AppState.currentState);

  // ── Mark online/offline based on app state ──
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (nextState: AppStateStatus) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      if (nextState === "active") {
        // App came to foreground
        await supabase.from("profiles").update({ is_online: true }).eq("id", currentUser.id);
        await markAllMessagesDelivered(currentUser.id);
      } else if (nextState === "background" || nextState === "inactive") {
        // App went to background
        await supabase.from("profiles").update({
          is_online: false,
          last_seen: new Date().toISOString(),
        }).eq("id", currentUser.id);
      }
      appState.current = nextState;
    });

    return () => sub.remove();
  }, []);

  // ── Register push token on app start or login ──
  useEffect(() => {
    if (user && profile) {
      const registerPush = async () => {
        try {
          const token = await registerForPushNotificationsAsync();
          if (token && profile.push_token !== token) {
            const { error } = await supabase
              .from("profiles")
              .update({ push_token: token })
              .eq("id", user.id);

            if (!error) {
              console.log("Registered/updated push token:", token);
              updateProfile({ push_token: token });
            } else {
              console.error("Failed to update push token in database:", error);
            }
          }
        } catch (err) {
          console.error("Error registering push token:", err);
        }
      };

      // Register push token shortly after loading
      const timer = setTimeout(registerPush, 2000);
      return () => clearTimeout(timer);
    }
  }, [user?.id, !!profile]);

  // ── Session init + listener ──
  useEffect(() => {
    // Get existing session (persisted by Supabase AsyncStorage)
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (newSession: Session | null) => {
    setLoading(true);
    setSession(newSession);
    const u = newSession?.user ?? null;
    setUser(u);

    if (u) {
      const p = await ensureProfile(u);
      setProfile(p);
      // Mark online
      await supabase.from("profiles").update({ is_online: true }).eq("id", u.id);
    } else {
      setProfile(null);
    }
    setLoading(false);
  };

  const ensureProfile = async (authUser: User): Promise<Profile | null> => {
    const { data: existing } = await supabase
      .from("profiles")
      .select("*, company:companies(*)")
      .eq("id", authUser.id)
      .maybeSingle();

    if (existing) {
      return {
        ...existing,
        company_name: (existing as any).company?.name || null,
        website: (existing as any).company?.website || null,
      };
    }

    // Auto-create profile if missing
    const { data } = await supabase
      .from("profiles")
      .upsert({
        id: authUser.id,
        full_name: authUser.user_metadata?.full_name || "",
        username: authUser.user_metadata?.username || authUser.email?.split("@")[0] || `user_${authUser.id.slice(0, 6)}`,
        email: authUser.email || "",
        phone: authUser.user_metadata?.phone || null,
        status: "Hey there! I am using BlinkChat",
        is_online: true,
        last_seen: new Date().toISOString(),
        company_id: authUser.user_metadata?.company_id || null,
        is_company_admin: authUser.user_metadata?.is_company_admin || false,
        is_company_account: authUser.user_metadata?.is_company_admin || !!authUser.user_metadata?.company_id || false,
      })
      .select("*, company:companies(*)")
      .single();

    if (data) {
      return {
        ...data,
        company_name: (data as any).company?.name || null,
        website: (data as any).company?.website || null,
      };
    }
    return null;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async (email: string, password: string, metadata?: { full_name?: string; phone?: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    // Mark offline before logout
    if (user) {
      await supabase.from("profiles").update({
        is_online: false,
        last_seen: new Date().toISOString(),
      }).eq("id", user.id);
    }
    await supabase.auth.signOut();
  };

  const updateProfile = (updated: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updated } : null));
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}