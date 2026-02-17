import { useRouter } from "expo-router";
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { auth, db } from '../../FirebaseConfig';

import {
  AlertTriangle,
  ChevronRight,
  Clock,
  Flame,
  Lightbulb,
  Pill,
  ShieldCheck,
  Utensils
} from 'lucide-react-native';

type RiskLevel = 'low' | 'moderate' | 'high';
type TrendDirection = 'up' | 'down' | 'stable';
type FoodImpact = 'low' | 'medium' | 'high';
type SkinSeverity = 'low impact' | 'noticable' | 'high impact' | 'critical';
type RoutineStatus = 'completed' | 'pending' | 'partial';

interface HomeScreenProps {
//   onScanFood?: () => void;
  trend?: TrendDirection;
  skinSeverity?: SkinSeverity;
  foodImpact?: FoodImpact;
  foodInsight?: string;
  healingState?: string;

  onScanAcne?: () => void;
  onLogRoutine?: () => void;
  onViewFoodHistory?: () => void;
  onViewSkinStatus?: () => void;
  onViewRoutine?: () => void;
}

const saturate = (value: number, max: number, rate: number) => {
  // Approaches max as value increases
  return max * (1 - Math.exp(-value / rate));
};

export default function HomeScreen({
//   onScanFood = () => console.log('Scan Food'),
  onScanAcne = () => console.log('Scan Acne'),
  onLogRoutine = () => console.log('Log Routine'),
  // onViewFoodHistory = () => console.log('View Food History'),
  onViewSkinStatus = () => console.log('View Skin Status'),
  onViewRoutine = () => console.log('View Routine'),


}: HomeScreenProps) {

    const router = useRouter();

    const { colors, isDarkMode } = useTheme();
    
    const styles = getStyles(colors);
    
  const [isLoading, setIsLoading] = useState(true);
  const [breakoutScore, setBreakoutScore] = useState(0);
  const [mealsLogged, setMealsLogged] = useState(0);
  const [activeAcneCount, setActiveAcneCount] = useState(0);
  const [amRoutineStatus, setAmRoutineStatus] = useState<RoutineStatus>('pending');
  const [pmRoutineStatus, setPmRoutineStatus] = useState<RoutineStatus>('pending');
  const [dailyInsight, setDailyInsight] = useState("Scan your skin or food to get insights.");
  const [userTriggers, setUserTriggers] = useState<string[]>([]);
  const [todayFoodLogs, setTodayFoodLogs] = useState<any[]>([]); 

  const [trend, setTrend] = useState<TrendDirection>('stable');
  const [skinSeverity, setSkinSeverity] = useState<SkinSeverity>('low impact');
  const [foodImpact, setFoodImpact] = useState<FoodImpact>('low');
  const [healingState, setHealingState] = useState('No active scans');
  const [foodInsight, setFoodInsight] = useState<string>('No meals logged today');

  interface ActiveAcneSpot {
    type: string;
    count: number;
    confidence?: number;
  }

  const [activeAcneSpots, setActiveAcneSpots] = useState<ActiveAcneSpot[]>([]);
  const [userAcneTypes, setUserAcneTypes] = useState<string[]>([]); 
  const [userSkinType, setUserSkinType] = useState<string>('Combination'); 

  const [sleepQuality, setSleepQuality] = useState<number>(60); 
  const [stressLevel, setStressLevel] = useState<number>(50);   

  const [routineScore, setRoutineScore] = useState<number>(100);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const userDocRef = doc(db, "users", user.uid);
    const unsubUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserTriggers(data.triggers || []);

        setUserAcneTypes(data.acneTypes || []);
        setUserSkinType(data.skinType || 'Combination');

        setSleepQuality(data.sleepValue ?? 60);
        setStressLevel(data.stressValue ?? 50);
        
        setRoutineScore(data.routineScore ?? 100);
        
        const allRoutines = data.checkedRoutine || {};
        const todaysRoutine = allRoutines[todayStr] || {};

        const amArray = todaysRoutine.am || [];
        setAmRoutineStatus(amArray.length > 0 ? 'completed' : 'pending');

        const pmArray = todaysRoutine.pm || [];
        setPmRoutineStatus(pmArray.length > 0 ? 'completed' : 'pending');
      }
    });

    const acneQuery = query(
      collection(db, `users/${user.uid}/acneScans`),
      where("status", "==", "active"),
      orderBy("timestamp", "desc"),                       
    );
    const unsubAcne = onSnapshot(acneQuery, (snapshot) => {
      if (!snapshot.empty) {
        let aggregatedTotalSpots = 0;
        let allDetectedSpots: any[] = [];

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const detectedAcne = data.detectedAcne || [];

          aggregatedTotalSpots += (data.totalCount || 0);

          const mappedSpots = detectedAcne.map((a: any) => ({
            type: a.type,
            count: a.count,
            confidence: a.confidence,
          }));
          
          allDetectedSpots = [...allDetectedSpots, ...mappedSpots];
        });

        let calculatedSeverity: SkinSeverity;

        if (aggregatedTotalSpots < 10) {
          calculatedSeverity = 'low impact';
        } else if (aggregatedTotalSpots < 20) {
          calculatedSeverity = 'noticable';
        } else if (aggregatedTotalSpots < 50) {
          calculatedSeverity = 'high impact';
        } else {
          calculatedSeverity = 'critical';
        }

        setActiveAcneCount(aggregatedTotalSpots);
        setSkinSeverity(calculatedSeverity);
        setActiveAcneSpots(allDetectedSpots);

        if (aggregatedTotalSpots > 0) {
          setHealingState('Healing actively');
        } else {
          setHealingState('Skin is clear');
        }
      } else {
        setActiveAcneCount(0);
        setActiveAcneSpots([]);
        setSkinSeverity('low impact');
        setHealingState('Skin is clear');
      }
    });
    const foodQuery = query(
      collection(db, `users/${user.uid}/foodLogs`),
      where("timestamp", ">=", today)
    );
    const unsubFood = onSnapshot(foodQuery, (snapshot) => {
      const logs = snapshot.docs.map(d => d.data());
      setMealsLogged(logs.length);
      setTodayFoodLogs(logs); 
      setIsLoading(false);
    });

    return () => {
      unsubUser();
      unsubAcne();
      unsubFood();
    };
  }, []);

  
  useEffect(() => {
    if (!isLoading) {
      calculateRisk(todayFoodLogs, mealsLogged, activeAcneSpots, userAcneTypes, userSkinType, routineScore);
    }
  }, [todayFoodLogs, activeAcneCount, amRoutineStatus, userTriggers, routineScore]);

  const saveDailyScore = async (score: number) => {
    const user = auth.currentUser;
    if (!user) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const logRef = doc(db, `users/${user.uid}/skinLogs`, todayStr);

    try {
      await setDoc(logRef, {
        score: score,
        timestamp: serverTimestamp(), 
        riskLevel: getRiskLevel(score)
      }, { merge: true }); 
      console.log("Daily breakout score saved successfully.");
    } catch (error) {
      console.error("Error saving daily breakout score:", error);
    }
  };

  // Risk Algorithm
  const calculateRisk = (foodLogs: any[], mealCount: number,   activeAcneSpots: ActiveAcneSpot[], userAcneTypes: string[], userSkinType: string, routineScore: number) => {
    let score = 15; 
    let triggerMatchCount = 0;
    let highestImpact: FoodImpact = 'low';
    let totalDecayedFoodRisk = 0; 
    
    const now = new Date().getTime();

    const SKIN_TYPE_WEIGHTS: Record<string, number> = {
    Oily: 1.1,
    Dry: 0.9,
    Combination: 1.0,
    Sensitive: 1.2,
  };

    const TRIGGER_WEIGHTS: Record<string, number> = {
      "Dairy": 1.2,
      "High glycemic carbs": 1.15,
      "Added sugar": 1.1,
      "Highly processed": 1.2,
      "Fried food": 1.25
    };

    const SLEEP_WEIGHT = 1.2; 
    const STRESS_WEIGHT = 1.3; 

    if (foodLogs.length > 0) {
      const allDetectedTriggers = foodLogs.flatMap(log => log.triggers || []);
      const highRiskMeals = foodLogs.filter(log => log.riskLevel === 'high');

      foodLogs.forEach(log => {
        const isHighRisk = log.riskLevel === 'high';
        const hasPersonalTrigger = log.triggers?.some((mealTrigger: string) => 
          userTriggers.includes(mealTrigger)
        );

        if (hasPersonalTrigger || isHighRisk) {
          triggerMatchCount++;
          highestImpact = 'high';

          // Decay calculation based on time since meal
          const mealTime = log.timestamp?.seconds 
            ? log.timestamp.seconds * 1000 
            : new Date(log.timestamp).getTime();
          
          const hoursSinceMeal = (now - mealTime) / (1000 * 60 * 60);
          
          // Linear decay - impact is 100% at 0 hrs, and hits 0% at 24 hrs.
          // const decayFactor = Math.max(0, (24 - hoursSinceMeal) / 24);

          const decayFactor = Math.exp(-hoursSinceMeal / 12); // sharper decrease

          const matchingTriggers = log.triggers?.filter((t: string) => userTriggers.includes(t)) || [];
          const triggerMultiplier = matchingTriggers.reduce(
            (acc: number, t: string) => acc * (TRIGGER_WEIGHTS[t] || 1),
            1
          );
          
          // const baseMealRisk = 10;
          // totalDecayedFoodRisk += baseMealRisk * (1 + log.triggers.length * 0.5) * decayFactor * triggerMultiplier;

          // Updated 12-29-2025 -----
          const baseMealRisk =
          log.riskLevel === 'high' ? 12 :
          log.riskLevel === 'medium' ? 6 :
          3;
            const cappedTriggerMultiplier = Math.min(triggerMultiplier, 1.8);
            totalDecayedFoodRisk +=
              baseMealRisk *
              (1 + log.triggers.length * 0.4) *
              decayFactor *
              cappedTriggerMultiplier;    
          // ------

        } else if (log.riskLevel === 'medium' && highestImpact !== 'high') {
          highestImpact = 'medium';
        }
      });

      // Update Food Insight with detected ingredients
      if (triggerMatchCount > 0) {
        const uniqueTriggers = [...new Set(allDetectedTriggers.filter(t => t !== 'None detected'))];
        setFoodInsight(highRiskMeals.length > 0 
          ? `High-risk meals detected. Triggers: ${uniqueTriggers.slice(0, 2).join(', ')}.`
          : `Triggers detected: ${uniqueTriggers.slice(0, 2).join(', ')}.`);
      }
    } else {
      setFoodInsight('Log your first meal to see skin impact.');
    }

    setFoodImpact(highestImpact);

    // Final score
    // score += totalDecayedFoodRisk; // Dynamic food risk
    // score += (activeAcneCount * 5); // Static risk per existing spot


        const ACNE_TYPE_WEIGHTS: Record<string, number> = {
        Whiteheads: 0.5,
        Blackheads: 0.5,
        Papules: 0.8,
        Pustules: 1,
        Nodules: 1.2,
        Cystic: 1.5,
        Hormonal: 1.3,
        Comedone: 0.6,
      };

      let acneScore = 0;
      activeAcneSpots.forEach((spot: ActiveAcneSpot) => {
        const weight = (ACNE_TYPE_WEIGHTS as Record<string, number>)[spot.type] || 0.5;
        const multiplier = userAcneTypes.includes(spot.type) ? 1 : 0.5;
        console.log(`Spot type: ${spot.type}, count: ${spot.count}, weight: ${weight}, multiplier: ${multiplier}`);
        acneScore += (Number(spot.count) || 0) * weight * multiplier;
      });

      console.log(`Total acneScore: ${acneScore}`);

      const skinMultiplier = SKIN_TYPE_WEIGHTS[userSkinType || "Combination"] || 1;


    // score = Math.min(Math.round((15 + totalDecayedFoodRisk * 0.8 + acneScore * 1.2) * skinMultiplier), 100)
      
    // Updated 12-29-25-----
      const sleepFactor = 1 + Math.pow((100 - sleepQuality) / 100, 1.5) * (SLEEP_WEIGHT - 1);
      const stressFactor = 1 + Math.pow(stressLevel / 100, 1.5) * (STRESS_WEIGHT - 1);
      const userFactorsMultiplier = sleepFactor * stressFactor;

      const foodComponent = saturate(
        totalDecayedFoodRisk,
        30,   
        25    
      );
      const acneComponent = saturate(
        acneScore,
        40,   
        15
      );
      const BASELINE = 15;
      score = (BASELINE + foodComponent + acneComponent) * skinMultiplier * userFactorsMultiplier;
    // -------


    // if (amRoutineStatus === 'pending') {
    //   score += 5; 
    // }

    const ROUTINE_MAX_PROTECTION = 0.20;
    const ROUTINE_MAX_PENALTY = 0.10;

    let routineMultiplier = 1;

    if (routineScore >= 50) {
      const normalized = (routineScore - 50) / 50;
      routineMultiplier = 1 - normalized * ROUTINE_MAX_PROTECTION;
    } else {
      const normalized = (50 - routineScore) / 50;
      routineMultiplier = 1 + normalized * ROUTINE_MAX_PENALTY;
    }

    score *= routineMultiplier;
    
    const finalScore = Math.min(Math.round(score), 100);

    // Update Trend State based on current score
    if (finalScore > 40) setTrend('up');
    else if (finalScore <= 20) setTrend('down');
    else setTrend('stable');

    setBreakoutScore(finalScore);
    saveDailyScore(finalScore);
    
    // Update Daily Insight display
    if (triggerMatchCount > 0) {
      setDailyInsight(`Risk is elevated due to ${triggerMatchCount} recent food trigger(s).`);
    } else if (mealCount > 0) {
      setDailyInsight("Your meals today look skin-friendly!");
    }
  };

  
  const getRiskLevel = (score: number): RiskLevel => {
    if (score <= 30) return 'low';
    if (score <= 60) return 'moderate';
    return 'high';
  };

  const getRiskColor = (level: RiskLevel) => {
    const colors = { low: '#10B981', moderate: '#F59E0B', high: '#EF4444' };
    return colors[level];
  };

    const getRoutineText = (): string => {
    if (amRoutineStatus === 'completed' && pmRoutineStatus === 'completed') {
      return 'All routines completed';
    }
    if (amRoutineStatus === 'completed' && pmRoutineStatus === 'pending') {
      return 'AM routine completed\nPM routine pending';
    }
    if (amRoutineStatus === 'pending' && pmRoutineStatus === 'pending') {
      return 'No routines completed';
    }
    return 'AM routine completed';
  };

    const getFoodImpactColor = (impact: FoodImpact): string => {
    switch (impact) {
      case 'low':
        return '#10B981';
      case 'medium':
        return '#F59E0B';
      case 'high':
        return '#EF4444';
    }
  };

    const getTrendIcon = (direction: TrendDirection): string => {
    switch (direction) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      case 'stable':
        return '→';
    }
  };

  const getTrendText = (direction: TrendDirection): string => {
    switch (direction) {
      case 'up':
        return 'Increased Caution ⚠️';
      case 'down':
        return 'Receding Risk ✨';
      case 'stable':
        return 'Holding Steady 🟢';
    }
  };

  const getTrendColor = (direction: TrendDirection): string => {
    switch (direction) {
      case 'up':
        return '#EF4444';
      case 'down':
        return '#10B981';
      case 'stable':
        return '#6B7280';
    }
  };

  const getRiskLabel = (level: RiskLevel) => level.charAt(0).toUpperCase() + level.slice(1);

  const riskLevel = getRiskLevel(breakoutScore);

