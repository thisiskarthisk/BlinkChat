/**
 * hooks/useAuth.tsx
 *
 * Multi-account session manager.
 *
 * Key design decisions:
 *  - Every time a session becomes active (login, token refresh, switch), the
 *    latest tokens are persisted in `blinkchat_saved_accounts` under that
 *    user's ID.  Supabase can issue new access/refresh tokens on any refresh
 *    cycle, so we always overwrite with the freshest copy.
 *
 *  - `addAccount()` does NOT call `supabase.auth.signOut()` because signOut
 *    (even scope='local') can invalidate the refresh token on the Supabase
 *    server, making it impossible to switch back without a new login.  Instead
 *    we manually remove only the Supabase session keys from AsyncStorage and
 *    clear local React state so the app thinks nobody is logged in.  The saved
 *    accounts list is untouched.
 *
 *  - `switchAccount()` uses `supabase.auth.setSession()` to restore a saved
 *    session.  After the call, Supabase may return refreshed tokens; we
 *    immediately persist them back into savedAccounts so the next switch still
 *    works without a new password.
 */

import { Session, User } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";
import { markAllMessagesDelivered } from "../services/chatService";
import { registerForPushNotificationsAsync } from "../services/pushNotificationService";
import { APP_CONFIG } from "../constants/config";

// ─── Types ───────────────────────────────────────────────────────────────────

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

export interface SavedAccount {
  userId: string;
  email: string;
  name: string;
  session: Session;
  profile: Profile;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  savedAccounts: SavedAccount[];
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, metadata?: { full_name?: string; phone?: string }) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (updated: Partial<Profile>) => void;
  addAccount: () => Promise<void>;
  switchAccount: (userId: string) => Promise<void>;
  removeAccount: (userId: string) => Promise<void>;
}

