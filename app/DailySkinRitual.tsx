import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../app/theme/ThemeContext';
import { auth, db } from '../FirebaseConfig';

import { GoogleGenerativeAI } from "@google/generative-ai";

import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';

const GEN_AI_KEY = process.env.EXPO_PUBLIC_GEN_AI_KEY || '';
const genAI = new GoogleGenerativeAI(GEN_AI_KEY);

type TimeOfDay = 'AM' | 'PM';
type FeedbackType = 'good' | 'neutral' | 'warning' | null;

interface RoutineStep {
  id: string;
  name: string;
  description: string;
  emoji: string;
  completed: boolean;
  feedback: FeedbackType;
}

const StepCard = ({ step, onComplete }: { step: RoutineStep; onComplete: () => void }) => {
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);

  return (
    <View style={[styles.stepCard, step.completed && styles.stepCardCompleted]}>
      <View style={styles.stepLeft}>
        <View style={[styles.stepIconCircle, step.completed && { backgroundColor: '#10B981' }]}>
          <Text style={styles.stepEmoji}>{step.completed ? '✅' : step.emoji}</Text>
        </View>
        <View style={styles.stepInfo}>
          <Text style={[styles.stepName, step.completed && styles.stepNameCompleted]}>{step.name}</Text>
          <Text style={styles.stepDescription} numberOfLines={1}>{step.description}</Text>
        </View>
      </View>

    <View style={styles.stepRight}>
    {!step.completed ? (
        <TouchableOpacity style={styles.doneBtn} onPress={onComplete}>
        <Text style={styles.doneBtnText}>DONE</Text>
        </TouchableOpacity>
    ) : (
        <TouchableOpacity style={styles.completedBadge} onPress={onComplete}>
        <Text style={styles.completedBadgeText}>UNDO</Text>
        </TouchableOpacity>
    )}
    </View>
    </View>
  );
};

const getTodayKey = () => new Date().toISOString().split('T')[0];

