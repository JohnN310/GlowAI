import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { AcneDetectionResult, AcneType } from './AcneDetectionResults';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useTheme } from '../app/theme/ThemeContext';
import { auth, db } from '../FirebaseConfig';

import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  ShieldCheck,
  Sparkles
} from 'lucide-react-native';


interface Treatment {
  id: string;
  name: string;
  activeIngredient: string;
  strength: string;
  description: string;
  timing: ('AM' | 'PM')[];
  acneTypes: AcneType[];
  genericOptions: string[];
  brandExamples: string[];
  instructions: string;
}

interface TreatmentRecommendationsProps {
  result?: AcneDetectionResult;
  onBack?: () => void;
  onViewSafety?: () => void;
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function TreatmentRecommendations() {
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);

  const router = useRouter();
  const params = useLocalSearchParams();
  const [expandedTreatment, setExpandedTreatment] = useState<string | null>(null);

  const [activeScans, setActiveScans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
  const fetchActiveScans = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setIsLoading(true);
      const scansRef = collection(db, `users/${user.uid}/acneScans`);
      const q = query(scansRef, where('status', '==', 'active'));
      const querySnapshot = await getDocs(q);

      // console.log("Documents found:", querySnapshot.docs.length);
      // querySnapshot.docs.forEach(doc => {
      //   console.log(`Doc ID: ${doc.id}, Spots in this doc:`, doc.data().detectedAcne?.length);
      // });
      
      const scansData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setActiveScans(scansData);
    } catch (error) {
      console.error("Error fetching scans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  fetchActiveScans();
}, []);

const recommendedTreatments = useMemo((): Treatment[] => {
  if (activeScans.length === 0) return ALL_TREATMENTS.slice(0, 3);

  const detectedTypes = new Set<string>();
  activeScans.forEach(scan => {
    if (scan.detectedAcne && Array.isArray(scan.detectedAcne)) {
      scan.detectedAcne.forEach((acne: any) => {
        if (acne.type) detectedTypes.add(acne.type);
      });
    }
  });

  if (detectedTypes.size === 0) return ALL_TREATMENTS.slice(0, 3);

  const matched = ALL_TREATMENTS.filter(treatment =>
    treatment.acneTypes.some(type => detectedTypes.has(type))
  );

  return matched.length > 0 ? matched : ALL_TREATMENTS.slice(0, 3);
}, [activeScans]);

const toggleTreatment = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedTreatment(expandedTreatment === id ? null : id);
  };

  const detectedTypesSet = useMemo(() => {
    const types = new Set<string>();
    activeScans.forEach(scan => {
      scan.detectedAcne?.forEach((acne: any) => types.add(acne.type));
    });
    return types;
  }, [activeScans]);

  const onBack = () => router.back();
  const onViewSafety = () => router.push("/SafetyWarnings");

  const getTimingColor = (timing: ('AM' | 'PM')[]): string => {
    if (timing.includes('AM') && timing.includes('PM')) return '#8B5CF6';
    if (timing.includes('PM')) return '#3B82F6';
    return '#F59E0B';
  };

  const getTimingLabel = (timing: ('AM' | 'PM')[]): string => {
    if (timing.includes('AM') && timing.includes('PM')) return 'AM & PM';
    if (timing.includes('PM')) return 'PM Only';
    return 'AM Only';
  };

  const totalSpots = useMemo(() => {
    return activeScans.reduce((totalSum, scan) => {
      const scanTotal = scan.detectedAcne?.reduce((acc: number, item: any) => {
        return acc + (Number(item.count) || 0);
      }, 0) || 0;      
      return totalSum + scanTotal;
    }, 0);
  }, [activeScans]);

if (isLoading) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.subtext }}>Analyzing active scans...</Text>
      </View>
    </SafeAreaView>
  );
}

