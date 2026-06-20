// import { COLORS } from "@/constants/colors";
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

// export default function RegisterScreen() {
//   const [fullName, setFullName] = useState("");
//   const [username, setUsername] = useState("");
//   const [phone, setPhone] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);

//   const signUp = async () => {
//     if (
//       !fullName ||
//       !username ||
//       !phone ||
//       !email ||
//       !password
//     ) {
//       Alert.alert("Error", "Please fill all fields");
//       return;
//     }

//     try {
//       setLoading(true);

//       const { data, error } = await supabase.auth.signUp({
//         email,
//         password,
//       });

//       if (error) {
//         Alert.alert("Signup Failed", error.message);
//         return;
//       }

//       if (data.user) {
//         const { error: profileError } = await supabase
//           .from("profiles")
//           .insert({
//             id: data.user.id,
//             full_name: fullName,
//             username,
//             phone,
//             email,
//           });

//         if (profileError) {
//           Alert.alert("Profile Error", profileError.message);
//           return;
//         }

//         Alert.alert(
//           "Success",
//           "Account created successfully"
//         );

//         setFullName("");
//         setUsername("");
//         setPhone("");
//         setEmail("");
//         setPassword("");
//       }
//     } catch (err: any) {
//       Alert.alert("Error", err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Create Account</Text>

//       <TextInput
//         style={styles.input}
//         placeholder="Full Name"
//         value={fullName}
//         onChangeText={setFullName}
//       />

//       <TextInput
//         style={styles.input}
//         placeholder="Username"
//         value={username}
//         onChangeText={setUsername}
//       />

//       <TextInput
//         style={styles.input}
//         placeholder="Phone Number"
//         keyboardType="phone-pad"
//         value={phone}
//         onChangeText={setPhone}
//       />

//       <TextInput
//         style={styles.input}
//         placeholder="Email"
//         keyboardType="email-address"
//         autoCapitalize="none"
//         value={email}
//         onChangeText={setEmail}
//       />

//       <TextInput
//         style={styles.input}
//         placeholder="Password"
//         secureTextEntry
//         value={password}
//         onChangeText={setPassword}
//       />

//       <TouchableOpacity
//         style={styles.button}
//         onPress={signUp}
//         disabled={loading}
//       >
//         <Text style={styles.buttonText}>
//           {loading ? "Creating..." : "Sign Up"}
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//   flex: 1,
//   justifyContent: "center",
//   padding: 20,
//   backgroundColor: COLORS.background,
// },

// title: {
//   fontSize: 30,
//   fontWeight: "bold",
//   textAlign: "center",
//   color: COLORS.text,
//   marginBottom: 30,
// },

// input: {
//   backgroundColor: COLORS.card,
//   borderWidth: 1,
//   borderColor: COLORS.border,
//   borderRadius: 12,
//   padding: 14,
//   marginBottom: 15,
// },

// button: {
//   backgroundColor: COLORS.primary,
//   padding: 15,
//   borderRadius: 12,
//   alignItems: "center",
// },

// buttonText: {
//   color: "#fff",
//   fontWeight: "bold",
//   fontSize: 16,
// },
// });