export default function DailySkinRitual() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);

  const DEFAULT_STEPS: RoutineStep[] = [
    { id: '1', name: 'Cleanser', description: 'Hydrating Cleanser', emoji: '🧼', completed: false, feedback: null },
    { id: '2', name: 'Toner', description: 'Witch Hazel', emoji: '💧', completed: false, feedback: null },
    { id: '3', name: 'Treatment', description: 'Niacinamide 10%', emoji: '💊', completed: false, feedback: null },
    { id: '4', name: 'Moisturizer', description: 'Facial Lotion', emoji: '🧴', completed: false, feedback: null },
    { id: '5', name: 'Sunscreen', description: 'SPF 50+', emoji: '☀️', completed: false, feedback: null },
  ];

  const [amSteps, setAmSteps] = useState<RoutineStep[]>([]);
  const [pmSteps, setPmSteps] = useState<RoutineStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState<'AM' | 'PM'>('AM');

  const hasChanges = useRef(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const getYesterdayKey = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const [messageIndex, setMessageIndex] = useState(0);

  const messages = [
    "Reviewing your ritual...",
    "Analyzing product synergy...",
    "Evaluating skin type compatibility...",
    "Finalizing..."
  ];
  
  const pulse = useSharedValue(1);
  const rotate = useSharedValue(0);
  const textOpacity = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.02, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    rotate.value = withRepeat(
      withTiming(360, { duration: 6000, easing: Easing.linear }),
      -1
    );
  }, []);

  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      interval = setInterval(() => {
        textOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
          if (finished) {
            runOnJS(setMessageIndex)((messageIndex + 1) % messages.length);
            textOpacity.value = withTiming(1, { duration: 300 });
          }
        });
      }, 2500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnalyzing, messageIndex]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.95,
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  useEffect(() => {
    const fetchAndSyncRoutine = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
        const userData = userDoc.data();
        const built = userData.builtRoutine || { am: [], pm: [] };
        const checked = userData.checkedRoutine || {};
        const todayKey = getTodayKey();
        
        const todayProgress = checked[todayKey] || { am: [], pm: [] };

        const sync = (savedSlots: any[], checkedIds: string[]) => 
          savedSlots
            .sort((a, b) => a.position - b.position) 
            .map((slot: any) => ({
              id: slot.id,
              name: slot.product?.name || 'Unknown Product',
              description: slot.product?.type || 'Treatment',
              emoji: slot.product?.emoji || '✨',
              color: slot.product?.color, 
              completed: checkedIds.includes(slot.id),
              feedback: null
            }));

        setAmSteps(sync(built.am || [], todayProgress.am || []));
        setPmSteps(sync(built.pm || [], todayProgress.pm || []));
      }
  } catch (error) {
    console.error("Fetch error:", error);
  } finally {
    setLoading(false);
  }
};

    fetchAndSyncRoutine();
  }, []);

  useEffect(() => {
    const autoSaveAndCheckStreak = async () => {
      if (loading || (!amSteps.length && !pmSteps.length)) return;

      const user = auth.currentUser;
      if (!user) return;

      try {
        const todayKey = getTodayKey();
        const yesterdayKey = getYesterdayKey();
        const amDoneIds = amSteps.filter(s => s.completed).map(s => s.id);
        const pmDoneIds = pmSteps.filter(s => s.completed).map(s => s.id);

        const isFullyComplete = 
          amDoneIds.length === amSteps.length && 
          pmDoneIds.length === pmSteps.length &&
          amSteps.length > 0;

        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
        const userData = userSnap.data() || {};
        
        let currentStreak = userData.streakCount || 0;
        let lastStreakDate = userData.lastStreakDate || "";

        if (isFullyComplete && lastStreakDate !== todayKey) {
          if (lastStreakDate === yesterdayKey) {
            currentStreak += 1;
          } else {
            currentStreak = 1;
          }
          lastStreakDate = todayKey;
        }

        await setDoc(userDocRef, {
          checkedRoutine: {
            [todayKey]: {
              am: amDoneIds,
              pm: pmDoneIds
            }
          },
          streakCount: currentStreak,
          lastStreakDate: lastStreakDate
        }, { merge: true });

      } catch (error) {
        console.error("Error saving ritual and streak:", error);
      }
    };
    autoSaveAndCheckStreak();
  }, [amSteps, pmSteps]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentSteps = timeOfDay === 'AM' ? amSteps : pmSteps;

  const progress = currentSteps.length > 0 
    ? (currentSteps.filter(s => s.completed).length / currentSteps.length) * 100 
    : 0;

  const handleComplete = (id: string) => {
    hasChanges.current = true;
    const setter = timeOfDay === 'AM' ? setAmSteps : setPmSteps;
    setter(prev =>
      prev.map(step =>
        step.id === id ? { ...step, completed: !step.completed } : step
      )
    );
  };

  //   useEffect(() => {
  //   return () => {
  //     if (hasChanges.current) {
  //       analyzeRoutineAI();
  //     }
  //   };
  // }, [amSteps, pmSteps]); 

  const analyzeRoutineAI = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const skinType = userDoc.exists() ? userDoc.data().skinType : "Not specified";

      const acneScansRef = collection(db, "users", user.uid, "acneScans");
      const activeScansQuery = query(acneScansRef, where("status", "==", "active"));
      const querySnapshot = await getDocs(activeScansQuery);
      
      const activeAcneTypes = new Set<string>();
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.acneType) {
          if (Array.isArray(data.acneType)) {
            data.acneType.forEach(type => activeAcneTypes.add(type));
          } else {
            activeAcneTypes.add(data.acneType);
          }
        }
      });
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const routineData = {
        morning: amSteps.map(s => ({ product: s.name, type: s.description, completed: s.completed })),
        evening: pmSteps.map(s => ({ product: s.name, type: s.description, completed: s.completed }))
      };

      const prompt = `
        Evaluate the following skincare routine.

        Context:
        - Routine: ${JSON.stringify(routineData)}
        - User skin type: ${skinType}
        - Active acne types: ${JSON.stringify(Array.from(activeAcneTypes))}

        Scoring Guidelines:
        - Score range: 0-100
        - A score of 50 represents a neutral, minimally acceptable routine
        - A score above 80 represents a well-structured, acne-supportive routine
        - A score below 30 indicates a routine that may worsen acne or barrier health

        Evaluation Criteria (weighted):
        1. Routine completeness & order (20%)
          - Logical step order
          - Required steps present for AM or PM

        2. Ingredient suitability (30%)
          - Ingredients appropriate for the user's skin type
          - Ingredients appropriate for active acne types
          - Avoidance of highly comedogenic or irritating ingredients

        3. Acne treatment effectiveness (25%)
          - Presence of proven acne actives where appropriate
          - Proper placement in routine
          - Not overly aggressive or conflicting

        4. Skin barrier support (15%)
          - Hydration, soothing, and barrier-repair ingredients
          - Avoidance of excessive actives

        5. Risk & redundancy assessment (10%)
          - Conflicting ingredients
          - Over-exfoliation
          - Missing sunscreen in AM routines

        Scoring Rules:
        - Do NOT penalize for missing prescription-only ingredients
        - Sensitive skin should be penalized more heavily for irritation risk
        - AM routines missing sunscreen must receive a maximum score of 60
        - PM routines missing cleansing must receive a maximum score of 50
        - Multiple strong actives in the same routine should reduce the score

        Return the following JSON exactly:
        {
          "routineScore": number,
          "strengths": string[],
          "weaknesses": string[],
          "riskFlags": string[],
          "summary": string
        }

      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const cleanJson = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      await setDoc(doc(db, "users", user.uid), {
        routineScore: parsed.routineScore
      }, { merge: true });

      console.log("Routine Score Synced:", parsed.routineScore);
    } catch (error) {
      console.error("AI Routine Analysis Error:", error);
    }
    finally {
    setIsAnalyzing(false); 
  }
  };

  if (isAnalyzing) {
  return (
    <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <LinearGradient
        colors={isDarkMode ? ['#0F172A', '#1E293B'] : ['#F8FAFC', '#E2E8F0']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.analyzingOverlay}>
        <Animated.View style={[styles.loadingCard, cardAnimatedStyle]}>
          <View style={styles.spinnerWrapper}>
            <Animated.View style={[styles.ring, ringAnimatedStyle]} />
            <ActivityIndicator size="large" color={colors.primary} />
          </View>

          <Text style={[styles.loadingTitle, { color: isDarkMode ? '#FFF' : '#1E293B' }]}>
            Analyzing Ritual
          </Text>

          <Animated.Text style={[styles.loadingSubtitle, textAnimatedStyle]}>
            {messages[messageIndex]}
          </Animated.Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        {/* <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={20}> */}
        <TouchableOpacity 
          onPress={async () => {
            const amFinished = amSteps.length > 0 && amSteps.every(s => s.completed);
            const pmFinished = pmSteps.length > 0 && pmSteps.every(s => s.completed);
            const isTotalRoutineComplete = amFinished && pmFinished;
            if (hasChanges.current && isTotalRoutineComplete) {
              setIsAnalyzing(true);
              await analyzeRoutineAI(); 
            }
            router.back();
          }} 
          style={styles.backButton}
        >
          <View style={styles.backCircle}>
            <ChevronLeft size={24} color={colors.primary} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Daily Ritual</Text>
        </View>
        <View style={{ width: 44 }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Progress Section */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>Current Progress</Text>
            <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <LinearGradient
              colors={['#60A5FA', '#10B981']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${progress}%` }]}
            />
          </View>
        </View>

        {/* AM/PM Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleBtn, timeOfDay === 'AM' && styles.toggleActive]} 
            onPress={() => setTimeOfDay('AM')}
          >
            <Text style={[styles.toggleLabel, timeOfDay === 'AM' && styles.toggleLabelActive]}>☀️ MORNING</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, timeOfDay === 'PM' && styles.toggleActive]} 
            onPress={() => setTimeOfDay('PM')}
          >
            <Text style={[styles.toggleLabel, timeOfDay === 'PM' && styles.toggleLabelActive]}>🌙 EVENING</Text>
          </TouchableOpacity>
        </View>

        {/* Steps List */}
        <View style={styles.stepsList}>
          {currentSteps.length > 0 ? (
            currentSteps.map(step => ( 
              <StepCard 
                key={step.id} 
                step={step} 
                onComplete={() => handleComplete(step.id)} 
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Text style={styles.emptyEmoji}>🧪</Text>
              </View>
              <Text style={[styles.emptyTitle, isDarkMode && { color: '#FFF' }]}>
                No Ritual Built
              </Text>
              <Text style={styles.emptySubtext}>
                Your {timeOfDay === 'AM' ? 'morning' : 'evening'} routine hasn't been set up in the Lab yet.
              </Text>
              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={() => router.push('/RoutineLabBuilder')}
              >
                <Text style={styles.primaryButtonText}>Go to Routine Lab</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 70,
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

  headerTitleContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: isDarkMode ? '#FFF' : '#1E293B'},
  headerSubtitle: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1, },

  progressCard: {
    backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
    borderRadius: 24, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressText: { fontSize: 14, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' },
  progressPercent: { fontSize: 20, fontWeight: '900', color: colors.primary },
  progressBarTrack: { height: 12, backgroundColor: isDarkMode ? '#0F172A' : '#F1F5F9', borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 6 },

  toggleContainer: {
    flexDirection: 'row', backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0',
    borderRadius: 16, padding: 4, marginBottom: 20,
  },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  toggleActive: { backgroundColor: colors.primary, elevation: 4 },
  toggleLabel: { fontSize: 12, fontWeight: '900', color: '#64748B' },
  toggleLabelActive: { color: '#FFF' },

  stepsList: { gap: 12, flex: 1 },
    stepCard: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 28, 
    borderWidth: 1, 
    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
  },
  stepCardCompleted: { opacity: 0.8, backgroundColor: isDarkMode ? '#0F172A' : '#F1F5F9' },
  stepLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  stepIconCircle: { width: 64, height: 64, borderRadius: 15, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' },
  stepEmoji: { fontSize: 32 },
  stepInfo: { flex: 1, marginLeft: 15 },
  stepName: { fontSize: 18, fontWeight: '700', color: isDarkMode ? '#FFF' : '#1E293B', marginBottom: 4, },
  stepNameCompleted: { textDecorationLine: 'none', color: '#94A3B8' },
  stepDescription: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },

  stepRight: { marginLeft: 10 },
    
  doneBtn: { 
    backgroundColor: colors.primary, 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },

  doneBtnText: { 
    color: '#FFF', 
    fontSize: 14, 
    fontWeight: '700' 
  },

  feedbackRow: { flexDirection: 'row', gap: 10 },
  miniFeedback: { width: 44, height: 44, borderRadius: 14, backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  miniFeedbackActive: { backgroundColor: '#DBEAFE', borderWidth: 1, borderColor: colors.primary },
  feedbackEmoji: { fontSize: 20 },
  completedBadge: {
    backgroundColor: isDarkMode ? '#064E3B' : '#D1FAE5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },

  completedBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20, 
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', 
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#111827', 
    marginBottom: 8 
  },
  emptySubtext: { 
    textAlign: 'center', 
    color: '#6B7280', 
    lineHeight: 22, 
    marginBottom: 24 
  },
  primaryButton: {
    backgroundColor: colors.primary, 
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: { 
    color: '#FFF', 
    fontWeight: '700', 
    fontSize: 16 
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: isDarkMode ? '#bdbdbdff' : "#000",
    marginTop: 20,
    textAlign: 'center',
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: isDarkMode ? '#262b33ff' : '#FFFFFF',
    padding: 40,
    borderRadius: 48,
    alignItems: 'center',
    width: '85%',
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
},

  spinnerWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  loadingSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: 6,
    textAlign: 'center',
  },

  ring: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.primary,
    borderTopColor: 'transparent',
  },
});