/* New Update 1/3/26 */
return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backCircle}>
            <ChevronLeft size={24} color={colors.primary} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Treatment Plan</Text>
          <Text style={styles.headerSubtitle}>Personalized for you</Text>
        </View>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.heroCard}>
          <View style={styles.heroGradientOverlay} />
          <View style={styles.heroContent}>
            <View style={styles.heroIconContainer}>
              <Sparkles size={28} color="#FFD700" />
            </View>
            <Text style={styles.heroTitle}>Analysis Complete</Text>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNumber}>{totalSpots}</Text>
                <Text style={styles.heroStatLabel}>Active Spots</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNumber}>{detectedTypesSet.size}</Text>
                <Text style={styles.heroStatLabel}>Acne Types</Text>
              </View>
            </View>
            <View style={styles.tagContainer}>
              {Array.from(detectedTypesSet).map((type, i) => (
                <View key={i} style={[styles.tag, { backgroundColor: getTagColor(i) }]}>
                  <Text style={styles.tagText}>{type}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconBox}>
            <Text style={styles.sectionIcon}>💊</Text>
          </View>
          <Text style={styles.sectionTitle}>Recommended Treatments</Text>
        </View>

        {recommendedTreatments.map((treatment, index) => (
          <View 
            key={treatment.id} 
            style={[
              styles.card, 
              expandedTreatment === treatment.id && styles.activeCard,
              { borderLeftColor: getCardAccentColor(index) }
            ]}
          >
            <TouchableOpacity 
              onPress={() => toggleTreatment(treatment.id)} 
              activeOpacity={0.7}
              style={styles.cardPressable}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconCircle, { backgroundColor: getCardAccentColor(index) + '20' }]}>
                  <Text style={styles.cardIconEmoji}>✨</Text>
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardName}>{treatment.name}</Text>
                  <Text style={styles.cardIngredient}>
                    {treatment.activeIngredient} • {treatment.strength}
                  </Text>
                </View>
              </View>
              
              <View style={[styles.timingBadge, { backgroundColor: getCardAccentColor(index) + '15' }]}>
                <Clock size={14} color={getCardAccentColor(index)} />
                <Text style={[styles.timingText, { color: getCardAccentColor(index) }]}>
                  {treatment.timing.join(' & ')}
                </Text>
              </View>
              
              <Text style={styles.cardDesc} numberOfLines={expandedTreatment === treatment.id ? undefined : 2}>
                {treatment.description}
              </Text>
              
              <View style={styles.expandRow}>
                <Text style={[styles.expandText, { color: getCardAccentColor(index) }]}>
                  {expandedTreatment === treatment.id ? 'Show Less' : 'Show Details'}
                </Text>
                {expandedTreatment === treatment.id ? 
                  <ChevronDown size={18} color={getCardAccentColor(index)} /> : 
                  <ChevronRight size={18} color={getCardAccentColor(index)} />
                }
              </View>
            </TouchableOpacity>

            {expandedTreatment === treatment.id && (
              <View style={styles.details}>
                <View style={[styles.instructionBox, { backgroundColor: getCardAccentColor(index) + '10' }]}>
                  <View style={[styles.instructionIconCircle, { backgroundColor: getCardAccentColor(index) + '25' }]}>
                    <ShieldCheck size={20} color={getCardAccentColor(index)} />
                  </View>
                  <Text style={[styles.instructionText, { color: isDarkMode ? colors.text : '#1E293B' }]}>
                    {treatment.instructions}
                  </Text>
                </View>

                <View style={styles.brandSection}>
                  <View style={styles.brandHeader}>
                    <Text style={styles.detailLabel}>TRUSTED BRANDS</Text>
                    <View style={styles.brandCount}>
                      <Text style={styles.brandCountText}>{treatment.brandExamples.length}</Text>
                    </View>
                  </View>
                  <View style={styles.brandContainer}>
                    {treatment.brandExamples.map((brand, i) => (
                      <View key={i} style={[styles.brandChip, { borderColor: getCardAccentColor(index) + '40' }]}>
                        <Text style={styles.brandChipText}>{brand}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>
        ))}

        <TouchableOpacity 
          style={styles.safetyButton} 
          onPress={() => router.push("/SafetyWarnings")}
          activeOpacity={0.8}
        >
          <View style={styles.safetyContent}>
            <View style={styles.safetyIconBox}>
              <AlertTriangle size={26} color="#DC2626" />
            </View>
            <View style={styles.safetyTextContainer}>
              <Text style={styles.safetyTitle}>⚠️ Safety Guidelines</Text>
              <Text style={styles.safetySub}>Learn what to avoid & prevent scarring</Text>
            </View>
          </View>
          <View style={styles.safetyArrow}>
            <ChevronRight size={24} color="#DC2626" />
          </View>
        </TouchableOpacity>

        <View style={styles.disclaimer}>
          <View style={styles.disclaimerIconCircle}>
            <Info size={18} color="#6366F1" />
          </View>
          <Text style={styles.disclaimerText}>
            These are AI-powered recommendations based on your skin profile. Always patch test new products and consult a dermatologist for severe or persistent acne.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const getTagColor = (index: number) => {
  const colors = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'];
  return colors[index % colors.length] + '25';
};

const getCardAccentColor = (index: number) => {
  const colors = ['#8B5CF6', '#EC4899', '#10B981', '#3B82F6', '#F59E0B'];
  return colors[index % colors.length];
};

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: isDarkMode ? colors.background : '#F8FAFC' 
  },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: colors.subtext, fontWeight: '600' },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
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
  headerTextContainer: {
    alignItems: 'center',
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '500',
  },
  scrollContent: { padding: 20, paddingBottom: 60 },
  
  heroCard: {
    borderRadius: 28,
    marginBottom: 32,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  heroGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: isDarkMode ? '#6D28D9' : '#8B5CF6',
  },
  heroContent: {
    padding: 28,
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: { 
    fontSize: 26, 
    fontWeight: '900', 
    color: '#FFF', 
    marginBottom: 20,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 4,
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tagContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10,
  },
  tag: { 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  tagText: { 
    color: '#FFF', 
    fontSize: 13, 
    fontWeight: '700', 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: colors.text,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  activeCard: { 
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardPressable: { padding: 20 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  cardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconEmoji: {
    fontSize: 22,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardName: { 
    fontSize: 19, 
    fontWeight: '800', 
    color: colors.text, 
    marginBottom: 4,
  },
  cardIngredient: { 
    fontSize: 13, 
    color: colors.subtext, 
    fontWeight: '600',
  },
  timingBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 12, 
    alignSelf: 'flex-start', 
    gap: 6,
    marginBottom: 12,
  },
  timingText: { 
    fontSize: 12, 
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardDesc: { 
    fontSize: 15, 
    color: colors.subtext, 
    lineHeight: 22,
    marginBottom: 16,
  },
  expandRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
  },
  expandText: { 
    fontSize: 14, 
    fontWeight: '700',
  },

  details: { 
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
    borderTopWidth: 1, 
    borderTopColor: colors.border,
  },
  instructionBox: { 
    padding: 18, 
    borderRadius: 18, 
    flexDirection: 'row', 
    gap: 14, 
    marginBottom: 24,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  instructionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionText: { 
    flex: 1, 
    fontSize: 14, 
    lineHeight: 20, 
    fontWeight: '500',
  },
  brandSection: {
    marginTop: 8,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: { 
    fontSize: 11, 
    fontWeight: '900', 
    color: colors.subtext, 
    letterSpacing: 1.2,
  },
  brandCount: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  brandCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  brandContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10,
  },
  brandChip: { 
    backgroundColor: colors.surface, 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 12, 
    borderWidth: 1.5,
  },
  brandChipText: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: colors.text,
  },

  safetyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    padding: 20,
    borderRadius: 24,
    marginTop: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FECACA',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  safetyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  safetyIconBox: { 
    width: 56, 
    height: 56, 
    borderRadius: 16, 
    backgroundColor: '#FEE2E2', 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  safetyTextContainer: {
    flex: 1,
  },
  safetyTitle: { 
    fontSize: 17, 
    fontWeight: '800', 
    color: '#991B1B',
    marginBottom: 4,
  },
  safetySub: { 
    fontSize: 13, 
    color: '#B91C1C',
    fontWeight: '500',
  },
  safetyArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  disclaimer: { 
    flexDirection: 'row', 
    backgroundColor: isDarkMode ? colors.surface : '#EEF2FF',
    padding: 20, 
    borderRadius: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  disclaimerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DDD6FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disclaimerText: { 
    flex: 1, 
    fontSize: 13, 
    color: isDarkMode ? '#A5B4FC' : '#4338CA',
    lineHeight: 20,
    fontWeight: '500',
  },
});



const ALL_TREATMENTS: Treatment[] = [
    {
      id: '1',
      name: 'Benzoyl Peroxide',
      activeIngredient: 'Benzoyl Peroxide',
      strength: '2.5% - 10%',
      description: 'Kills acne-causing bacteria and reduces inflammation.',
      timing: ['PM'],
      acneTypes: ['papule', 'pustule', 'comedone'],
      genericOptions: ['BP Gel 2.5%', 'BP Wash 10%'],
      brandExamples: ['PanOxyl', 'Effaclar', 'Neutrogena'],
      instructions: 'Apply a thin layer to affected area after cleansing. Start with 2.5% to minimize irritation. Use PM only as it can bleach fabrics.',
    },
    {
      id: '2',
      name: 'Salicylic Acid',
      activeIngredient: 'Salicylic Acid',
      strength: '0.5% - 2%',
      description: 'Unclogs pores and exfoliates dead skin cells deep inside.',
      timing: ['AM', 'PM'],
      acneTypes: ['comedone', 'papule'],
      genericOptions: ['BHA Spot Gel', 'SA Serum'],
      brandExamples: ['Paula\'s Choice', 'The Ordinary', 'CeraVe'],
      instructions: 'Apply to clean, dry skin. Can be used AM and/or PM. Start with once daily and increase frequency as tolerated.',
    },
    {
      id: '3',
      name: 'Sulfur Treatment',
      activeIngredient: 'Sulfur',
      strength: '3% - 10%',
      description: 'Absorbs excess oil and has antimicrobial properties.',
      timing: ['PM'],
      acneTypes: ['papule', 'pustule', 'cyst'],
      genericOptions: ['Sulfur Spot Treatment'],
      brandExamples: ['Kate Somerville', 'Mario Badescu'],
      instructions: 'Apply a small amount directly to blemish before bed. Do not mix with benzoyl peroxide.',
    },
    {
      id: '4',
      name: 'Niacinamide',
      activeIngredient: 'Niacinamide',
      strength: '2% - 10%',
      description: 'Reduces inflammation and regulates oil production.',
      timing: ['AM', 'PM'],
      acneTypes: ['papule', 'pustule', 'nodule'],
      genericOptions: ['Vitamin B3 Serum'],
      brandExamples: ['The Ordinary', 'Good Molecules'],
      instructions: 'Apply to entire face or affected areas after cleansing. Safe to use twice daily.',
    },
    {
        id: '5',
        name: 'Azelaic Acid',
        activeIngredient: 'Azelaic Acid',
        strength: '10% - 20%',
        description: 'Kills bacteria, reduces inflammation, and fades post-acne marks.',
        timing: ['PM'],
        acneTypes: ['papule', 'pustule', 'comedone'],
        genericOptions: ['Azelaic Acid Suspension'],
        brandExamples: ['The Ordinary', 'Paula\'s Choice'],
        instructions: 'Apply a thin layer to clean skin in the evening. May cause mild tingling initially.',
    },
];
