import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  Flame,
  Lightbulb,
  RefreshCw,
  Sparkles
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../FirebaseConfig';

import { useTheme } from '../app/theme/ThemeContext';

type RiskLevel = 'low' | 'medium' | 'high';

interface RiskTheme {
  bg: string;
  light: string;
  text: string;
  primary: string;
  label: string;
}

interface FoodLogEntry {
  foodName: string;
  acneRiskScore: number;
  riskLevel: RiskLevel;
  triggers: string[];
  confidence: number;
  timestamp: any;
  recommendations?: string[];
}

export default function FoodLogDetailScreen() {
  const router = useRouter();

  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors);
  const { foodId } = useLocalSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [foodData, setFoodData] = useState<FoodLogEntry | null>(null);
  const [foodName, setFoodName] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [showConfidence, setShowConfidence] = useState(true);
  const [confidence, setConfidence] = useState<number>(0);


    const handleScanFood = () => router.push("/FoodPhotoCapture");

  useEffect(() => {
    const fetchFoodLog = async () => {
      const user = auth.currentUser;
      if (!user || !foodId) return;

      try {
        const docRef = doc(db, `users/${user.uid}/foodLogs`, foodId as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as FoodLogEntry;
          setFoodData(data);
          setFoodName(data.foodName);
          setConfidence(data.confidence);
        } else {
          router.back();
        }
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setShowConfidence(userSnap.data().showConfidence ?? true);
        }
      } catch (error) {
        console.error("Error fetching food log:", error);
        Alert.alert("Error", "Could not load food log.");
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    fetchFoodLog();
  }, [foodId]);

  const handleFoodNameChange = (text: string) => {
    setFoodName(text);
    setHasChanges(text !== foodData?.foodName);
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user || !foodId || !foodData) return;

    try {
      const docRef = doc(db, `users/${user.uid}/foodLogs`, foodId as string);
      await updateDoc(docRef, { foodName });
      setFoodData({ ...foodData, foodName });
      setHasChanges(false);
      Alert.alert("Success", "Food log updated");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not save changes");
    }
  };

  const getRiskColor = (level: RiskLevel): RiskTheme => {
    switch (level) {
      case 'low':
        return {
          bg: '#10B981',
          light: '#D1FAE5',
          text: '#065F46',
          primary: '#10B981',
          label: 'Low Risk'
        };
      case 'medium':
        return {
          bg: '#F59E0B',
          light: '#FEF3C7',
          text: '#92400E',
          primary: '#F59E0B',
          label: 'Medium Risk'
        };
      case 'high':
        return {
          bg: '#EF4444',
          light: '#FEE2E2',
          text: '#991B1B',
          primary: '#EF4444',
          label: 'High Risk'
        };
      default:
        return {
          bg: '#6B7280',
          light: '#F3F4F6',
          text: '#1F2937',
          primary: '#6B7280',
          label: 'Unknown'
        };
    }
  };

  if (isLoading || !foodData) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FA9DA8" />
        <Text style={styles.loadingText}>Loading details...</Text>
      </SafeAreaView>
    );
  }

  const riskTheme = getRiskColor(foodData.riskLevel);
  const normalizedScore = foodData.acneRiskScore;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <View style={styles.backCircle}>
          <ChevronLeft size={24} color={colors.primary} />
        </View>
        </TouchableOpacity>
        <View style={styles.headerTitleWrapper}>
        <Text style={styles.headerTitle}>Scan Details</Text>
        </View>

        <TouchableOpacity onPress={handleScanFood} style={styles.scanBadge}>
          <Text style={styles.scanText}>+ Scan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Food Identification Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Sparkles size={20} color="#FA9DA8" />
            <Text style={styles.cardTitle}>Identified Food</Text>
            <Text style={styles.editHint}>Edit if incorrect</Text>
          </View>

          <TextInput
            style={[
              styles.foodNameInput,
              isEditing && styles.foodNameInputFocused
            ]}
            value={foodName}
            onChangeText={handleFoodNameChange}
            onFocus={() => setIsEditing(true)}
            onBlur={() => setIsEditing(false)}
            placeholder="Enter food name..."
            placeholderTextColor="#9CA3AF"
          />

          {/* AI Confidence Badge */}
          <View style={styles.confidenceContainer}>
            {showConfidence && (
            <View style={styles.confidenceBadge}>
              <Sparkles size={16} color="#6366F1" />
              <View style={styles.confidenceTextContainer}>
                <Text style={styles.confidenceLabel}>AI Confidence</Text>
                  <Text style={styles.confidenceValue}>{foodData.confidence}%</Text>
              </View>
            </View>)}



            {hasChanges && (
              <TouchableOpacity style={styles.updateButton} onPress={handleSave}>
                <RefreshCw color="#FFF" size={14} />
                <Text style={styles.updateButtonText}>Update</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Acne Risk Score Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Flame size={20} color="#FF6B6B" />
            <Text style={styles.cardTitle}>Acne Risk Score</Text>
          </View>

          <View style={styles.scoreContainer}>
            <View style={styles.scoreLeft}>
              <View style={styles.scoreDisplay}>
                <Text style={[styles.scoreNumber, { color: riskTheme.bg }]}>
                  {normalizedScore}
                </Text>
                <Text style={styles.scoreMax}>/100</Text>
              </View>

              <View style={[styles.riskBadge, { backgroundColor: riskTheme.light }]}>
                <View style={[styles.riskDot, { backgroundColor: riskTheme.bg }]} />
                <Text style={[styles.riskLabel, { color: riskTheme.text }]}>
                  {riskTheme.label.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Visual Risk Meter */}
            <View style={styles.meterContainer}>
              {Array.from({ length: 10 }, (_, i) => 10 - i).map((level) => {
                const threshold = level * 10;
                return (
                  <View
                    key={level}
                    style={[
                      styles.meterBar,
                      {
                        backgroundColor: normalizedScore >= threshold ? riskTheme.bg : '#E5E7EB',
                        opacity: normalizedScore >= threshold ? 1 : 0.3,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </View>

        {/* Triggers Detected Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <AlertTriangle size={20} color="#EF4444" />
            <Text style={styles.cardTitle}>Triggers Detected</Text>
            {foodData.triggers.filter(t => t.toLowerCase() !== 'none detected' && t.trim() !== "").length > 0 && (
              <View style={styles.triggerCount}>
                <Text style={styles.triggerCountText}>{foodData.triggers.length}</Text>
              </View>
            )}
          </View>

          {foodData.triggers.filter(t => t.toLowerCase() !== 'none detected' && t.trim() !== "").length === 0 ? (
            <View style={styles.safeContainer}>
              <CheckCircle size={20} color="#10B981" />
              <Text style={styles.safeText}>No known triggers detected</Text>
            </View>
          ) : (
            <View style={styles.triggersList}>
              {foodData.triggers
                .filter(t => t.toLowerCase() !== 'none detected' && t.trim() !== "")
                .map((trigger, idx) => (
                <View key={idx} style={styles.triggerItem}>
                  <AlertTriangle size={16} color="#EF4444" />
                  <Text style={styles.triggerText}>{trigger}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Recommendations Card */}
        {foodData.recommendations && foodData.recommendations.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Lightbulb size={20} color="#F59E0B" />
              <Text style={styles.cardTitle}>Recommendations</Text>
            </View>

            <View style={styles.recommendationsList}>
              {foodData.recommendations.map((rec, idx) => (
                <View key={idx} style={styles.recommendationItem}>
                  <View style={styles.recommendationIcon}>
                    <Lightbulb size={14} color="#F59E0B" />
                  </View>
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Log Different Meal Button */}
        {/* <TouchableOpacity
          style={styles.logDifferentButton}
          onPress={() => router.push('/FoodPhotoCapture')}
          activeOpacity={0.8}
        >
          <Plus color="#374151" size={20} />
          <Text style={styles.logDifferentButtonText}>Log Different Meal</Text>
        </TouchableOpacity> */}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },

    loadingText: {
      marginTop: 12,
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: colors.background,
      // borderBottomWidth: 1,
      // borderBottomColor: colors.headerBorder,
    },

    headerTitleWrapper: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      pointerEvents: 'none',
    },

    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
    },

    iconBtn: {
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
      fontWeight: '600',
      color: colors.primary,
    },

    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },

    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },

    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },

    cardTitle: {
      flex: 1,
      marginLeft: 8,
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },

    editHint: {
      fontSize: 11,
      fontStyle: 'italic',
      color: colors.textMuted,
    },

    foodNameInput: {
      backgroundColor: colors.backgroundAlt,
      borderWidth: 2,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },

    foodNameInputFocused: {
      borderColor: colors.accentBorder,
      backgroundColor: colors.card,
      shadowColor: colors.accentBorder,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },

    confidenceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    confidenceBadge: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.badgeBorderColor,
    },

    confidenceTextContainer: {
      marginLeft: 8,
    },

    confidenceLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.label,
    },

    confidenceValue: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.primary,
    },

    updateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      gap: 4,
      backgroundColor: colors.label,
      shadowColor: colors.label,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },

    updateButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.card,
    },

    scoreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    scoreLeft: {
      flex: 1,
    },

    scoreDisplay: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 12,
    },

    scoreNumber: {
      fontSize: 56,
      fontWeight: '800',
      letterSpacing: -2,
    },

    scoreMax: {
      marginLeft: 4,
      fontSize: 28,
      fontWeight: '700',
      color: colors.textMuted,
    },

    riskBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
    },

    riskDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },

    riskLabel: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.5,
    },

    meterContainer: {
      marginLeft: 16,
      gap: 4,
    },

    meterBar: {
      width: 64,
      height: 6,
      borderRadius: 3,
    },

    triggerCount: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FEE2E2',
    },

    triggerCountText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#991B1B',
    },

    safeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 14,
      borderRadius: 12,
      backgroundColor: colors.safeBackground,
      borderWidth: 1,
      borderColor: colors.safeBorder,
    },

    safeText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.safeText,
    },

    triggersList: {
      gap: 10,
    },

    triggerItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },

    triggerText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500',
      lineHeight: 18,
      color: colors.dangerText,
    },

    recommendationsList: {
      gap: 12,
    },

    recommendationItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },

    recommendationIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.warningBg,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 2,
    },

    recommendationText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500',
      lineHeight: 20,
      color: colors.textSecondary,
    },

    logDifferentButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 16,
      marginTop: 8,
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.cardBorder,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },

    logDifferentButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textSecondary,
    },

    scanBadge: {
      backgroundColor: '#6366F1',
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 20,
    },

    scanText: {
      color: '#FFF',
      fontWeight: '700',
    },

    backButton: {
      padding: 4,
    },
  });