// ─── Supabase storage key (matches the key Supabase JS v2 uses internally) ──
// When we call signOut we lose the stored session; instead we clear it manually.
const SUPABASE_SESSION_KEY = "supabase.auth.token";

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const appState = useRef(AppState.currentState);

  // When true, onAuthStateChange null events are ignored (used during addAccount
  // so that signing-out the current session doesn't overwrite savedAccounts).
  const suppressAuthChange = useRef(false);

  // ── Load saved accounts from storage on mount ──
  useEffect(() => {
    const load = async () => {
      try {
        const val = await AsyncStorage.getItem("blinkchat_saved_accounts");
        if (val) setSavedAccounts(JSON.parse(val));
      } catch (e) {
        console.error("Error loading saved accounts:", e);
      }
    };
    load();
  }, []);

  // ── Mark online/offline based on app foreground state ──
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (nextState: AppStateStatus) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      if (nextState === "active") {
        await supabase.from("profiles").update({ is_online: true }).eq("id", currentUser.id);
        await markAllMessagesDelivered(currentUser.id);
      } else if (nextState === "background" || nextState === "inactive") {
        await supabase.from("profiles").update({
          is_online: false,
          last_seen: new Date().toISOString(),
        }).eq("id", currentUser.id);
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, []);

  // ── Register push token after login ──
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
              updateProfile({ push_token: token });
            }
          }
        } catch (err) {
          console.error("Error registering push token:", err);
        }
      };
      const t = setTimeout(registerPush, 2000);
      return () => clearTimeout(t);
    }
  }, [user?.id, !!profile]);

  // ── Session init + listener ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (suppressAuthChange.current && session === null) {
        // Ignore the null event fired by our manual signOut in addAccount.
        return;
      }
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Persist (or update) the current account entry in the saved accounts list. */
  const persistAccount = async (s: Session, p: Profile) => {
    try {
      const raw = await AsyncStorage.getItem("blinkchat_saved_accounts");
      let accounts: SavedAccount[] = raw ? JSON.parse(raw) : [];

      const entry: SavedAccount = {
        userId: s.user.id,
        email: s.user.email || "",
        name: p.full_name || p.username || "User",
        session: s,
        profile: p,
      };

      const idx = accounts.findIndex(a => a.userId === entry.userId);
      if (idx >= 0) {
        accounts[idx] = entry;
      } else {
        accounts.push(entry);
      }

      setSavedAccounts(accounts);
      await AsyncStorage.setItem("blinkchat_saved_accounts", JSON.stringify(accounts));
    } catch (e) {
      console.error("persistAccount error:", e);
    }
  };

  /** Update only the session tokens for an already-saved account (used after switchAccount). */
  const updateSavedAccountSession = async (s: Session) => {
    try {
      const raw = await AsyncStorage.getItem("blinkchat_saved_accounts");
      let accounts: SavedAccount[] = raw ? JSON.parse(raw) : [];
      const idx = accounts.findIndex(a => a.userId === s.user.id);
      if (idx >= 0) {
        accounts[idx] = { ...accounts[idx], session: s };
        setSavedAccounts(accounts);
        await AsyncStorage.setItem("blinkchat_saved_accounts", JSON.stringify(accounts));
      }
    } catch (e) {
      console.error("updateSavedAccountSession error:", e);
    }
  };

  const handleSession = async (newSession: Session | null) => {
    setLoading(true);
    setSession(newSession);
    const u = newSession?.user ?? null;
    setUser(u);

    if (u) {
      const p = await ensureProfile(u);
      setProfile(p);
      await supabase.from("profiles").update({ is_online: true }).eq("id", u.id);
      if (newSession && p) {
        await persistAccount(newSession, p);
      }
    } else {
      setProfile(null);
    }
    setLoading(false);
  };

  // ─── Multi-account actions ───────────────────────────────────────────────────

  /**
   * Pause the current session and navigate to the login screen so the user can
   * sign in to a different account.  The current account's tokens are already
   * saved in `blinkchat_saved_accounts`; we do NOT revoke them.
   *
   * We suppress the onAuthStateChange null event that fires when we manually
   * clear the Supabase session so that persistAccount is not called with null.
   */
  const addAccount = async () => {
    // Mark current account as offline but keep its tokens in savedAccounts.
    if (user) {
      await supabase.from("profiles").update({
        is_online: false,
        last_seen: new Date().toISOString(),
      }).eq("id", user.id);
    }

    // Suppress the upcoming null auth event so handleSession(null) is ignored.
    suppressAuthChange.current = true;

    // Clear local React state immediately.
    setSession(null);
    setUser(null);
    setProfile(null);

    try {
      // ── IMPORTANT ──────────────────────────────────────────────────────────
      // We MUST NOT call supabase.auth.signOut() (even scope:'local') because
      // Supabase JS v2 still revokes the refresh token on the server, which
      // causes "Auth session missing!" when we try to switch back later.
      //
      // Instead we directly remove the Supabase v2 storage key so the client
      // loses its cached session without the server ever being notified.
      // The project ref is derived from EXPO_PUBLIC_SUPABASE_URL.
      // ───────────────────────────────────────────────────────────────────────
      const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim();
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "";
      const storageKey = `sb-${projectRef}-auth-token`;

      // Remove the real Supabase v2 session key from AsyncStorage.
      await AsyncStorage.removeItem(storageKey);
      // Also clear any legacy key variants just in case.
      await AsyncStorage.removeItem("supabase.auth.token");

      // Force the Supabase GoTrue client to drop its in-memory session
      // by writing null to its storage key (avoids calling server endpoints).
      await AsyncStorage.setItem(storageKey, JSON.stringify(null));
    } catch (e) {
      console.warn("addAccount: error clearing local session:", e);
    } finally {
      // Keep suppression active long enough for the Supabase client to detect
      // the cleared storage and fire its internal null auth event.
      setTimeout(() => {
        suppressAuthChange.current = false;
      }, 1200);
    }
    // Router navigation is handled by the root layout via the null session.
  };

  /**
   * Switch the active account to `targetUserId` using its saved session tokens.
   * After setSession() resolves, Supabase may issue freshened tokens; we persist
   * those back immediately so the next switch is also passwordless.
   */
  const switchAccount = async (targetUserId: string) => {
    if (user?.id === targetUserId) return;

    setLoading(true);
    try {
      // Mark current account offline.
      if (user) {
        await supabase.from("profiles").update({
          is_online: false,
          last_seen: new Date().toISOString(),
        }).eq("id", user.id);
      }

      // Read the target's saved session from AsyncStorage (source of truth,
      // because setSavedAccounts is async and may lag behind state).
      const raw = await AsyncStorage.getItem("blinkchat_saved_accounts");
      const accounts: SavedAccount[] = raw ? JSON.parse(raw) : [];
      const target = accounts.find(a => a.userId === targetUserId);
      if (!target) throw new Error("Target account not found in saved accounts");

      // Restore the target session on the Supabase client.
      const { data, error } = await supabase.auth.setSession({
        access_token: target.session.access_token,
        refresh_token: target.session.refresh_token,
      });

      if (error) throw error;

      const freshSession = data.session;
      if (!freshSession) throw new Error("No session returned after setSession");

      // Persist the freshened tokens back immediately.
      await updateSavedAccountSession(freshSession);

      // Update React state.
      setSession(freshSession);
      setUser(freshSession.user);

      const p = await ensureProfile(freshSession.user);
      setProfile(p);

      await supabase.from("profiles").update({ is_online: true }).eq("id", targetUserId);

      // Also persist the full account entry with updated profile.
      if (p) await persistAccount(freshSession, p);

      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("switchAccount error:", err);
      throw err; // Re-throw so callers can show appropriate UI
    } finally {
      setLoading(false);
    }
  };

  const removeAccount = async (targetUserId: string) => {
    try {
      const updated = savedAccounts.filter(a => a.userId !== targetUserId);
      setSavedAccounts(updated);
      await AsyncStorage.setItem("blinkchat_saved_accounts", JSON.stringify(updated));
      if (user?.id === targetUserId) {
        await signOut();
      }
    } catch (e) {
      console.error("removeAccount error:", e);
    }
  };

  // ─── Profile helpers ─────────────────────────────────────────────────────────

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

    // Auto-create profile if missing.
    const { data } = await supabase
      .from("profiles")
      .upsert({
        id: authUser.id,
        full_name: authUser.user_metadata?.full_name || "",
        username:
          authUser.user_metadata?.username ||
          authUser.email?.split("@")[0] ||
          `user_${authUser.id.slice(0, 6)}`,
        email: authUser.email || "",
        phone: authUser.user_metadata?.phone || null,
        status: `Hey there! I am using ${APP_CONFIG.appName}`,
        is_online: true,
        last_seen: new Date().toISOString(),
        company_id: authUser.user_metadata?.company_id || null,
        is_company_admin: authUser.user_metadata?.is_company_admin || false,
        is_company_account:
          authUser.user_metadata?.is_company_admin ||
          !!authUser.user_metadata?.company_id ||
          false,
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

  // ─── Auth actions ────────────────────────────────────────────────────────────

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async (
    email: string,
    password: string,
    metadata?: { full_name?: string; phone?: string }
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (!user) return;
    try {
      await supabase.from("profiles").update({
        is_online: false,
        last_seen: new Date().toISOString(),
      }).eq("id", user.id);

      // Remove this account from the saved list on explicit sign-out.
      const updated = savedAccounts.filter(a => a.userId !== user.id);
      setSavedAccounts(updated);
      await AsyncStorage.setItem("blinkchat_saved_accounts", JSON.stringify(updated));

      if (Platform.OS === "web") {
        try {
          await AsyncStorage.removeItem("device_session_token");
          if (typeof window !== "undefined") {
            if (window.localStorage) window.localStorage.clear();
            if (window.sessionStorage) window.sessionStorage.clear();
          }
          await supabase.auth.signOut({ scope: "local" });
        } catch (e) {
          console.warn("Error clearing storage on web logout:", e);
        }
        window.location.reload();
      } else {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error("signOut error:", e);
    }
  };

  const updateProfile = (updated: Partial<Profile>) => {
    setProfile(prev => (prev ? { ...prev, ...updated } : null));
  };

  // ─── Context value ───────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        savedAccounts,
        signIn,
        signUp,
        signOut,
        updateProfile,
        addAccount,
        switchAccount,
        removeAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}