import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../FirebaseConfig';
import { useTheme } from './theme/ThemeContext';

interface RoutineCardProps {
  title: string;
  subtitle: string;
  emoji: string;
  gradientColors: string[];
  onPress: () => void;
  delay: number;
}

const RoutineCard = ({ title, subtitle, emoji, gradientColors, onPress, delay }: RoutineCardProps) => {
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);
  
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay: delay,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        flex: 1, 
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <TouchableOpacity
        style={styles.cardContainer}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <LinearGradient
        //@ts-ignore
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCard}
        >
          <View style={styles.cardContent}>
            <View style={styles.emojiCircle}>
              <Text style={styles.cardEmoji}>{emoji}</Text>
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardSubtitle}>{subtitle}</Text>
            </View>
            <View style={styles.arrowCircle}>
               <ChevronRight size={20} color="#1E293B" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function RoutineEntryHub() {
  const [userName, setUserName] = useState('Friend');
  const [streak, setStreak] = useState(0);

  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);

  const getYesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserName(userDoc.data().displayName || 'Friend');

        const data = userDoc.data();
        const today = new Date().toISOString().split('T')[0];
        const yesterday = getYesterdayKey();
        if (data.lastStreakDate !== today && data.lastStreakDate !== yesterday) {
          setStreak(0);
        } else {
          setStreak(data.streakCount || 0);
        }
        }
      } catch (error) {
        console.error("Error fetching hub data:", error);
      }
    };

    fetchUserData();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const emoji = hour < 12 ? '🌞' : hour < 18 ? '☀️' : '🌙';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

    <View style={styles.header}>
      <TouchableOpacity 
        onPress={() => router.back()} 
        style={styles.backButton}
        activeOpacity={0.7}
      >
        <View style={styles.backCircle}>
          <ChevronLeft size={24} color={colors.primary} />
        </View>
      </TouchableOpacity>
      
      <View style={styles.headerTextContainer}>
        <Text style={styles.headerTitle}>Skin Hub</Text>
        <Text style={styles.headerSubtitle}>
          {greeting}, {userName}
        </Text>
      </View>

      <View style={styles.headerRightPlaceholder}>
        <View style={styles.streakBadge}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakNumber}>{streak}</Text>
        </View>
      </View>
    </View>

      <View style={styles.cardsContainer}>
      <RoutineCard
        title="Check In"
        subtitle="Record your daily routine completion"
        emoji="✅"
        gradientColors={isDarkMode 
          ? ['#064E3B', '#065F46', '#047857'] 
          : ['#D1FAE5', '#A7F3D0', '#6EE7B7']
        }
        onPress={() => router.push('/DailySkinRitual')}
        delay={0}
      />
      <RoutineCard
        title="Routine Lab"
        subtitle="Customize or learn about your products"
        emoji="🧪"
        gradientColors={isDarkMode 
          ? ['#1E3A8A', '#1E40AF', '#1D4ED8'] 
          : ['#DBEAFE', '#93C5FD', '#60A5FA']
        }
        onPress={() => router.push('/RoutineLabBuilder')}
        delay={100}
      />
      <RoutineCard
        title="Emergency Help"
        subtitle="Dealing with irritation or breakouts?"
        emoji="😖"
        gradientColors={isDarkMode 
          ? ['#78350F', '#92400E', '#B45309'] 
          : ['#FEF3C7', '#FDE68A', '#FCD34D']
        }
        onPress={() => router.push('/SkinCheckScreen')}
        delay={200}
      />
    </View>

      {/* Bottom Footer Anchor */}
      <View style={styles.bottomInfo}>
        <View style={styles.infoCard}>
          <Text style={styles.infoEmoji}>💡</Text>
          <Text style={styles.infoText}>
            Routine leads to results. You're doing great!
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
  },
  // header: {
  //   paddingHorizontal: 24,
  //   paddingTop: 30,
  //   paddingBottom: 20,
  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   alignItems: 'center',
  // },
  greetingText: {
    fontSize: 24,
    fontWeight: '900',
    color: isDarkMode ? '#FFFFFF' : '#1E293B',
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: isDarkMode ? '#94A3B8' : '#64748B',
  },
  // streakBadge: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
  //   paddingHorizontal: 12,
  //   paddingVertical: 8,
  //   borderRadius: 20,
  //   borderWidth: 2,
  //   borderColor: '#FDE68A',
  // },
  streakEmoji: { fontSize: 18 },
  streakNumber: { fontSize: 16, fontWeight: '900', color: isDarkMode ? '#FFFFFF' : '#1E293B', marginLeft: 4 },

  /* Action Buttons Container */
  cardsContainer: {
    flex: 1, 
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 20,
  },

  /* RoutineCard Component Styles */
  cardContainer: {
    flex: 1, 
    borderRadius: 30,
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 4 }, 
    // shadowOpacity: 0.1,                   
    // shadowRadius: 8,                      
    // elevation: 4,                         
  },
  gradientCard: {
    flex: 1, 
    borderRadius: 30,
    padding: 24,
    justifyContent: 'center', 
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  // emojiCircle: {
  //   width: 70, 
  //   height: 70,
  //   borderRadius: 22, 
  //   backgroundColor: 'rgba(255, 255, 255, 0.95)',
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   shadowColor: "#000",
  //   shadowOpacity: 0.1,
  //   shadowRadius: 10,
  // },
  cardEmoji: { fontSize: 36 },
  cardText: { flex: 1 },

  cardTitle: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: isDarkMode ? '#FFFFFF' : '#1E293B', 
    marginBottom: 4
  },
  cardSubtitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(30, 41, 59, 0.7)',
    lineHeight: 18 
  },
  emojiCircle: {
    width: 70, 
    height: 70,
    borderRadius: 22, 
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  arrowCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(30, 41, 59, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowIcon: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: isDarkMode ? '#FFFFFF' : '#1E293B' 
  },

  /* Bottom Footer Area */
  bottomInfo: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.safetyIconBg,
    padding: 20,
    borderRadius: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.insightBorder,
  },
  infoEmoji: { fontSize: 22 },
  infoText: { 
    flex: 1, 
    fontSize: 14, 
    fontWeight: '600', 
    color: colors.insightText 
  },
  backButton: {
    padding: 4,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '600',
  },
  header: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 20,
  paddingTop: 10,
  paddingBottom: 20,
  height: 80,
  backgroundColor: 'transparent',
},
  headerTextContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1, 
    pointerEvents: 'none', 
  },
headerTitle: {
  fontSize: 18,
  fontWeight: '800',
  color: isDarkMode ? '#FFFFFF' : '#1E293B'
},
headerSubtitle: {
  fontSize: 12,
  fontWeight: '700',
  color: colors.subtext,
  marginTop: 2,
},
headerRightPlaceholder: {
  minWidth: 44,
  alignItems: 'flex-end',
},
streakBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 16,
  borderWidth: 2,
  borderColor: '#FDE68A',
},
});
