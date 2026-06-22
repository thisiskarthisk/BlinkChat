import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // QR Code Login States
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrStatus, setQrStatus] = useState<"idle" | "waiting" | "scanned" | "expired">("idle");
  const [qrTrigger, setQrTrigger] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let subscription: any = null;
    let timer: any = null;

    const startQrLogin = async () => {
      setQrLoading(true);
      setQrStatus("waiting");

      try {
        await supabase.removeAllChannels();
      } catch (e) {
        console.warn("removeAllChannels error:", e);
      }

      const getBrowserInfo = () => {
        if (Platform.OS !== 'web') return 'Mobile App';
        const ua = window.navigator.userAgent;
        let browserName = "Web Browser";
        let osName = "Web";
        
        if (ua.indexOf("Chrome") > -1) browserName = "Chrome";
        else if (ua.indexOf("Safari") > -1 && ua.indexOf("Chrome") === -1) browserName = "Safari";
        else if (ua.indexOf("Firefox") > -1) browserName = "Firefox";
        else if (ua.indexOf("MSIE") > -1 || !!(document as any).documentMode) browserName = "IE";
        
        if (ua.indexOf("Windows") > -1) osName = "Windows";
        else if (ua.indexOf("Mac") > -1) osName = "macOS";
        else if (ua.indexOf("Linux") > -1) osName = "Linux";
        else if (ua.indexOf("Android") > -1) osName = "Android";
        else if (ua.indexOf("iPhone") > -1) osName = "iOS";
        
        return `${browserName} (${osName})`;
      };

      const token = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });

      setSessionToken(token);

      // Insert token row into device_links in Supabase and select to get the primary key ID
      const { data: linkRow, error } = await supabase
        .from("device_links")
        .insert({
          session_token: token,
          device_name: getBrowserInfo()
        })
        .select()
        .single();

      if (error || !linkRow) {
        console.error("Error inserting link token:", error);
        setQrStatus("idle");
        setQrLoading(false);
        return;
      }

      setQrLoading(false);

      // Subscribe to updates for this primary key ID
      subscription = supabase
        .channel(`device-link-${token}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "device_links",
            filter: `id=eq.${linkRow.id}`,
          },
          async (payload) => {
            console.log("Web received postgres change payload:", payload);
            const { access_token, refresh_token } = payload.new;
            if (access_token && refresh_token) {
              setQrStatus("scanned");

              console.log("Attempting to call supabase.auth.setSession on web...");
              // Set session on web client
              const { error: sessionError } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              });

              if (sessionError) {
                console.error("Session Error details:", sessionError);
                alert("Web Session Error: " + sessionError.message);
                setQrStatus("waiting");
              } else {
                console.log("Web session set successfully!");
                // Save token locally to track the link row in Web layout (background logout checking)
                await AsyncStorage.setItem("device_session_token", token);
              }
            } else {
              console.warn("Received postgres change but access_token or refresh_token is missing");
            }
          }
        )
        .subscribe();

      // Expire token after 2 minutes
      timer = setTimeout(async () => {
        setQrStatus("expired");
        if (subscription) {
          supabase.removeChannel(subscription);
        }
        await supabase.from("device_links").delete().eq("session_token", token);
      }, 120000);
    };

    startQrLogin();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
      if (timer) clearTimeout(timer);
    };
  }, [qrTrigger]);

  const [loginMode, setLoginMode] = useState<"qr" | "email">(Platform.OS === 'web' ? "qr" : "email");

  const login = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter your email and password");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        Alert.alert("Login Failed", error.message);
        return;
      }

      if (data.user) {
        await supabase
          .from("profiles")
          .update({ is_online: true, last_seen: new Date().toISOString() })
          .eq("id", data.user.id);

        const { data: myChats } = await supabase
          .from("chat_members")
          .select("chat_id")
          .eq("user_id", data.user.id);

        if (myChats && myChats.length > 0) {
          const chatIds = myChats.map((c) => c.chat_id);
          await supabase
            .from("messages")
            .update({ is_delivered: true })
            .in("chat_id", chatIds)
            .neq("sender_id", data.user.id)
            .eq("is_delivered", false);
        }
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.backgroundDecoration}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerArea}>
          <View style={styles.logoContainer}>
             <Text style={styles.logoEmoji}>💬</Text>
          </View>
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.subText}>Sign in to continue your conversations</Text>
        </View>

        <View style={Platform.OS === 'web' ? styles.webCardWrapper : null}>
          {Platform.OS === 'web' && loginMode === "qr" ? (
            /* WhatsApp Web QR Login Layout */
            <View style={styles.webContainer}>
              <View style={styles.webLeftCol}>
                <Text style={styles.webTitle}>Use BlinkChat on your computer</Text>
                
                <View style={styles.webStepList}>
                  <View style={styles.webStepItem}>
                    <View style={styles.webStepNumber}>
                      <Text style={styles.webStepNumberText}>1</Text>
                    </View>
                    <Text style={styles.webStepText}>
                      Open <Text style={styles.webStepHighlight}>BlinkChat</Text> on your phone
                    </Text>
                  </View>

                  <View style={styles.webStepItem}>
                    <View style={styles.webStepNumber}>
                      <Text style={styles.webStepNumberText}>2</Text>
                    </View>
                    <Text style={styles.webStepText}>
                      Tap <Text style={styles.webStepHighlight}>Settings ⚙️</Text> and select <Text style={styles.webStepHighlight}>Linked Devices</Text>
                    </Text>
                  </View>

                  <View style={styles.webStepItem}>
                    <View style={styles.webStepNumber}>
                      <Text style={styles.webStepNumberText}>3</Text>
                    </View>
                    <Text style={styles.webStepText}>
                      Tap <Text style={styles.webStepHighlight}>Link a Device</Text>
                    </Text>
                  </View>

                  <View style={styles.webStepItem}>
                    <View style={styles.webStepNumber}>
                      <Text style={styles.webStepNumberText}>4</Text>
                    </View>
                    <Text style={styles.webStepText}>
                      Point your phone to this screen to scan the QR code
                    </Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.switchBtn} 
                  onPress={() => setLoginMode("email")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.switchBtnText}>Sign in with Email & Password instead</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.webRightCol}>
                <View style={styles.qrBox}>
                  {qrLoading ? (
                    <ActivityIndicator size="large" color="#2563EB" />
                  ) : qrStatus === "waiting" && sessionToken ? (
                    <Image
                      source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${sessionToken}` }}
                      style={styles.qrImage}
                    />
                  ) : qrStatus === "scanned" ? (
                    <View style={styles.qrOverlay}>
                      <Text style={styles.qrSuccessText}>Scanned!</Text>
                      <Text style={[styles.qrDesc, { marginTop: 4, marginBottom: 8 }]}>Logging you in...</Text>
                      <ActivityIndicator size="small" color="#16A34A" />
                    </View>
                  ) : qrStatus === "expired" ? (
                    <TouchableOpacity style={styles.qrOverlay} onPress={() => setQrTrigger(prev => prev + 1)}>
                      <Text style={styles.qrExpiredText}>QR Code Expired</Text>
                      <Text style={styles.qrRefreshText}>Tap to Refresh</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          ) : (
            /* Email Login Layout (Mobile default, or Web email mode) */
            <View style={[styles.card, Platform.OS === 'web' && { maxWidth: 500, width: '100%', alignSelf: 'center' }]}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={20} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="email@example.com"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={20} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    {showPassword ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.forgotPass}>
                <Text style={styles.forgotPassText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.loginBtn, loading && styles.btnDisabled]}
                onPress={login}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.loginBtnText}>{loading ? "Verifying..." : "Sign In"}</Text>
                {!loading && <ArrowRight size={20} color="#FFF" style={{ marginLeft: 8 }} />}
              </TouchableOpacity>

              {Platform.OS === 'web' && (
                <TouchableOpacity 
                  style={[styles.switchBtn, { alignSelf: 'center', marginTop: 24 }]} 
                  onPress={() => setLoginMode("qr")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.switchBtnText}>Sign in with QR Code instead</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/register")}>
            <Text style={styles.signUpText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#F8FAFC" },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 40,
  },
  backgroundDecoration: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: -1,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
    backgroundColor: '#DBEAFE',
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: -50,
    left: -50,
    backgroundColor: '#EFF6FF',
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  logoEmoji: { fontSize: 40 },
  welcomeText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  eyeIcon: { padding: 8 },
  forgotPass: {
    alignSelf: 'flex-end',
    marginBottom: 32,
  },
  forgotPassText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
  loginBtn: {
    backgroundColor: '#2563EB',
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  btnDisabled: { backgroundColor: '#93C5FD', shadowOpacity: 0 },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
  },
  footerText: {
    color: '#64748B',
    fontSize: 16,
  },
  signUpText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '700',
  },
  webCardWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    maxWidth: 950,
    width: '100%',
    alignSelf: 'center',
  },
  webContainer: {
    maxWidth: 950,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  webLeftCol: {
    flex: 1.3,
    paddingRight: 40,
    justifyContent: "center",
  },
  webRightCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#F1F5F9",
    paddingLeft: 40,
  },
  webTitle: {
    fontSize: 28,
    fontWeight: "300",
    color: "#1E293B",
    marginBottom: 28,
  },
  webStepList: {
    gap: 16,
    marginBottom: 32,
  },
  webStepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  webStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  webStepNumberText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  webStepText: {
    fontSize: 16,
    color: "#475569",
    lineHeight: 24,
    flex: 1,
  },
  webStepHighlight: {
    fontWeight: "700",
    color: "#0F172A",
  },
  switchBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: "flex-start",
  },
  switchBtnText: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 15,
  },
  qrCard: {
    flex: 1,
    marginLeft: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },
  qrDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  qrBox: {
    width: 220,
    height: 220,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  qrOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  qrSuccessText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16A34A',
    textAlign: 'center',
  },
  qrExpiredText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 8,
  },
  qrRefreshText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '700',
  },
});