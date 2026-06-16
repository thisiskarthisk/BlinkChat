// // import { COLORS } from "@/constants/colors";
// // import { router } from "expo-router";
// // import { useState } from "react";
// // import {
// //   Alert,
// //   StyleSheet,
// //   Text,
// //   TextInput,
// //   TouchableOpacity,
// //   View,
// // } from "react-native";
// // import { supabase } from "../../lib/supabase";

// // export default function LoginScreen() {
// //   const [email, setEmail] = useState("");
// //   const [password, setPassword] = useState("");

// //   const login = async () => {
// //     const { error } = await supabase.auth.signInWithPassword({
// //       email,
// //       password,
// //     });

// //     if (error) {
// //       Alert.alert("Login Failed", error.message);
// //       return;
// //     }
// //   };

// //   return (
// //     <View style={styles.container}>
// //       <Text style={styles.title}>BlinkChat Login</Text>

// //       <TextInput
// //         style={styles.input}
// //         placeholder="Email"
// //         autoCapitalize="none"
// //         value={email}
// //         onChangeText={setEmail}
// //       />

// //       <TextInput
// //         style={styles.input}
// //         placeholder="Password"
// //         secureTextEntry
// //         value={password}
// //         onChangeText={setPassword}
// //       />

// //       <TouchableOpacity style={styles.btn} onPress={login}>
// //         <Text style={styles.btnText}>Login</Text>
// //       </TouchableOpacity>

// //       <TouchableOpacity
// //         onPress={() => router.push("/register")}
// //       >
// //         <Text style={{ marginTop: 20 }}>
// //           Create New Account
// //         </Text>
// //       </TouchableOpacity>
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //  container: {
// //   flex: 1,
// //   justifyContent: "center",
// //   padding: 20,
// //   backgroundColor: COLORS.background,
// // },

// // title: {
// //   fontSize: 30,
// //   fontWeight: "bold",
// //   color: COLORS.text,
// //   textAlign: "center",
// //   marginBottom: 30,
// // },

// // input: {
// //   backgroundColor: COLORS.card,
// //   borderWidth: 1,
// //   borderColor: COLORS.border,
// //   borderRadius: 12,
// //   padding: 14,
// //   marginBottom: 15,
// // },

// // btn: {
// //   backgroundColor: COLORS.primary,
// //   padding: 15,
// //   borderRadius: 12,
// // },

// // btnText: {
// //   color: "#fff",
// //   textAlign: "center",
// //   fontWeight: "bold",
// //   fontSize: 16,
// // },
// // });



// import { COLORS } from "@/constants/colors";
// import { router } from "expo-router";
// import { useState } from "react";
// import {
//   Alert,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { supabase } from "../../lib/supabase";

// export default function LoginScreen() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);

//   const login = async () => {
//     if (!email || !password) {
//       Alert.alert(
//         "Error",
//         "Enter email and password"
//       );
//       return;
//     }

//     try {
//       setLoading(true);

//       const { data, error } =
//         await supabase.auth.signInWithPassword({
//           email,
//           password,
//         });

//       if (error) {
//         Alert.alert(
//           "Login Failed",
//           error.message
//         );
//         return;
//       }

//       if (data.user) {
//         // Mark self as online
//         await supabase
//           .from("profiles")
//           .update({
//             is_online: true,
//             last_seen: new Date().toISOString(),
//           })
//           .eq("id", data.user.id);

//         // Mark messages sent TO ME as delivered
//         const { data: myChats } = await supabase
//           .from("chat_members")
//           .select("chat_id")
//           .eq("user_id", data.user.id);
        
//         if (myChats && myChats.length > 0) {
//           const chatIds = myChats.map(c => c.chat_id);
//           await supabase
//             .from("messages")
//             .update({ is_delivered: true })
//             .in("chat_id", chatIds)
//             .neq("sender_id", data.user.id)
//             .eq("is_delivered", false);
//         }
//       }

//       router.replace("/(tabs)");
//     } catch (err: any) {
//       Alert.alert(
//         "Error",
//         err.message
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>
//         BlinkChat
//       </Text>

//       <TextInput
//         style={styles.input}
//         placeholder="Email"
//         placeholderTextColor="#999"
//         autoCapitalize="none"
//         keyboardType="email-address"
//         value={email}
//         onChangeText={setEmail}
//       />

//       <TextInput
//         style={styles.input}
//         placeholder="Password"
//         placeholderTextColor="#999"
//         secureTextEntry
//         value={password}
//         onChangeText={setPassword}
//       />

//       <TouchableOpacity
//         style={styles.btn}
//         onPress={login}
//         disabled={loading}
//       >
//         <Text style={styles.btnText}>
//           {loading
//             ? "Please wait..."
//             : "Login"}
//         </Text>
//       </TouchableOpacity>

//       <TouchableOpacity
//         onPress={() =>
//           router.push("/register")
//         }
//       >
//         <Text style={styles.registerText}>
//           Create New Account
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     padding: 20,
//     backgroundColor:
//       COLORS.background,
//   },

//   title: {
//     fontSize: 32,
//     fontWeight: "bold",
//     color: COLORS.text,
//     textAlign: "center",
//     marginBottom: 30,
//   },

//   input: {
//     backgroundColor: COLORS.card,
//     borderWidth: 1,
//     borderColor: COLORS.border,
//     borderRadius: 12,
//     padding: 14,
//     marginBottom: 15,
//     color: COLORS.text,
//   },

//   btn: {
//     backgroundColor:
//       COLORS.primary,
//     padding: 15,
//     borderRadius: 12,
//   },

//   btnText: {
//     color: "#fff",
//     textAlign: "center",
//     fontWeight: "bold",
//     fontSize: 16,
//   },

//   registerText: {
//     marginTop: 20,
//     textAlign: "center",
//     color: COLORS.primary,
//     fontWeight: "600",
//   },
// });




import { router } from "expo-router";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
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

        <View style={styles.card}>
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
});