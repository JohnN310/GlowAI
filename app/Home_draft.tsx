import { Ionicons } from '@expo/vector-icons';
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

import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { auth, db } from '../FirebaseConfig';

type RiskLevel = 'low' | 'moderate' | 'high';
type TrendDirection = 'up' | 'down' | 'stable';
type FoodImpact = 'low' | 'medium' | 'high';
type SkinSeverity = 'mild' | 'moderate' | 'severe';
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

export default function HomeScreen({
//   onScanFood = () => console.log('Scan Food'),
  onScanAcne = () => console.log('Scan Acne'),
  onLogRoutine = () => console.log('Log Routine'),
  // onViewFoodHistory = () => console.log('View Food History'),
  onViewSkinStatus = () => console.log('View Skin Status'),
  onViewRoutine = () => console.log('View Routine'),


}: HomeScreenProps) {

    const router = useRouter();
    
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
  const [skinSeverity, setSkinSeverity] = useState<SkinSeverity>('mild');
  const [foodImpact, setFoodImpact] = useState<FoodImpact>('low');
  const [healingState, setHealingState] = useState('No active scans');
  const [foodInsight, setFoodInsight] = useState<string>('No meals logged today');

  interface ActiveAcneSpot {
    type: string;
    count: number;
    confidence?: number;
  }

  const [activeAcneSpots, setActiveAcneSpots] = useState<ActiveAcneSpot[]>([]);
  const [userAcneTypes, setUserAcneTypes] = useState<string[]>([]); // from user profile
  const [userSkinType, setUserSkinType] = useState<string>('Combination'); // default

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const userDocRef = doc(db, "users", user.uid);
    const unsubUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserTriggers(data.triggers || []);

        setUserAcneTypes(data.acneTypes || []);
        setUserSkinType(data.skinType || 'Combination');
        
        const dateKey = new Date().toISOString().split('T')[0];
        const todayLog = data.dailyLogs?.[dateKey] || {};
        setAmRoutineStatus(todayLog.amRoutine || 'pending');
        setPmRoutineStatus(todayLog.pmRoutine || 'pending');
      }
    });

    const acneQuery = query(
      collection(db, `users/${user.uid}/acneScans`),
      where("status", "==", "active"),
      orderBy("timestamp", "desc"), 
      limit(1)                      
    );
    const unsubAcne = onSnapshot(acneQuery, (snapshot) => {
      if (!snapshot.empty) {

          const latestData = snapshot.docs[0].data();
          const totalSpots = latestData.totalCount || 0;
          const severity = latestData.severity || 'mild';
          const detectedAcne = latestData.detectedAcne || [];

          setActiveAcneCount(totalSpots);
          setSkinSeverity(severity as SkinSeverity);
          setActiveAcneSpots(
            detectedAcne.map((a: any) => ({
              type: a.type,
              count: a.count,
              confidence: a.confidence, 
            }))
          );

                    if (totalSpots > 0) {
            setHealingState('Healing actively');
          } else {
            setHealingState('Skin is clear');
          }
        } else {
          setActiveAcneCount(0);
          setActiveAcneSpots([]);
          setSkinSeverity('mild');
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
      calculateRisk(todayFoodLogs, mealsLogged, activeAcneSpots, userAcneTypes, userSkinType);
    }
  }, [todayFoodLogs, activeAcneCount, amRoutineStatus, userTriggers]);

