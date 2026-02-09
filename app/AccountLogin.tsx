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

import { doc, getDoc } from 'firebase/firestore';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../FirebaseConfig';


export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

const handleEmailLogin = async () => {
  if (!email || !password) {
    setError("Please enter both your email and password.");
    return;
  }

  setIsLoading(true);
  setError("");

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log("Profile found, navigating to Home");
      router.replace("/Home"); 
    } else {
      console.log("No profile found, navigating to Setup");
      router.replace("/SkinProfileSetup");
    }

  } catch (err) {
    let errorMessage = 'An unknown error occurred during login.';
    if (typeof err === 'object' && err !== null && 'code' in err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password.';
      } else {
        // @ts-ignore
        errorMessage = err.message;
      }
    }
    setError(errorMessage);
  } finally {
    setIsLoading(false);
  }
};
  const goToSignup = () => {
    router.push("/AccountSetup");
  }


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
            <Text style={styles.headerTitle}>Welcome Back</Text>
            <Text style={styles.headerSubtitle}>
              Sign in to continue your journey
            </Text>
          </View>
          
          {/* Email Form */}
          <View style={styles.emailForm}>
            {/* Email Input */}
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
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={true} 
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>
            
            {/* Error Message Display */}
            {error ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : null}

            {/* Login Button */}
            <Pressable
              onPress={handleEmailLogin}
              disabled={isLoading || !email || !password} 
              style={[
                styles.emailButton,
                (isLoading || !email || !password) && styles.emailButtonDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.emailButtonText}>Log In</Text>
              )}
            </Pressable>
          </View>
          
          {/* Signup Link */}
          <Pressable onPress={goToSignup} style={styles.toggleModeButton}>
                <Text style={styles.toggleModeText}>
                    Don't have an account? <Text style={{fontWeight: '600'}}>Sign Up</Text>
                </Text>
          </Pressable>


          {/* Terms */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By continuing, you agree to our{" "}
              <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>
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
  emailForm: { marginBottom: 24 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 2, borderColor: "#E5E7EB", paddingHorizontal: 16, marginBottom: 16 },
  inputIcon: { fontSize: 20, marginRight: 12 },
  input: { flex: 1, fontSize: 16, paddingVertical: 14, color: "#111827" },
  emailButton: { backgroundColor: "#3B82F6", paddingVertical: 14, borderRadius: 12, shadowColor: "#3B82F6", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, marginTop: 10 },
  emailButtonDisabled: { opacity: 0.5 },
  emailButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600", textAlign: "center" },
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