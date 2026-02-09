import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../FirebaseConfig';

export default function AccountSetup() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSignup = async () => {
    if (!email || !password) {
      setError("Please enter a valid email and password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      console.log("Firebase User signed up:", userCredential.user.email);
      
      router.push("/SkinProfileSetup");

    } catch (err) {
      console.error("Firebase Sign-up Error:", err);
      
      let displayError = "An unknown error occurred during signup.";
      if (typeof err === 'object' && err !== null && 'code' in err) {
        const errorCode = err.code;
        if (errorCode === 'auth/email-already-in-use') {
          displayError = 'This email is already in use. Try logging in.';
        } else if (errorCode === 'auth/invalid-email') {
          displayError = 'The email address is not valid.';
        } else if (errorCode === 'auth/weak-password') {
          displayError = 'Password is too weak.';
        }
      }
      setError(displayError);
    } finally {
      setIsLoading(false);
    }
  };
  //@ts-ignore
  const handleSocialSignup = (provider) => {
    console.log(`Sign up with ${provider}`);
    router.push("/SkinProfileSetup");
  };

  const handleAnonymous = () => {
    router.push("/SkinProfileSetup");
  };

  const goToLogin = () => {
    router.push("/AccountLogin"); 
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Create your account</Text>
            <Text style={styles.headerSubtitle}>
              Start your journey to clearer skin today
            </Text>
          </View>

          {/* Social Sign-up */}
          <View style={styles.socialButtons}>
            <Pressable onPress={() => handleSocialSignup("Google")} style={styles.socialButton}>
              <View style={styles.googleIcon}><Text style={styles.googleIconText}>G</Text></View>
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </Pressable>

            <Pressable onPress={() => handleSocialSignup("Apple")} style={[styles.socialButton, styles.appleButton]}>
              <View style={styles.appleIcon} />
              <Text style={styles.appleButtonText}>Continue with Apple</Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email Form */}
          <View style={styles.emailForm}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password (min 6 chars)"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={true}
                autoCapitalize="none"
              />
            </View>
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              onPress={handleEmailSignup}
              disabled={isLoading || !email || !password} 
              style={[styles.emailButton, (isLoading || !email || !password) && styles.emailButtonDisabled]}
            >
              {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.emailButtonText}>Continue with Email</Text>}
            </Pressable>

            {/* Switch to the Login file */}
            <Pressable onPress={goToLogin} style={styles.toggleModeButton}>
                <Text style={styles.toggleModeText}>
                    Already have an account? <Text style={{fontWeight: '700'}}>Log In</Text>
                </Text>
            </Pressable>
          </View>

          {/* Anonymous Mode */}
          <View style={styles.anonymousSection}>
            <View style={styles.anonymousDivider} />
            <Pressable onPress={handleAnonymous} style={styles.anonymousButton}>
              <Text style={styles.anonymousIcon}>👤</Text>
              <Text style={styles.anonymousButtonText}>Continue anonymously</Text>
            </Pressable>
          </View>

          {/* Terms */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By continuing, you agree to our <Text style={styles.termsLink}>Terms of Service</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FF" },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 16 },
  header: { marginBottom: 40 },
  headerTitle: { fontSize: 32, fontWeight: "600", color: "#111827", marginBottom: 12 },
  headerSubtitle: { fontSize: 16, color: "#6B7280", lineHeight: 24 },
  socialButtons: { gap: 12, marginBottom: 24 },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  googleIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#4285F4", justifyContent: "center", alignItems: "center" },
  googleIconText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  socialButtonText: { fontSize: 16, color: "#374151", fontWeight: "500" },
  appleButton: { backgroundColor: "#000000", borderColor: "#000000" },
  appleIcon: { width: 20, height: 20 },
  appleIconText: { color: "#FFFFFF", fontSize: 20 },
  appleButtonText: { fontSize: 16, color: "#FFFFFF", fontWeight: "500" },
  dividerContainer: { flexDirection: "row", alignItems: "center", marginVertical: 32 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  dividerText: { paddingHorizontal: 16, fontSize: 14, color: "#6B7280" },
  emailForm: { marginBottom: 24 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 2, borderColor: "#E5E7EB", paddingHorizontal: 16, marginBottom: 16 },
  inputIcon: { fontSize: 20, marginRight: 12 },
  input: { flex: 1, fontSize: 16, paddingVertical: 14, color: "#111827" },
  emailButton: { backgroundColor: "#3B82F6", paddingVertical: 14, borderRadius: 12, shadowColor: "#3B82F6", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, marginTop: 10 }, // Added marginTop for spacing
  emailButtonDisabled: { opacity: 0.5 },
  emailButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600", textAlign: "center" },
  anonymousSection: { paddingTop: 24, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  anonymousDivider: { marginBottom: 24 },
  anonymousButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, borderColor: "#D1D5DB", borderStyle: "dashed", gap: 12, marginBottom: 12 },
  anonymousIcon: { fontSize: 20 },
  anonymousButtonText: { fontSize: 16, color: "#6B7280", fontWeight: "500" },
  anonymousDescription: { fontSize: 14, color: "#9CA3AF", textAlign: "center", lineHeight: 20 },
  termsContainer: { marginTop: 32, marginBottom: 16 },
  termsText: { fontSize: 14, color: "#9CA3AF", textAlign: "center", lineHeight: 20 },
  termsLink: { color: "#3B82F6" },
  backButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: "#F3F4F6",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 16,
},
backButtonText: {
  fontSize: 24,
  color: "#6B7280",
},
errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
},
toggleModeButton: {
    marginTop: 16,
    paddingVertical: 8,
},
toggleModeText: {
    textAlign: 'center',
    fontSize: 15,
    color: '#3B82F6',
    fontWeight: '500',
},
});