import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { User, AtSign, Phone, Mail, Lock, Eye, EyeOff, UserPlus, ArrowLeft, Building, Globe, Check } from "lucide-react-native";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<"individual" | "company">("individual");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyBranch, setCompanyBranch] = useState("");
  const [companyCity, setCompanyCity] = useState("");
  const [companyState, setCompanyState] = useState("");
  const [companyPincode, setCompanyPincode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const usernameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const websiteRef = useRef<TextInput>(null);
  const branchRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const stateRef = useRef<TextInput>(null);
  const pincodeRef = useRef<TextInput>(null);

  const signUp = async () => {
    // 1. Agree to terms check
    if (!agreed) {
      Alert.alert("Terms & Conditions", "You must agree to the Terms & Conditions to register.");
      return;
    }

    // 2. Validate inputs based on account type
    if (accountType === "individual") {
      if (!fullName.trim() || !username.trim() || !phone.trim() || !email.trim() || !password) {
        Alert.alert("Error", "Please fill in all fields.");
        return;
      }
    } else {
      if (
        !companyName.trim() ||
        !companyBranch.trim() ||
        !companyCity.trim() ||
        !companyState.trim() ||
        !companyPincode.trim() ||
        !email.trim() ||
        !password ||
        !companyWebsite.trim()
      ) {
        Alert.alert("Error", "Please enter Company Name, Branch, City, State, Pincode, Email, Password, and Website.");
        return;
      }
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    // Clean username creation
    const usernameClean = accountType === "company"
      ? companyName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Math.random().toString(36).slice(2, 6)
      : username.trim().toLowerCase().replace(/\s+/g, "_");

    try {
      setLoading(true);

      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", usernameClean)
        .maybeSingle();

      if (existingUser) {
        Alert.alert("Error", "Username already taken. Try another.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: accountType === "company" ? companyName.trim() : fullName.trim(),
            username: usernameClean,
            company_name: accountType === "company" ? companyName.trim() : null,
            is_company_admin: accountType === "company",
            website: accountType === "company" ? companyWebsite.trim() : null,
          }
        }
      });

      if (error) {
        Alert.alert("Signup Failed", error.message);
        return;
      }

      if (data.user) {
        // If identities is empty, the email is already in use by another account
        if (data.user.identities && data.user.identities.length === 0) {
          Alert.alert("Signup Failed", "This email is already registered. Please login.");
          return;
        }

        let assignedCompanyId: string | null = null;

        if (accountType === "company") {
          const { data: companyData, error: companyError } = await supabase
            .from("companies")
            .insert({
              name: companyName.trim(),
              branch: companyBranch.trim(),
              city: companyCity.trim(),
              state: companyState.trim(),
              pincode: companyPincode.trim(),
              website: companyWebsite.trim(),
            })
            .select()
            .single();

          if (companyError) {
            Alert.alert("Company Error", companyError.message);
            return;
          }
          if (companyData) {
            assignedCompanyId = companyData.id;
          }
        }

        const { error: profileError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: accountType === "company" ? companyName.trim() : fullName.trim(),
          username: usernameClean,
          phone: accountType === "company" ? null : (phone.trim() || null),
          email: email.trim().toLowerCase(),
          status: accountType === "company" ? `Hey there! We are using BlinkChat at ${companyName}` : "Hey there! I am using BlinkChat",
          is_online: true,
          last_seen: new Date().toISOString(),
          company_id: assignedCompanyId,
          is_company_admin: accountType === "company",
          is_company_account: accountType === "company",
        });

        if (profileError) {
          Alert.alert("Profile Error", profileError.message);
          return;
        }

        Alert.alert(
          "Account Created! 🎉",
          "Welcome to BlinkChat! You can now sign in.",
          [{ text: "Sign In", onPress: () => router.replace("/(auth)/login") }]
        );
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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>

        <View style={styles.headerArea}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start your journey with BlinkChat</Text>
        </View>

        <View style={styles.card}>
          {/* Account Type Segment Selector */}
          <View style={styles.selectorContainer}>
            <TouchableOpacity
              style={[styles.selectorBtn, accountType === "individual" && styles.selectorBtnActive]}
              onPress={() => setAccountType("individual")}
            >
              <Text style={[styles.selectorBtnText, accountType === "individual" && styles.selectorBtnTextActive]}>
                Individual
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectorBtn, accountType === "company" && styles.selectorBtnActive]}
              onPress={() => setAccountType("company")}
            >
              <Text style={[styles.selectorBtnText, accountType === "company" && styles.selectorBtnTextActive]}>
                Company Business
              </Text>
            </TouchableOpacity>
          </View>

          {accountType === "company" ? (
            <>
              <InputField
                icon={<Building size={20} color="#94A3B8" />}
                label="Company Name"
                placeholder="Google Inc."
                value={companyName}
                onChangeText={setCompanyName}
                onSubmit={() => branchRef.current?.focus()}
              />
              <InputField
                ref={branchRef}
                icon={<Building size={20} color="#94A3B8" />}
                label="Company Branch"
                placeholder="Silicon Valley"
                value={companyBranch}
                onChangeText={setCompanyBranch}
                onSubmit={() => cityRef.current?.focus()}
              />
              <InputField
                ref={cityRef}
                icon={<Building size={20} color="#94A3B8" />}
                label="City"
                placeholder="Mountain View"
                value={companyCity}
                onChangeText={setCompanyCity}
                onSubmit={() => stateRef.current?.focus()}
              />
              <InputField
                ref={stateRef}
                icon={<Building size={20} color="#94A3B8" />}
                label="State"
                placeholder="California"
                value={companyState}
                onChangeText={setCompanyState}
                onSubmit={() => pincodeRef.current?.focus()}
              />
              <InputField
                ref={pincodeRef}
                icon={<Building size={20} color="#94A3B8" />}
                label="Pincode"
                placeholder="94043"
                value={companyPincode}
                onChangeText={setCompanyPincode}
                onSubmit={() => websiteRef.current?.focus()}
              />
              <InputField
                ref={websiteRef}
                icon={<Globe size={20} color="#94A3B8" />}
                label="Company Website"
                placeholder="https://google.com"
                value={companyWebsite}
                onChangeText={setCompanyWebsite}
                autoCapitalize="none"
                onSubmit={() => emailRef.current?.focus()}
              />
            </>
          ) : (
            <>
              <InputField
                icon={<User size={20} color="#94A3B8" />}
                label="Full Name"
                placeholder="John Doe"
                value={fullName}
                onChangeText={setFullName}
                onSubmit={() => usernameRef.current?.focus()}
              />
              <InputField
                ref={usernameRef}
                icon={<AtSign size={20} color="#94A3B8" />}
                label="Username"
                placeholder="johndoe"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                onSubmit={() => phoneRef.current?.focus()}
              />
              <InputField
                ref={phoneRef}
                icon={<Phone size={20} color="#94A3B8" />}
                label="Phone Number"
                placeholder="+1 234 567 890"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                onSubmit={() => emailRef.current?.focus()}
              />
            </>
          )}

          <InputField
            ref={emailRef}
            icon={<Mail size={20} color="#94A3B8" />}
            label="Email Address"
            placeholder="email@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            onSubmit={() => passwordRef.current?.focus()}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={signUp}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                {showPassword ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Terms & Conditions Checkbox */}
          <View style={styles.termsWrapper}>
            <TouchableOpacity
              style={[styles.checkbox, agreed && styles.checkboxChecked]}
              onPress={() => setAgreed(!agreed)}
              activeOpacity={0.8}
            >
              {agreed && <Check size={12} color="#FFF" />}
            </TouchableOpacity>
            <Text style={styles.termsText}>
              I agree with the{" "}
              <Text style={styles.termsLink} onPress={() => setShowTermsModal(true)}>
                Terms & Conditions
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={signUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.btnText}>{loading ? "Creating..." : "Create Account"}</Text>
            {!loading && <UserPlus size={20} color="#FFF" style={{ marginLeft: 8 }} />}
          </TouchableOpacity>
        </View>
 
        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.loginLinkText}>
            Already have an account? <Text style={styles.loginHighlight}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Terms & Conditions Modal */}
      <Modal visible={showTermsModal} transparent animationType="fade" onRequestClose={() => setShowTermsModal(false)}>
        <View style={styles.termsModalOverlay}>
          <View style={styles.termsModalContent}>
            <Text style={styles.termsModalTitle}>Terms & Conditions</Text>
            <ScrollView style={styles.termsScrollView} showsVerticalScrollIndicator={false}>
              <Text style={styles.termsBody}>
                Welcome to BlinkChat! By creating an account, you agree to comply with our user policies.
                {"\n\n"}
                1. Privacy & Protection: We respect your privacy. All media files are automatically deleted after 24 hours from the server storage, but they will be backed up on your local device for offline access.
                {"\n\n"}
                2. Fair Use: You agree not to distribute illegal, offensive, or malicious content through the application.
                {"\n\n"}
                3. Company Accounts: Company administrators are solely responsible for managing their company members and broadcast announcements.
                {"\n\n"}
                4. Data Management: Enabling the auto-delete policy will permanently delete all your chats and media. Please perform regular backups if you wish to keep your records.
                {"\n\n"}
                Thank you for using BlinkChat!
              </Text>
            </ScrollView>
            
            <TouchableOpacity
              style={styles.termsAgreeBtn}
              onPress={() => {
                setAgreed(true);
                setShowTermsModal(false);
              }}
            >
              <Text style={styles.termsAgreeBtnText}>Agree & Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function InputField({
  ref,
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  autoCapitalize = "words",
  onSubmit,
  icon,
}: any) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <View style={styles.inputIcon}>{icon}</View>
        <TextInput
          ref={ref}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType="next"
          onSubmitEditing={onSubmit}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#F8FAFC" },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
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
    width: 250,
    height: 250,
    top: -50,
    left: -100,
    backgroundColor: '#DBEAFE',
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: 100,
    right: -50,
    backgroundColor: '#EFF6FF',
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  headerArea: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  eyeIcon: { padding: 8 },
  btn: {
    backgroundColor: '#2563EB',
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  btnDisabled: { backgroundColor: '#93C5FD', shadowOpacity: 0 },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loginLink: {
    marginTop: 32,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#64748B',
    fontSize: 15,
  },
  loginHighlight: {
    color: '#2563EB',
    fontWeight: '700',
  },
  selectorContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  selectorBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  selectorBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  selectorBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  selectorBtnTextActive: {
    color: '#0F172A',
  },
  termsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  termsText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  termsLink: {
    color: '#2563EB',
    fontWeight: '700',
  },
  termsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  termsModalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
  },
  termsModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'center',
  },
  termsScrollView: {
    marginBottom: 20,
  },
  termsBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
  },
  termsAgreeBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  termsAgreeBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});