const calculateRisk = (foodLogs: any[], mealCount: number,   activeAcneSpots: ActiveAcneSpot[], userAcneTypes: string[], userSkinType: string) => {
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
    Dairy: 1.2,
    Sugar: 1.1,
    Stress: 1.3,
    "Lack of sleep": 1.2,
    "Menstrual cycle": 1.3,
  };

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

        const mealTime = log.timestamp?.seconds 
          ? log.timestamp.seconds * 1000 
          : new Date(log.timestamp).getTime();
        
        const hoursSinceMeal = (now - mealTime) / (1000 * 60 * 60);
        
        // const decayFactor = Math.max(0, (24 - hoursSinceMeal) / 24);

        const decayFactor = Math.exp(-hoursSinceMeal / 12); // sharper decrease

        const matchingTriggers = log.triggers?.filter((t: string) => userTriggers.includes(t)) || [];
        const triggerMultiplier = matchingTriggers.reduce(
          (acc: number, t: string) => acc * (TRIGGER_WEIGHTS[t] || 1),
          1
        );
        
        const baseMealRisk = 10;
        totalDecayedFoodRisk += baseMealRisk * (1 + log.triggers.length * 0.5) * decayFactor * triggerMultiplier;

      } else if (log.riskLevel === 'medium' && highestImpact !== 'high') {
        highestImpact = 'medium';
      }
    });

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


  score = Math.min(Math.round((15 + totalDecayedFoodRisk * 0.8 + acneScore * 1.2) * skinMultiplier), 100)

  if (amRoutineStatus === 'pending') {
    score += 5; 
  }
  
  const finalScore = Math.min(Math.round(score), 100);

  if (finalScore > 40) setTrend('up');
  else if (finalScore <= 20) setTrend('down');
  else setTrend('stable');

  setBreakoutScore(finalScore);

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
        return 'High risk detected';
      case 'down':
        return 'You are doing great';
      case 'stable':
        return 'Stable';
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

  const RoutineProgress = ({ label, status }: { label: string; status: RoutineStatus }) => (
  <View style={styles.routineCheckContainer}>
    <View style={[
      styles.statusDot, 
      { backgroundColor: status === 'completed' ? '#10B981' : '#D1D5DB' }
    ]} />
    <Text style={styles.routineLabel}>{label}: </Text>
    <Text style={[
      styles.statusText, 
      { color: status === 'completed' ? '#059669' : '#6B7280' }
    ]}>
      {status === 'completed' ? 'Done' : 'Pending'}
    </Text>
  </View>
);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.heroCard, { borderTopColor: getRiskColor(riskLevel) }]}>
              <View style={styles.heroHeader}>
                <Text style={styles.heroTitle}>Breakout Risk</Text>
                <View style={[styles.riskBadge, { backgroundColor: getRiskColor(riskLevel) + '15' }]}>
                  <Text style={[styles.riskLabel, { color: getRiskColor(riskLevel) }]}>
                    {getRiskLabel(riskLevel)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.scoreRow}>
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreNumber}>{breakoutScore}</Text>
                  <Text style={styles.scoreOutOf}>/100</Text>
                </View>
                
                <View style={styles.trendModule}>
                  {/* <Text style={[styles.trendIcon, { color: getTrendColor(trend) }]}>
                    {getTrendIcon(trend)}
                  </Text> */}
                  <Text style={[styles.trendText, { color: getTrendColor(trend) }]}>
                    {getTrendText(trend)}
                  </Text>
                </View>
              </View>

              <View style={styles.heroFooter}>
                <Text style={styles.microExplanation}>Based on your scanned food, acne, and skincare routine.</Text>
              </View>
            </View>

    <View style={styles.cardsGrid}>
      
      {/* Food Impact Card */}
      <TouchableOpacity style={styles.insightCard} onPress={() => router.push("/FoodHistory")}>
        <View style={[styles.cardAccentHeader, { backgroundColor: '#F0F9FF' }]}>
          <Text style={styles.cardIcon}>🍽️</Text>
          <Text style={[styles.cardTitle, { color: '#0369A1' }]}>Food Impact</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardMainText}>{mealsLogged} Meals Logged</Text>
          <View style={[styles.impactBadge, { backgroundColor: getFoodImpactColor(foodImpact) + '15' }]}>
            <Text style={[styles.impactText, { color: getFoodImpactColor(foodImpact) }]}>
              {foodImpact.toUpperCase()} IMPACT
            </Text>
          </View>
          {foodInsight && <Text style={styles.cardInsight}>{foodInsight}</Text>}
        </View>
      </TouchableOpacity>

      {/* Skin Status Card */}
      <TouchableOpacity style={styles.insightCard} onPress={() => router.push("/AcneTracking")}>
        <View style={[styles.cardAccentHeader, { backgroundColor: '#FDF2F8' }]}>
          <Text style={styles.cardIcon}>🧴</Text>
          <Text style={[styles.cardTitle, { color: '#BE185D' }]}>Skin Status</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardMainText}>{activeAcneCount} Active Spots</Text>
          <Text style={styles.cardSubtext}>{healingState}</Text>
          <View style={styles.severityBadge}>
            <Text style={styles.severityText}>{skinSeverity.toUpperCase()}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Routine Card */}
      <TouchableOpacity style={styles.insightCard} onPress={onViewRoutine}>
        <View style={[styles.cardAccentHeader, { backgroundColor: '#F0FDF4' }]}>
          <Text style={styles.cardIcon}>⏰</Text>
          <Text style={[styles.cardTitle, { color: '#15803D' }]}>Daily Routine</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardMainText}>{getRoutineText()}</Text>
          <View style={styles.routineIndicators}>
            <RoutineProgress label="AM" status={amRoutineStatus} />
            <RoutineProgress label="PM" status={pmRoutineStatus} />
          </View>
        </View>
      </TouchableOpacity>
    </View>

        {dailyInsight && (
          <View style={styles.insightBanner}>
            <Text style={styles.insightBannerIcon}>💡</Text>
            <Text style={styles.insightBannerText}>{dailyInsight}</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
        <TouchableOpacity 
            style={styles.primaryActionButton} 
            onPress={() => router.push("/FoodPhotoCapture")}
          >
            <View style={styles.buttonIconContainer}>
              <Text style={styles.buttonIcon}>📸</Text>
            </View>
            <View style={styles.buttonContent}>
              <Text style={styles.primaryButtonText}>Scan Food</Text>
              <Text style={styles.primaryButtonSubtext}>Check triggers in your meal</Text>
            </View>
          </TouchableOpacity>

        {/* Scan Acne */}
          <TouchableOpacity 
            style={styles.primaryActionButton} 
            onPress={() => router.push("/AcneCamera")}
          >
            <View style={styles.buttonIconContainer}>
              <Text style={styles.buttonIcon}>🔍</Text>
            </View>
            <View style={styles.buttonContent}>
              <Text style={styles.primaryButtonText}>Scan Acne</Text>
              <Text style={styles.primaryButtonSubtext}>Analyze active breakouts</Text>
            </View>
          </TouchableOpacity>

      {/* Log Routine - Now unified with the others */}
        <TouchableOpacity 
          style={styles.primaryActionButton} 
          onPress={onLogRoutine}
        >
          <View style={styles.buttonIconContainer}>
            <Text style={styles.buttonIcon}>🧴</Text>
          </View>
          <View style={styles.buttonContent}>
            <Text style={styles.primaryButtonText}>Log Routine</Text>
            <Text style={styles.primaryButtonSubtext}>Record your daily products</Text>
          </View>
        </TouchableOpacity>

        </View>

        {/* Conditional Treatment Section */}
        {activeAcneCount > 0 && (
          <>
            <Text style={styles.sectionLabel}>Treatment & Safety</Text>
            <View style={styles.treatmentContainer}>
              <TouchableOpacity 
                onPress={() => router.push("/TreatmentRecommendations")} 
                style={styles.treatmentButton}
              >
                <View style={styles.treatmentButtonHeader}>
                  <View style={styles.treatmentIconContainer}>
                    <Text style={styles.treatmentIcon}>💊</Text>
                  </View>
                  <View style={styles.treatmentButtonContent}>
                    <Text style={styles.treatmentButtonTitle}>View Treatment Plan</Text>
                    <Text style={styles.treatmentButtonSubtext}>
                      Personalized for your {activeAcneCount} active spot{activeAcneCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => router.push("/SafetyWarnings")} 
                style={styles.safetyButton}
              >
                <View style={styles.safetyButtonHeader}>
                  <View style={styles.safetyIconContainer}>
                    <Text style={styles.safetyIcon}>⚠️</Text>
                  </View>
                  <View style={styles.safetyButtonContent}>
                    <Text style={styles.safetyButtonTitle}>Safety Guidelines</Text>
                    <Text style={styles.safetyButtonSubtext}>What NOT to do • Prevent scarring</Text>
                  </View>
                  <Text style={styles.chevronWarning}>›</Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}


        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Preferences</Text>
        <TouchableOpacity 
          onPress={() => router.push("/UserSetting")} 
          style={styles.settingsButton}
        >
          <View style={styles.settingsButtonHeader}>
            <View style={styles.settingsIconContainer}>
              <Ionicons name="settings-outline" size={20} color="#6b7280" />
            </View>
            <View style={styles.settingsButtonContent}>
              <Text style={styles.settingsButtonTitle}>App Settings</Text>
              <Text style={styles.settingsButtonSubtext}>Profile, Notifications, & Skin Type</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Hero Card


  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderTopWidth: 5, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendModule: {
    alignItems: 'flex-end',
  },

  // Insight Cards Redesign
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden', 
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardAccentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  cardBody: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardMainText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  
  // Badges
  impactBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  impactText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // Routine Styles
  routineIndicators: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 10,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 10,
  },

  heroTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  scoreNumber: {
    fontSize: 56,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -2,
  },
  scoreOutOf: {
    fontSize: 24,
    fontWeight: '400',
    color: '#6B7280',
  },
  scorePlaceholder: {
    width: 120,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  scorePlaceholderText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#D1D5DB',
  },
  riskLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  riskLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
  trendText: {
    fontSize: 14,
    fontWeight: '500',
  },
  microExplanation: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },

  // Insight Cards Grid
  cardsGrid: {
    gap: 6,
    marginBottom: 6,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardIcon: {
    fontSize: 20,
  },

  cardSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  cardInsight: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },

  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },

  routineCheckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routineCheck: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  routineLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },

  // Insight Banner
  insightBanner: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 6,
    gap: 12,
    alignItems: 'flex-start',
  },
  insightBannerIcon: {
    fontSize: 20,
  },
  insightBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#4338CA',
    lineHeight: 20,
  },

  // Action Buttons
  actionsContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
    marginBottom: 4,
  },
  tertiaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tertiaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  tertiaryButtonSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  tertiaryButtonContent: {
    alignItems: 'flex-start',
  },
  treatmentContainer: {
    gap: 12,
    marginBottom: 24,
  },
  treatmentButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  treatmentButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  treatmentIconContainer: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    padding: 6,
  },
  treatmentIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  treatmentButtonContent: {
    flex: 1,
  },
  treatmentButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  treatmentButtonSubtext: {
    fontSize: 13,
    color: '#6B7280',
  },
  chevron: {
    fontSize: 20,
    color: '#4F46E5',
  },
  safetyButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  safetyButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  safetyIconContainer: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    padding: 6,
  },
  safetyIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  safetyButtonContent: {
    flex: 1,
  },
  safetyButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  safetyButtonSubtext: {
    fontSize: 13,
    color: '#6B7280',
  },
  chevronWarning: {
    fontSize: 20,
    color: '#EF4444',
  },

  primaryActionButton: {
    backgroundColor: '#4F46E5', 
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  buttonIcon: {
    fontSize: 24,
  },
  buttonContent: {
    flex: 1,
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  primaryButtonSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  heroFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },


  settingsButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  settingsButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsButtonContent: {
    flex: 1,
  },
  settingsButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  settingsButtonSubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
});