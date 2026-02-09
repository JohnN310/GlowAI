import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";


const slides = [
  {
    icon: "❤️",
    title: "Understand what triggers your acne",
    description:
      "Track your skin journey and discover patterns you never noticed before. You deserve clear, healthy skin.",
    color: "#EC4899",
  },
  {
    icon: "✨",
    title: "AI-powered food & skin analysis",
    description:
      "Smart technology that learns from your data to identify connections between your diet, lifestyle, and breakouts.",
    color: "#8B5CF6",
  },
  {
    icon: "📸",
    title: "Personalized treatment, not guesses",
    description:
      "Get insights tailored specifically to you. No more one-size-fits-all solutions or trial and error.",
    color: "#3B82F6",
  },
];


export default function WelcomeScreen() {
  const router = useRouter();

  const [currentSlide, setCurrentSlide] = useState(0);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentSlide]);

  const goToAccountSetup = () => {
    router.push("/AccountSetup"); 
  };


  const goToLogin = () => {
        router.push({
            pathname: "/AccountLogin",
            params: { mode: 'login' },
        });
    };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      goToAccountSetup();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const slide = slides[currentSlide];


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Progress */}
        <View style={styles.progressContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index === currentSlide
                  ? styles.progressDotActive
                  : styles.progressDotInactive,
              ]}
            />
          ))}
        </View>

        {/* Slide */}
        <Animated.View
          style={[
            styles.slideContent,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: slide.color },
              ]}
            >
              <Text style={styles.iconEmoji}>{slide.icon}</Text>
            </View>
          </View>

          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.description}>{slide.description}</Text>
        </Animated.View>

        {/* Navigation */}
        <View style={styles.navigation}>
          <Pressable
            onPress={prevSlide}
            disabled={currentSlide === 0}
            style={[
              styles.navButton,
              currentSlide === 0 && styles.navButtonHidden,
            ]}
          >
            <Text style={styles.navButtonText}>←</Text>
          </Pressable>

          <Pressable onPress={goToAccountSetup}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>

          <Pressable
            onPress={nextSlide}
            style={[styles.navButton, styles.navButtonPrimary]}
          >
            <Text style={styles.navButtonTextPrimary}>→</Text>
          </Pressable>
        </View>

        {/* Get Started */}
{currentSlide === slides.length - 1 && (
          <View style={styles.buttonStack}>
            <Pressable
              onPress={goToAccountSetup}
              style={styles.getStartedButton}
            >
              <Text style={styles.getStartedButtonText}>
                Get Started
              </Text>
            </Pressable>

            <Pressable
                onPress={goToLogin}
                style={styles.loginLink}
            >
                <Text style={styles.loginLinkText}>
                    I already have an account, Log In
                </Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  progressContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 48,
  },
  progressDot: {
    height: 6,
    borderRadius: 3,
  },
  progressDotActive: {
    width: 32,
    backgroundColor: "#3B82F6",
  },
  progressDotInactive: {
    width: 6,
    backgroundColor: "#D1D5DB",
  },
  slideContent: {
    alignItems: "center",
    width: "100%",
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  iconEmoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 36,
  },
  description: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 64,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  navButtonHidden: {
    opacity: 0,
  },
  navButtonPrimary: {
    backgroundColor: "#3B82F6",
  },
  navButtonText: {
    fontSize: 24,
    color: "#6B7280",
  },
  navButtonTextPrimary: {
    fontSize: 24,
    color: "#FFFFFF",
  },
  skipText: {
    fontSize: 16,
    color: "#6B7280",
  },
  getStartedButton: {
    width: "100%",
    backgroundColor: "#3B82F6",
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 32,
  },
  getStartedButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  buttonStack: { 
      width: "100%", 
      marginTop: 32 
  },
  loginLink: {
      paddingVertical: 12,
      marginTop: 8,
  },
  loginLinkText: {
      color: "#3B82F6",
      fontSize: 15,
      textAlign: 'center',
      fontWeight: '500'
  }
});