//   const RoutineProgress = ({ label, status }: { label: string; status: RoutineStatus }) => (
//   <View style={styles.routineCheckContainer}>
//     <View style={[
//       styles.statusDot, 
//       { backgroundColor: status === 'completed' ? '#10B981' : '#D1D5DB' }
//     ]} />
//     <Text style={styles.routineLabel}>{label}: </Text>
//     <Text style={[
//       styles.statusText, 
//       { color: status === 'completed' ? '#059669' : '#6B7280' }
//     ]}>
//       {status === 'completed' ? 'Done' : 'Pending'}
//     </Text>
//   </View>
// );

  const getScoreColor = (score: number) => {
    if (score > 70) return '#EF4444'; 
    if (score > 30) return '#F59E0B'; 
    return '#10B981'; 
  };

  const scoreColor = getScoreColor(breakoutScore);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

/* New updated ui 1/2/26 */
return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        {/* Hero Section: Breakout Risk Score */}
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={() => router.push("/BreakoutHistory")}
        >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Flame size={20} color={scoreColor} />
            <Text style={styles.cardTitle}>Breakout Risk</Text>
            <View style={[styles.statusBadge, { backgroundColor: scoreColor + '15' }]}>
               <Text style={[styles.statusBadgeText, { color: scoreColor }]}>
                {breakoutScore > 70 ? 'HIGH' : breakoutScore > 30 ? 'MODERATE' : 'LOW'}
               </Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <View style={styles.scoreLeft}>
              <View style={styles.scoreDisplay}>
                <Text style={[styles.scoreNumber, { color: scoreColor }]}>{breakoutScore}</Text>
                <Text style={styles.scoreMax}>/100</Text>
              </View>
              <Text style={styles.microExplanation}>
                {getTrendText(trend)}
              </Text>
            </View>

            <View style={styles.meterContainer}>
              {Array.from({ length: 10 }, (_, i) => 10 - i).map((level) => {
                const threshold = level * 10;
                const isActive = breakoutScore >= threshold;
                return (
                  <View
                    key={level}
                    style={[
                      styles.meterBar,
                      {
                        backgroundColor: isActive ? scoreColor : '#E5E7EB',
                        opacity: isActive ? 1 : 0.3,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </View>
        </TouchableOpacity>

        {/* Grid Section: Food & Status */}
        <View style={styles.grid}>
          {/* Food Impact Card */}
          <TouchableOpacity 
            style={styles.smallCard} 
            onPress={() => router.push("/FoodHistory")}
          >
            <View style={styles.cardHeader}>
              <Utensils size={18} color="#F43F5E" />
              <Text style={[styles.cardTitle, { color: '#F43F5E' }]}>Food</Text>
              <ChevronRight size={20} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
            </View>
            <Text style={styles.cardMainValue}>{mealsLogged}</Text>
            <Text style={styles.cardSubValue}>Meals logged</Text>
            <View style={[styles.miniBadge, { backgroundColor: '#FFF1F2' }]}>
              <Text style={[styles.miniBadgeText, { color: '#F43F5E' }]}>{foodImpact} impact</Text>
            </View>
          </TouchableOpacity>

          {/* Skin Status Card */}
          <TouchableOpacity 
            style={styles.smallCard} 
            onPress={() => router.push("/AcneTrackingHistory")}
          >
            <View style={styles.cardHeader}>
              <ShieldCheck size={18} color="#6366F1" />
              <Text style={[styles.cardTitle, { color: '#6366F1' }]}>Skin</Text>
              <ChevronRight size={20} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
            </View>
            <Text style={styles.cardMainValue}>{activeAcneCount}</Text>
            <Text style={styles.cardSubValue}>Active spots</Text>
            <View style={[styles.miniBadge, { backgroundColor: '#EEF2FF' }]}>
              <Text style={[styles.miniBadgeText, { color: '#6366F1' }]}>{skinSeverity} </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Routine Card */}
        <TouchableOpacity style={styles.card} onPress={() => router.push("/DailyRoutine")}>
          <View style={styles.cardHeader}>
            <Clock size={20} color="#15803D" />
            <Text style={[styles.cardTitle, { color: '#15803D' }]}>Daily Routine</Text>
            <ChevronRight size={20} color="#9CA3AF" style={{marginLeft: 'auto'}} />
          </View>
          
          <View style={styles.routineRow}>
            <View style={styles.routineItem}>
              <View style={[styles.routineDot, { backgroundColor: amRoutineStatus !== 'pending' ? '#10B981' : '#E5E7EB' }]} />
              <Text style={styles.routineLabel}>AM Routine</Text>
            </View>
            <View style={styles.routineItem}>
              <View style={[styles.routineDot, { backgroundColor: pmRoutineStatus !== 'pending' ? '#10B981' : '#E5E7EB' }]} />
              <Text style={styles.routineLabel}>PM Routine</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Smart Insight (Banner Style) */}
        {dailyInsight && (
          <View style={styles.insightBanner}>
            <Lightbulb size={20} color="#F59E0B" style={styles.insightIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.insightText}>{dailyInsight}</Text>
            </View>
          </View>
        )}

        {activeAcneCount > 0 && (
        <View style={styles.treatmentContainer}>          
          {/* Treatment Plan Button */}
          <TouchableOpacity 
            onPress={() => router.push("/TreatmentRecommendations")} 
            style={styles.treatmentButton}
          >
            <View style={styles.treatmentButtonHeader}>
              <View style={styles.treatmentIconContainer}>
                <Pill size={24} color="#6366F1" />
              </View>
              <View style={styles.treatmentButtonContent}>
                <Text style={styles.treatmentButtonTitle}>View Treatment Plan</Text>
                <Text style={styles.treatmentButtonSubtext}>
                  Personalized for your {activeAcneCount} active spot{activeAcneCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          {/* Safety Guidelines Button */}
          <TouchableOpacity 
            onPress={() => router.push("/SafetyWarnings")} 
            style={styles.safetyButton}
          >
            <View style={styles.safetyButtonHeader}>
              <View style={styles.safetyIconContainer}>
                <AlertTriangle size={24} color="#F59E0B" />
              </View>
              <View style={styles.safetyButtonContent}>
                <Text style={styles.safetyButtonTitle}>Safety Guidelines</Text>
                <Text style={styles.safetyButtonSubtext}>What NOT to do • Prevent scarring</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      </ScrollView>
    </SafeAreaView>
  );
}

/* New updated ui 1/2/26 */
  const getStyles = (colors: any) => StyleSheet.create({  container: { 
    flex: 1, 
    backgroundColor: colors.background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: colors.headerBackground,
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '900', 
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.buttonPrimaryShadow,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: colors.buttonPrimaryShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  scanButtonText: { 
    color: colors.card, 
    fontWeight: '800', 
    fontSize: 16, 
    marginLeft: 8 
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: { 
    padding: 20,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 31,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderBottomColor,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  grid: { 
    flexDirection: 'row', 
    gap: 16, 
    marginBottom: 16 
  },
  smallCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 25,
    borderWidth: 1,
    borderColor: colors.borderBottomColor,
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  cardTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    marginLeft: 10, 
    color: colors.textSecondary 
  },
  statusBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8, 
    marginLeft: 'auto' 
  },
  statusBadgeText: { 
    fontSize: 12, 
    fontWeight: '900' 
  },
  scoreRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  scoreLeft: {
    flex: 1,
    marginRight: 20,
  },
  scoreDisplay: { 
    flexDirection: 'row', 
    alignItems: 'baseline',
    marginBottom: 8,
  },
  scoreNumber: { 
    fontSize: 64, 
    fontWeight: '800',
    letterSpacing: -3,
  },
  scoreMax: { 
    fontSize: 24, 
    color: colors.scoreMax, 
    marginLeft: 4,
    fontWeight: '600',
  },
  meterContainer: { 
    flexDirection: 'column', 
    gap: 4,
  },
  meterBar: { 
    width: 60, 
    height: 7, 
    borderRadius: 4 
  },
  largeExplanation: { 
    fontSize: 15, 
    color: colors.textMuted, 
    lineHeight: 22,
    fontWeight: '500',
  },
  cardMainValue: { 
    fontSize: 40, 
    fontWeight: '800', 
    color: colors.text, 
    marginBottom: 4 
  },
  cardSubValue: { 
    fontSize: 14, 
    color: colors.scoreMax, 
    marginBottom: 16,
    fontWeight: '600',
  },
  miniBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 10, 
    alignSelf: 'flex-start' 
  },
  miniBadgeText: { 
    fontSize: 14, 
    fontWeight: '800' 
  },
  routineRow: { 
    marginTop: 8,
    gap: 16,
  },
  routineItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.routineBg,
    padding: 17,
    borderRadius: 16,
  },
  routineDot: { 
    width: 14, 
    height: 14, 
    borderRadius: 7, 
    marginRight: 12 
  },
  routineLabel: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: colors.routineLabel 
  },
  insightBanner: {
    flexDirection: 'row',
    backgroundColor: colors.safetyIconBg,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.insightBorder,
    alignItems: 'center',
    marginTop: 0,
  }, 
  insightIcon: { 
    marginRight: 12 
  },
  insightText: { 
    fontSize: 14, 
    color: colors.insightText, 
    fontWeight: '600', 
    lineHeight: 18 
  },
  microExplanation: { 
    fontSize: 12, 
    color: colors.textMuted, 
    marginTop: 4 
  },
treatmentContainer: {
    marginTop: 16,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 16,
    marginLeft: 4,
  },
  treatmentButton: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderBottomColor,
    shadowColor: colors.buttonPrimaryShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  safetyButton: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.borderBottomColor,
    shadowColor: colors.safetyButtonShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  treatmentButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  safetyButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  treatmentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.treatmentIconBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  safetyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.safetyIconBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  treatmentButtonContent: {
    flex: 1,
  },
  safetyButtonContent: {
    flex: 1,
  },
  treatmentButtonTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.buttonTitle,
    marginBottom: 4,
  },
  safetyButtonTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.buttonTitle,
    marginBottom: 4,
  },
  treatmentButtonSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  safetyButtonSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  }
});