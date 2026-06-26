
import { router } from "expo-router";
import { ArrowLeft, AtSign, Building, Check, Eye, EyeOff, Globe, Lock, Mail, Phone, User, UserPlus } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { APP_CONFIG } from "../../constants/config";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../hooks/use-theme";

const showAlert = (title: string, message: string) => {
  if (Platform.OS === "web") {
    window.alert(title ? `${title}: ${message}` : message);
  } else {
    Alert.alert(title, message);
  }
};

export default function RegisterScreen() {
  const { colors, isDark } = useTheme();
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
      showAlert("Terms & Conditions", "You must agree to the Terms & Conditions to register.");
      return;
    }

    // 2. Validate inputs based on account type
    if (accountType === "individual") {
      if (!fullName.trim() || !username.trim() || !phone.trim() || !email.trim() || !password) {
        showAlert("Error", "Please fill in all fields.");
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
        showAlert("Error", "Please enter Company Name, Branch, City, State, Pincode, Email, Password, and Website.");
        return;
      }
    }

    if (password.length < 6) {
      showAlert("Error", "Password must be at least 6 characters.");
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
        showAlert("Error", "Username already taken. Try another.");
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
        showAlert("Signup Failed", error.message);
        return;
      }

      if (data.user) {
        // If identities is empty, the email is already in use by another account
        if (data.user.identities && data.user.identities.length === 0) {
          showAlert("Signup Failed", "This email is already registered. Please login.");
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
            showAlert("Company Error", companyError.message);
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
          status: accountType === "company" ? `Hey there! We are using ${APP_CONFIG.appName} at ${companyName}` : `Hey there! I am using ${APP_CONFIG.appName}`,
          is_online: true,
          last_seen: new Date().toISOString(),
          company_id: assignedCompanyId,
          is_company_admin: accountType === "company",
          is_company_account: accountType === "company",
        });

        if (profileError) {
          showAlert("Profile Error", profileError.message);
          return;
        }

        if (Platform.OS === "web") {
          window.alert(`Account Created! 🎉\nWelcome to ${APP_CONFIG.appName}! You can now sign in.`);
          router.replace("/(auth)/login");
        } else {
          Alert.alert(
            "Account Created! 🎉",
            `Welcome to ${APP_CONFIG.appName}! You can now sign in.`,
            [{ text: "Sign In", onPress: () => router.replace("/(auth)/login") }]
          );
        }
      }
    } catch (err: any) {
      showAlert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.backgroundDecoration}>
        <View style={[styles.circle, styles.circle1, { backgroundColor: colors.accent, opacity: 0.08 }]} />
        <View style={[styles.circle, styles.circle2, { backgroundColor: colors.accent, opacity: 0.05 }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.cardBg }]} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerArea}>
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Start your journey with {APP_CONFIG.appName}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: 1 }, Platform.OS === 'web' && { maxWidth: 500, width: '100%', alignSelf: 'center' }]}>
          {/* Account Type Segment Selector */}
          <View style={[styles.selectorContainer, { backgroundColor: colors.backgroundElement }]}>
            <TouchableOpacity
              style={[styles.selectorBtn, accountType === "individual" && [styles.selectorBtnActive, { backgroundColor: colors.cardBg }]]}
              onPress={() => setAccountType("individual")}
            >
              <Text style={[styles.selectorBtnText, { color: colors.textSecondary }, accountType === "individual" && [styles.selectorBtnTextActive, { color: colors.text }]]}>
                Individual
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectorBtn, accountType === "company" && [styles.selectorBtnActive, { backgroundColor: colors.cardBg }]]}
              onPress={() => setAccountType("company")}
            >
              <Text style={[styles.selectorBtnText, { color: colors.textSecondary }, accountType === "company" && [styles.selectorBtnTextActive, { color: colors.text }]]}>
                Company Business
              </Text>
            </TouchableOpacity>
          </View>

          {accountType === "company" ? (
            <>
              <InputField
                icon={<Building size={20} color={colors.textSecondary} />}
                label="Company Name"
                placeholder="Google Inc."
                value={companyName}
                onChangeText={setCompanyName}
                onSubmit={() => branchRef.current?.focus()}
              />
              <InputField
                ref={branchRef}
                icon={<Building size={20} color={colors.textSecondary} />}
                label="Company Branch"
                placeholder="Silicon Valley"
                value={companyBranch}
                onChangeText={setCompanyBranch}
                onSubmit={() => cityRef.current?.focus()}
              />
              <InputField
                ref={cityRef}
                icon={<Building size={20} color={colors.textSecondary} />}
                label="City"
                placeholder="Mountain View"
                value={companyCity}
                onChangeText={setCompanyCity}
                onSubmit={() => stateRef.current?.focus()}
              />
              <InputField
                ref={stateRef}
                icon={<Building size={20} color={colors.textSecondary} />}
                label="State"
                placeholder="California"
                value={companyState}
                onChangeText={setCompanyState}
                onSubmit={() => pincodeRef.current?.focus()}
              />
              <InputField
                ref={pincodeRef}
                icon={<Building size={20} color={colors.textSecondary} />}
                label="Pincode"
                placeholder="94043"
                value={companyPincode}
                onChangeText={setCompanyPincode}
                onSubmit={() => websiteRef.current?.focus()}
              />
              <InputField
                ref={websiteRef}
                icon={<Globe size={20} color={colors.textSecondary} />}
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
                icon={<User size={20} color={colors.textSecondary} />}
                label="Full Name"
                placeholder="John Doe"
                value={fullName}
                onChangeText={setFullName}
                onSubmit={() => usernameRef.current?.focus()}
              />
              <InputField
                ref={usernameRef}
                icon={<AtSign size={20} color={colors.textSecondary} />}
                label="Username"
                placeholder="johndoe"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                onSubmit={() => phoneRef.current?.focus()}
              />
              <InputField
                ref={phoneRef}
                icon={<Phone size={20} color={colors.textSecondary} />}
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
            icon={<Mail size={20} color={colors.textSecondary} />}
            label="Email Address"
            placeholder="email@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            onSubmit={() => passwordRef.current?.focus()}
          />

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.backgroundElement }]}>
              <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                ref={passwordRef}
                style={[styles.input, { color: colors.text }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={signUp}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                {showPassword ? <EyeOff size={20} color={colors.textSecondary} /> : <Eye size={20} color={colors.textSecondary} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Terms & Conditions Checkbox */}
          <View style={styles.termsWrapper}>
            <TouchableOpacity
              style={[
                styles.checkbox,
                { borderColor: colors.textSecondary, backgroundColor: colors.cardBg },
                agreed && [styles.checkboxChecked, { backgroundColor: colors.accent, borderColor: colors.accent }]
              ]}
              onPress={() => setAgreed(!agreed)}
              activeOpacity={0.8}
            >
              {agreed && <Check size={12} color="#FFF" />}
            </TouchableOpacity>
            <Text style={[styles.termsText, { color: colors.textSecondary }]}>
              I agree with the{" "}
              <Text style={[styles.termsLink, { color: colors.accent }]} onPress={() => setShowTermsModal(true)}>
                Terms & Conditions
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.btn,
              { backgroundColor: colors.accent, shadowColor: colors.accent },
              loading && { opacity: 0.6 }
            ]}
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
          <Text style={[styles.loginLinkText, { color: colors.textSecondary }]}>
            Already have an account? <Text style={[styles.loginHighlight, { color: colors.accent }]}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Terms & Conditions Modal */}
      <Modal visible={showTermsModal} transparent animationType="fade" onRequestClose={() => setShowTermsModal(false)}>
        <View style={[styles.termsModalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.termsModalContent, { backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: 1 }]}>
            <Text style={[styles.termsModalTitle, { color: colors.text }]}>Terms & Conditions</Text>
            <ScrollView style={styles.termsScrollView} showsVerticalScrollIndicator={false}>
              <Text style={[styles.termsBody, { color: colors.textSecondary }]}>
                Welcome to {APP_CONFIG.appName}! By creating an account, you agree to comply with our user policies.
                {"\n\n"}
                1. Privacy & Protection: We respect your privacy. All media files are automatically deleted after 24 hours from the server storage, but they will be backed up on your local device for offline access.
                {"\n\n"}
                2. Fair Use: You agree not to distribute illegal, offensive, or malicious content through the application.
                {"\n\n"}
                3. Company Accounts: Company administrators are solely responsible for managing their company members and broadcast announcements.
                {"\n\n"}
                4. Data Management: Enabling the auto-delete policy will permanently delete all your chats and media. Please perform regular backups if you wish to keep your records.
                {"\n\n"}
                Thank you for using {APP_CONFIG.appName}!
              </Text>
            </ScrollView>
            
            <TouchableOpacity
              style={[styles.termsAgreeBtn, { backgroundColor: colors.accent }]}
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
  const { colors } = useTheme();
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.inputWrapper, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.inputIcon}>{icon}</View>
        <TextInput
          ref={ref}
          style={[styles.input, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
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
    fontSize: 16,
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



// import { router } from "expo-router";
// import {
//   ArrowLeft,
//   AtSign,
//   Building,
//   Check,
//   Eye,
//   EyeOff,
//   Globe,
//   Lock,
//   Mail,
//   Phone,
//   User,
//   UserPlus,
// } from "lucide-react-native";
// import { useRef, useState } from "react";
// import {
//   Alert,
//   KeyboardAvoidingView,
//   Modal,
//   Platform,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { APP_CONFIG } from "../../constants/config";
// import { supabase } from "../../lib/supabase";

// const IS_WEB = Platform.OS === "web";

// // ─── Shared brand tokens ──────────────────────────────────────────────────────
// const C = {
//   brand: "#4F63F0",
//   brandLight: "#EEF2FF",
//   brandBorder: "#C7D2FE",
//   surface: "#FFFFFF",
//   bg: "#F1F5F9",
//   text: "#0F172A",
//   textSub: "#64748B",
//   textMuted: "#94A3B8",
//   inputBg: "#F8FAFC",
//   inputBorder: "#E2E8F0",
//   success: "#10B981",
//   danger: "#EF4444",
// };

// // ─── Reusable field component ─────────────────────────────────────────────────
// const InputField = ({
//   inputRef,
//   label,
//   placeholder,
//   value,
//   onChangeText,
//   keyboardType = "default",
//   autoCapitalize = "words",
//   onSubmit,
//   icon,
//   secureTextEntry,
//   rightSlot,
// }: any) => {
//   const [focused, setFocused] = useState(false);
//   return (
//     <View style={styles.fieldGroup}>
//       <Text style={styles.fieldLabel}>{label}</Text>
//       <View style={[styles.fieldRow, focused && styles.fieldRowFocused]}>
//         {icon}
//         <TextInput
//           ref={inputRef}
//           style={styles.fieldInput}
//           placeholder={placeholder}
//           placeholderTextColor={C.textMuted}
//           value={value}
//           onChangeText={onChangeText}
//           keyboardType={keyboardType}
//           autoCapitalize={autoCapitalize}
//           autoCorrect={false}
//           secureTextEntry={secureTextEntry}
//           returnKeyType="next"
//           onSubmitEditing={onSubmit}
//           onFocus={() => setFocused(true)}
//           onBlur={() => setFocused(false)}
//         />
//         {rightSlot}
//       </View>
//     </View>
//   );
// };

// export default function RegisterScreen() {
//   const [fullName, setFullName] = useState("");
//   const [username, setUsername] = useState("");
//   const [phone, setPhone] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);
//   const [accountType, setAccountType] = useState<"individual" | "company">("individual");

//   const [companyName, setCompanyName] = useState("");
//   const [companyWebsite, setCompanyWebsite] = useState("");
//   const [companyBranch, setCompanyBranch] = useState("");
//   const [companyCity, setCompanyCity] = useState("");
//   const [companyState, setCompanyState] = useState("");
//   const [companyPincode, setCompanyPincode] = useState("");

//   const [agreed, setAgreed] = useState(false);
//   const [showTermsModal, setShowTermsModal] = useState(false);

//   const usernameRef = useRef<TextInput>(null);
//   const phoneRef = useRef<TextInput>(null);
//   const emailRef = useRef<TextInput>(null);
//   const passwordRef = useRef<TextInput>(null);
//   const websiteRef = useRef<TextInput>(null);
//   const branchRef = useRef<TextInput>(null);
//   const cityRef = useRef<TextInput>(null);
//   const stateRef = useRef<TextInput>(null);
//   const pincodeRef = useRef<TextInput>(null);

//   const signUp = async () => {
//     if (!agreed) {
//       Alert.alert("Terms & Conditions", "You must agree to the Terms & Conditions to register.");
//       return;
//     }
//     if (accountType === "individual") {
//       if (!fullName.trim() || !username.trim() || !phone.trim() || !email.trim() || !password) {
//         Alert.alert("Missing fields", "Please fill in all fields.");
//         return;
//       }
//     } else {
//       if (!companyName.trim() || !companyBranch.trim() || !companyCity.trim() || !companyState.trim() || !companyPincode.trim() || !email.trim() || !password || !companyWebsite.trim()) {
//         Alert.alert("Missing fields", "Please fill in all company fields.");
//         return;
//       }
//     }
//     if (password.length < 6) {
//       Alert.alert("Weak password", "Password must be at least 6 characters.");
//       return;
//     }

//     const usernameClean =
//       accountType === "company"
//         ? companyName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Math.random().toString(36).slice(2, 6)
//         : username.trim().toLowerCase().replace(/\s+/g, "_");

//     try {
//       setLoading(true);

//       const { data: existingUser } = await supabase.from("profiles").select("id").eq("username", usernameClean).maybeSingle();
//       if (existingUser) { Alert.alert("Username taken", "Try a different username."); return; }

//       const { data, error } = await supabase.auth.signUp({
//         email: email.trim().toLowerCase(),
//         password,
//         options: {
//           data: {
//             full_name: accountType === "company" ? companyName.trim() : fullName.trim(),
//             username: usernameClean,
//             company_name: accountType === "company" ? companyName.trim() : null,
//             is_company_admin: accountType === "company",
//             website: accountType === "company" ? companyWebsite.trim() : null,
//           },
//         },
//       });

//       if (error) { Alert.alert("Sign up failed", error.message); return; }

//       if (data.user) {
//         if (data.user.identities && data.user.identities.length === 0) {
//           Alert.alert("Email in use", "This email is already registered. Please sign in.");
//           return;
//         }

//         let assignedCompanyId: string | null = null;

//         if (accountType === "company") {
//           const { data: companyData, error: companyError } = await supabase
//             .from("companies")
//             .insert({ name: companyName.trim(), branch: companyBranch.trim(), city: companyCity.trim(), state: companyState.trim(), pincode: companyPincode.trim(), website: companyWebsite.trim() })
//             .select()
//             .single();
//           if (companyError) { Alert.alert("Company error", companyError.message); return; }
//           if (companyData) assignedCompanyId = companyData.id;
//         }

//         const { error: profileError } = await supabase.from("profiles").upsert({
//           id: data.user.id,
//           full_name: accountType === "company" ? companyName.trim() : fullName.trim(),
//           username: usernameClean,
//           phone: accountType === "company" ? null : phone.trim() || null,
//           email: email.trim().toLowerCase(),
//           status: accountType === "company"
//             ? `Hey there! We are using ${APP_CONFIG.appName} at ${companyName}`
//             : `Hey there! I am using ${APP_CONFIG.appName}`,
//           is_online: true,
//           last_seen: new Date().toISOString(),
//           company_id: assignedCompanyId,
//           is_company_admin: accountType === "company",
//           is_company_account: accountType === "company",
//         });

//         if (profileError) { Alert.alert("Profile error", profileError.message); return; }

//         Alert.alert("Account created! 🎉", `Welcome to ${APP_CONFIG.appName}! You can now sign in.`, [
//           { text: "Sign In", onPress: () => router.replace("/(auth)/login") },
//         ]);
//       }
//     } catch (err: any) {
//       Alert.alert("Error", err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ─── Shared form content ────────────────────────────────────────────────────
//   const renderForm = () => (
//     <>
//       {/* Account type toggle */}
//       <View style={styles.typeToggle}>
//         <TouchableOpacity
//           style={[styles.typeBtn, accountType === "individual" && styles.typeBtnActive]}
//           onPress={() => setAccountType("individual")}
//         >
//           <User size={15} color={accountType === "individual" ? C.brand : C.textMuted} />
//           <Text style={[styles.typeBtnText, accountType === "individual" && styles.typeBtnTextActive]}>
//             Individual
//           </Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={[styles.typeBtn, accountType === "company" && styles.typeBtnActive]}
//           onPress={() => setAccountType("company")}
//         >
//           <Building size={15} color={accountType === "company" ? C.brand : C.textMuted} />
//           <Text style={[styles.typeBtnText, accountType === "company" && styles.typeBtnTextActive]}>
//             Company
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* Individual fields */}
//       {accountType === "individual" ? (
//         <>
//           <InputField
//             label="Full Name"
//             placeholder="John Doe"
//             value={fullName}
//             onChangeText={setFullName}
//             icon={<User size={18} color={C.textMuted} />}
//             onSubmit={() => usernameRef.current?.focus()}
//           />
//           <InputField
//             inputRef={usernameRef}
//             label="Username"
//             placeholder="johndoe"
//             value={username}
//             onChangeText={setUsername}
//             autoCapitalize="none"
//             icon={<AtSign size={18} color={C.textMuted} />}
//             onSubmit={() => phoneRef.current?.focus()}
//           />
//           <InputField
//             inputRef={phoneRef}
//             label="Phone Number"
//             placeholder="+1 234 567 890"
//             value={phone}
//             onChangeText={setPhone}
//             keyboardType="phone-pad"
//             icon={<Phone size={18} color={C.textMuted} />}
//             onSubmit={() => emailRef.current?.focus()}
//           />
//         </>
//       ) : (
//         <>
//           <InputField
//             label="Company Name"
//             placeholder="Acme Corp."
//             value={companyName}
//             onChangeText={setCompanyName}
//             icon={<Building size={18} color={C.textMuted} />}
//             onSubmit={() => branchRef.current?.focus()}
//           />
//           <InputField
//             inputRef={branchRef}
//             label="Branch"
//             placeholder="Head Office"
//             value={companyBranch}
//             onChangeText={setCompanyBranch}
//             icon={<Building size={18} color={C.textMuted} />}
//             onSubmit={() => cityRef.current?.focus()}
//           />

//           {/* City + State side-by-side */}
//           <View style={styles.twoCol}>
//             <View style={{ flex: 1 }}>
//               <InputField
//                 inputRef={cityRef}
//                 label="City"
//                 placeholder="Mumbai"
//                 value={companyCity}
//                 onChangeText={setCompanyCity}
//                 icon={<Building size={18} color={C.textMuted} />}
//                 onSubmit={() => stateRef.current?.focus()}
//               />
//             </View>
//             <View style={{ flex: 1 }}>
//               <InputField
//                 inputRef={stateRef}
//                 label="State"
//                 placeholder="Maharashtra"
//                 value={companyState}
//                 onChangeText={setCompanyState}
//                 icon={<Building size={18} color={C.textMuted} />}
//                 onSubmit={() => pincodeRef.current?.focus()}
//               />
//             </View>
//           </View>

//           <InputField
//             inputRef={pincodeRef}
//             label="Pincode"
//             placeholder="400001"
//             value={companyPincode}
//             onChangeText={setCompanyPincode}
//             keyboardType="number-pad"
//             icon={<Building size={18} color={C.textMuted} />}
//             onSubmit={() => websiteRef.current?.focus()}
//           />
//           <InputField
//             inputRef={websiteRef}
//             label="Website"
//             placeholder="https://yourcompany.com"
//             value={companyWebsite}
//             onChangeText={setCompanyWebsite}
//             autoCapitalize="none"
//             icon={<Globe size={18} color={C.textMuted} />}
//             onSubmit={() => emailRef.current?.focus()}
//           />
//         </>
//       )}

//       {/* Email */}
//       <InputField
//         inputRef={emailRef}
//         label="Email address"
//         placeholder="you@example.com"
//         value={email}
//         onChangeText={setEmail}
//         keyboardType="email-address"
//         autoCapitalize="none"
//         icon={<Mail size={18} color={C.textMuted} />}
//         onSubmit={() => passwordRef.current?.focus()}
//       />

//       {/* Password */}
//       <InputField
//         inputRef={passwordRef}
//         label="Password"
//         placeholder="Min. 6 characters"
//         value={password}
//         onChangeText={setPassword}
//         autoCapitalize="none"
//         secureTextEntry={!showPassword}
//         icon={<Lock size={18} color={C.textMuted} />}
//         onSubmit={signUp}
//         rightSlot={
//           <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
//             {showPassword ? <EyeOff size={18} color={C.textMuted} /> : <Eye size={18} color={C.textMuted} />}
//           </TouchableOpacity>
//         }
//       />

//       {/* Password strength hint */}
//       {password.length > 0 && (
//         <View style={styles.strengthRow}>
//           {[1, 2, 3, 4].map((n) => (
//             <View
//               key={n}
//               style={[
//                 styles.strengthBar,
//                 password.length >= n * 3 && {
//                   backgroundColor:
//                     password.length < 6 ? "#F59E0B"
//                     : password.length < 10 ? C.brand
//                     : C.success,
//                 },
//               ]}
//             />
//           ))}
//           <Text style={styles.strengthLabel}>
//             {password.length < 6 ? "Too short" : password.length < 10 ? "Good" : "Strong"}
//           </Text>
//         </View>
//       )}

//       {/* Terms */}
//       <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.7}>
//         <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
//           {agreed && <Check size={11} color="#FFF" strokeWidth={3} />}
//         </View>
//         <Text style={styles.termsText}>
//           I agree to the{" "}
//           <Text
//             style={styles.termsLink}
//             onPress={(e) => {
//               e.stopPropagation?.();
//               setShowTermsModal(true);
//             }}
//           >
//             Terms & Conditions
//           </Text>
//         </Text>
//       </TouchableOpacity>

//       {/* Submit */}
//       <TouchableOpacity
//         style={[styles.primaryBtn, (loading || !agreed) && styles.primaryBtnDisabled]}
//         onPress={signUp}
//         disabled={loading || !agreed}
//         activeOpacity={0.85}
//       >
//         {loading ? (
//           <Text style={styles.primaryBtnText}>Creating account…</Text>
//         ) : (
//           <>
//             <Text style={styles.primaryBtnText}>Create Account</Text>
//             <UserPlus size={18} color="#FFF" />
//           </>
//         )}
//       </TouchableOpacity>
//     </>
//   );

//   return (
//     <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
//       {/* Decorative blobs */}
//       {!IS_WEB && (
//         <View style={StyleSheet.absoluteFill} pointerEvents="none">
//           <View style={styles.blob1} />
//           <View style={styles.blob2} />
//         </View>
//       )}

//       {IS_WEB ? (
//         // ─── Web: two-column ─────────────────────────────────────────────────
//         <View style={styles.webRoot}>
//           {/* Left brand panel */}
//           <View style={styles.webLeft}>
//             <View style={styles.webLeftInner}>
//               <View style={styles.webLogoBox}>
//                 <Text style={styles.logoEmoji}>💬</Text>
//               </View>
//               <Text style={styles.webBrandName}>{APP_CONFIG.appName}</Text>
//               <Text style={styles.webBrandTagline}>
//                 Create your account and{"\n"}start chatting in seconds.
//               </Text>

//               <View style={styles.webBullets}>
//                 {[
//                   { icon: "👤", text: "Personal accounts for individuals" },
//                   { icon: "🏢", text: "Company accounts for your team" },
//                   { icon: "🔐", text: "Your data stays private and secure" },
//                   { icon: "📱", text: "Works on iOS, Android & web" },
//                 ].map((b, i) => (
//                   <View key={i} style={styles.webBulletItem}>
//                     <Text style={styles.webBulletIcon}>{b.icon}</Text>
//                     <Text style={styles.webBulletText}>{b.text}</Text>
//                   </View>
//                 ))}
//               </View>
//             </View>
//           </View>

//           {/* Right form panel */}
//           <View style={styles.webRight}>
//             <ScrollView contentContainerStyle={styles.webFormScroll} showsVerticalScrollIndicator={false}>
//               <Text style={styles.webFormTitle}>Create your account</Text>
//               <Text style={styles.webFormSub}>Fill in your details below to get started.</Text>

//               <View style={styles.webFormCard}>{renderForm()}</View>

//               <View style={styles.footerRow}>
//                 <Text style={styles.footerText}>Already have an account? </Text>
//                 <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
//                   <Text style={styles.footerLink}>Sign In</Text>
//                 </TouchableOpacity>
//               </View>
//             </ScrollView>
//           </View>
//         </View>
//       ) : (
//         // ─── Mobile ────────────────────────────────────────────────────────────
//         <ScrollView contentContainerStyle={styles.mobileContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
//           {/* Back */}
//           <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
//             <ArrowLeft size={22} color={C.text} />
//           </TouchableOpacity>

//           {/* Header */}
//           <View style={styles.mobileHeader}>
//             <Text style={styles.mobileTitle}>Create account</Text>
//             <Text style={styles.mobileSub}>Join {APP_CONFIG.appName} in just a few steps</Text>
//           </View>

//           {/* Card */}
//           <View style={styles.mobileCard}>{renderForm()}</View>

//           <View style={styles.footerRow}>
//             <Text style={styles.footerText}>Already have an account? </Text>
//             <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
//               <Text style={styles.footerLink}>Sign In</Text>
//             </TouchableOpacity>
//           </View>
//         </ScrollView>
//       )}

//       {/* Terms Modal */}
//       <Modal visible={showTermsModal} transparent animationType="fade" onRequestClose={() => setShowTermsModal(false)}>
//         <View style={styles.termsOverlay}>
//           <View style={styles.termsModal}>
//             <View style={styles.termsModalHeader}>
//               <Text style={styles.termsModalTitle}>Terms & Conditions</Text>
//               <TouchableOpacity onPress={() => setShowTermsModal(false)} style={styles.termsCloseBtn}>
//                 <Text style={styles.termsCloseBtnText}>✕</Text>
//               </TouchableOpacity>
//             </View>
//             <ScrollView style={styles.termsScroll} showsVerticalScrollIndicator={false}>
//               <Text style={styles.termsBody}>
//                 Welcome to {APP_CONFIG.appName}! By creating an account, you agree to our policies below.
//                 {"\n\n"}
//                 <Text style={styles.termsBold}>1. Privacy & Data Protection</Text>
//                 {"\n"}All media files are automatically deleted after 24 hours from our servers, but backed up on your local device for offline access.
//                 {"\n\n"}
//                 <Text style={styles.termsBold}>2. Fair Use</Text>
//                 {"\n"}You agree not to distribute illegal, offensive, or malicious content through the application.
//                 {"\n\n"}
//                 <Text style={styles.termsBold}>3. Company Accounts</Text>
//                 {"\n"}Company administrators are solely responsible for managing their members and broadcast announcements.
//                 {"\n\n"}
//                 <Text style={styles.termsBold}>4. Data Management</Text>
//                 {"\n"}Enabling the auto-delete policy permanently deletes all your chats and media. Please back up data you wish to keep.
//                 {"\n\n"}
//                 Thank you for choosing {APP_CONFIG.appName}!
//               </Text>
//             </ScrollView>
//             <TouchableOpacity
//               style={styles.termsAgreeBtn}
//               onPress={() => { setAgreed(true); setShowTermsModal(false); }}
//               activeOpacity={0.85}
//             >
//               <Check size={16} color="#FFF" />
//               <Text style={styles.termsAgreeBtnText}>Agree & Continue</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </KeyboardAvoidingView>
//   );
// }

// const styles = StyleSheet.create({
//   flex: { flex: 1, backgroundColor: C.bg },

//   // ─── Blobs ────────────────────────────────────────────────────────────────
//   blob1: {
//     position: "absolute",
//     width: 280,
//     height: 280,
//     borderRadius: 140,
//     backgroundColor: C.brandLight,
//     top: -80,
//     left: -100,
//     opacity: 0.6,
//   },
//   blob2: {
//     position: "absolute",
//     width: 180,
//     height: 180,
//     borderRadius: 90,
//     backgroundColor: "#E0F2FE",
//     bottom: 80,
//     right: -60,
//     opacity: 0.5,
//   },

//   // ─── Mobile ───────────────────────────────────────────────────────────────
//   mobileContainer: {
//     flexGrow: 1,
//     paddingHorizontal: 24,
//     paddingTop: 56,
//     paddingBottom: 48,
//   },
//   backBtn: {
//     width: 44,
//     height: 44,
//     borderRadius: 14,
//     backgroundColor: C.surface,
//     justifyContent: "center",
//     alignItems: "center",
//     marginBottom: 28,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 3 },
//     shadowOpacity: 0.06,
//     shadowRadius: 8,
//     elevation: 2,
//   },
//   mobileHeader: { marginBottom: 28 },
//   mobileTitle: {
//     fontSize: 30,
//     fontWeight: "800",
//     color: C.text,
//     letterSpacing: -0.6,
//   },
//   mobileSub: { fontSize: 15, color: C.textSub, marginTop: 6 },
//   mobileCard: {
//     backgroundColor: C.surface,
//     borderRadius: 28,
//     padding: 24,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 14 },
//     shadowOpacity: 0.07,
//     shadowRadius: 24,
//     elevation: 14,
//   },
//   logoEmoji: { fontSize: 34 },

//   // ─── Account type toggle ──────────────────────────────────────────────────
//   typeToggle: {
//     flexDirection: "row",
//     backgroundColor: C.bg,
//     borderRadius: 14,
//     padding: 4,
//     marginBottom: 22,
//   },
//   typeBtn: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 6,
//     paddingVertical: 10,
//     borderRadius: 10,
//   },
//   typeBtnActive: {
//     backgroundColor: C.surface,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.05,
//     shadowRadius: 5,
//     elevation: 2,
//   },
//   typeBtnText: { fontSize: 13, fontWeight: "600", color: C.textMuted },
//   typeBtnTextActive: { color: C.brand, fontWeight: "700" },

//   // ─── Two-column row ────────────────────────────────────────────────────────
//   twoCol: { flexDirection: "row", gap: 12 },

//   // ─── Shared field ─────────────────────────────────────────────────────────
//   fieldGroup: { marginBottom: 16 },
//   fieldLabel: { fontSize: 12, fontWeight: "700", color: "#334155", marginBottom: 7, letterSpacing: 0.2 },
//   fieldRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: C.inputBg,
//     borderRadius: 12,
//     paddingHorizontal: 12,
//     height: 50,
//     borderWidth: 1.5,
//     borderColor: C.inputBorder,
//     gap: 9,
//   },
//   fieldRowFocused: {
//     borderColor: C.brand,
//     backgroundColor: "#FAFBFF",
//     shadowColor: C.brand,
//     shadowOffset: { width: 0, height: 0 },
//     shadowOpacity: 0.1,
//     shadowRadius: 5,
//     elevation: 1,
//   },
//   fieldInput: { flex: 1, fontSize: 14, color: C.text, fontWeight: "500" },
//   eyeBtn: { padding: 4 },

//   // ─── Password strength ─────────────────────────────────────────────────────
//   strengthRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: -8, marginBottom: 10 },
//   strengthBar: {
//     flex: 1,
//     height: 3,
//     borderRadius: 2,
//     backgroundColor: C.inputBorder,
//   },
//   strengthLabel: { fontSize: 11, color: C.textMuted, fontWeight: "600", marginLeft: 4, minWidth: 44 },

//   // ─── Terms ────────────────────────────────────────────────────────────────
//   termsRow: { flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 10 },
//   checkbox: {
//     width: 20,
//     height: 20,
//     borderRadius: 6,
//     borderWidth: 2,
//     borderColor: C.textMuted,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: C.surface,
//     flexShrink: 0,
//   },
//   checkboxChecked: { backgroundColor: C.brand, borderColor: C.brand },
//   termsText: { fontSize: 13, color: C.textSub, flex: 1, lineHeight: 19 },
//   termsLink: { color: C.brand, fontWeight: "700" },

//   // ─── Primary button ───────────────────────────────────────────────────────
//   primaryBtn: {
//     backgroundColor: C.brand,
//     height: 54,
//     borderRadius: 14,
//     flexDirection: "row",
//     justifyContent: "center",
//     alignItems: "center",
//     gap: 8,
//     shadowColor: C.brand,
//     shadowOffset: { width: 0, height: 7 },
//     shadowOpacity: 0.28,
//     shadowRadius: 12,
//     elevation: 7,
//   },
//   primaryBtnDisabled: { backgroundColor: "#A5B4FC", shadowOpacity: 0 },
//   primaryBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },

//   // ─── Footer ───────────────────────────────────────────────────────────────
//   footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 28 },
//   footerText: { color: C.textSub, fontSize: 15 },
//   footerLink: { color: C.brand, fontSize: 15, fontWeight: "700" },

//   // ─── Terms Modal ──────────────────────────────────────────────────────────
//   termsOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     justifyContent: "flex-end",
//   },
//   termsModal: {
//     backgroundColor: C.surface,
//     borderTopLeftRadius: 28,
//     borderTopRightRadius: 28,
//     padding: 24,
//     maxHeight: "80%" as any,
//   },
//   termsModalHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 16,
//   },
//   termsModalTitle: { fontSize: 20, fontWeight: "800", color: C.text },
//   termsCloseBtn: {
//     width: 32,
//     height: 32,
//     borderRadius: 10,
//     backgroundColor: C.bg,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   termsCloseBtnText: { fontSize: 14, color: C.textSub, fontWeight: "700" },
//   termsScroll: { marginBottom: 20 },
//   termsBody: { fontSize: 14, lineHeight: 22, color: "#334155" },
//   termsBold: { fontWeight: "700", color: C.text },
//   termsAgreeBtn: {
//     backgroundColor: C.brand,
//     paddingVertical: 14,
//     borderRadius: 14,
//     alignItems: "center",
//     flexDirection: "row",
//     justifyContent: "center",
//     gap: 8,
//   },
//   termsAgreeBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },

//   // ─── Web layout ───────────────────────────────────────────────────────────
//   webRoot: { flex: 1, flexDirection: "row", minHeight: "100%" as any },
//   webLeft: {
//     flex: 1,
//     backgroundColor: C.brand,
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 48,
//   },
//   webLeftInner: { maxWidth: 400 },
//   webLogoBox: {
//     width: 64,
//     height: 64,
//     borderRadius: 20,
//     backgroundColor: "rgba(255,255,255,0.18)",
//     justifyContent: "center",
//     alignItems: "center",
//     marginBottom: 18,
//   },
//   webBrandName: {
//     fontSize: 34,
//     fontWeight: "800",
//     color: "#FFF",
//     letterSpacing: -0.7,
//     marginBottom: 10,
//   },
//   webBrandTagline: {
//     fontSize: 18,
//     color: "rgba(255,255,255,0.75)",
//     lineHeight: 28,
//     fontWeight: "400",
//     marginBottom: 36,
//   },
//   webBullets: { gap: 16 },
//   webBulletItem: { flexDirection: "row", alignItems: "center", gap: 14 },
//   webBulletIcon: { fontSize: 20, width: 28 },
//   webBulletText: { fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: "500", flex: 1 },

//   webRight: { flex: 1, backgroundColor: C.surface },
//   webFormScroll: {
//     flexGrow: 1,
//     justifyContent: "center",
//     paddingHorizontal: 52,
//     paddingVertical: 56,
//     maxWidth: 540,
//     width: "100%" as any,
//     alignSelf: "center",
//   },
//   webFormTitle: {
//     fontSize: 28,
//     fontWeight: "800",
//     color: C.text,
//     letterSpacing: -0.5,
//     marginBottom: 6,
//   },
//   webFormSub: { fontSize: 15, color: C.textSub, marginBottom: 24, lineHeight: 22 },
//   webFormCard: {
//     backgroundColor: C.surface,
//     borderRadius: 24,
//     padding: 28,
//     borderWidth: 1,
//     borderColor: C.inputBorder,
//     marginBottom: 8,
//   },
// });