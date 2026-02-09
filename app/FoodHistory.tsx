import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../FirebaseConfig';
import { useTheme } from '../app/theme/ThemeContext';

interface FoodLogEntry {
  id: string;
  foodName: string;
  acneRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  triggers: string[];
  timestamp: any; 
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'; 
}

const MEAL_EMOJIS = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍪',
  default: '🍽️'
};

export default function FoodLogHistory() {
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();

  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, `users/${user.uid}/foodLogs`),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEntries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FoodLogEntry[];
      
      setEntries(fetchedEntries);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching food history:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredEntries = useMemo(() => {
    if (selectedFilter === 'all') return entries;
    return entries.filter(entry => entry.riskLevel === selectedFilter);
  }, [entries, selectedFilter]);

  const stats = useMemo(() => {
    const total = entries.length;
    const avg = total > 0 
      ? (entries.reduce((acc, entry) => acc + entry.acneRiskScore, 0) / total).toFixed(1)
      : '0';
    const highRisk = entries.filter(e => e.riskLevel === 'high').length;
    return { total, avg, highRisk };
  }, [entries]);

  const handleBack = () => router.back();
  const handleScanFood = () => router.push("/FoodPhotoCapture");

  const getRiskTheme = (level: string) => {
    switch (level) {
      case 'low': return { bg: '#10B981', light: '#D1FAE5', text: '#065F46' };
      case 'medium': return { bg: '#F59E0B', light: '#FEF3C7', text: '#92400E' };
      case 'high': return { bg: '#EF4444', light: '#FEE2E2', text: '#991B1B' };
      default: return { bg: '#6B7280', light: '#F3F4F6', text: '#1F2937' };
    }
  };

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return { date: '', time: '' };
    const date = timestamp.toDate();
    return {
      date: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const renderEntry = ({ item }: { item: FoodLogEntry }) => {
    const { date, time } = formatDateTime(item.timestamp);
    const riskTheme = getRiskTheme(item.riskLevel);
    const emoji = item.mealType ? MEAL_EMOJIS[item.mealType] : MEAL_EMOJIS.default;

    return (
      <TouchableOpacity 
        style={[styles.entryCard, { borderLeftColor: riskTheme.bg }]}
        activeOpacity={0.9}
        onPress={() => router.push({
          pathname: "/FoodLogDetail",
          params: { foodId: item.id } 
        })}
      >
        {/* Mock Photo Section */}
        <View style={styles.cardPhotoSection}>
          <Text style={styles.cardEmoji}>{emoji}</Text>
          <View style={[styles.floatingRiskBadge, { backgroundColor: riskTheme.bg }]}>
            <Text style={styles.floatingRiskScore}>{item.acneRiskScore}</Text>
            <Text style={styles.floatingRiskLabel}>RISK</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardFoodName}>{item.foodName}</Text>
            <Text style={styles.cardDateTime}>{date} • {time}</Text>
          </View>

          {item.triggers && item.triggers[0] !== 'None detected' ? (
            <View style={[styles.triggerAlert, { backgroundColor: riskTheme.light, borderColor: riskTheme.bg + '30' }]}>
              <Text style={[styles.triggerTitle, { color: riskTheme.text }]}>Potential Triggers</Text>
              <Text style={[styles.triggerText, { color: riskTheme.text }]}>
                {item.triggers.join(', ')}
              </Text>
            </View>
          ) : (
            <View style={styles.safeContainer}>
              <Text style={styles.safeText}>✓ No known triggers detected</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <View style={styles.backCircle}>
          <ChevronLeft size={24} color={colors.primary} />
        </View>

        </TouchableOpacity>
        <View style={styles.headerTitleWrapper}>
        <Text style={styles.headerTitle}>Food Log</Text>
        </View>

        <TouchableOpacity onPress={handleScanFood} style={styles.scanBadge}>
          <Text style={styles.scanText}>+ Scan</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredEntries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: '#FFF1F2', borderColor: '#FFE4E6' }]}>
                <View style={[styles.statIconCircle, { backgroundColor: '#F43F5E' }]}>
                  <Text style={styles.statIconText}>🍽️</Text>
                </View>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Logged</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#EEF2FF', borderColor: '#E0E7FF' }]}>
                <View style={[styles.statIconCircle, { backgroundColor: '#6366F1' }]}>
                  <Text style={styles.statIconText}>📈</Text>
                </View>
                <Text style={styles.statValue}>{stats.avg}</Text>
                <Text style={styles.statLabel}>Avg Risk</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
                <View style={[styles.statIconCircle, { backgroundColor: '#EF4444' }]}>
                  <Text style={styles.statIconText}>🔥</Text>
                </View>
                <Text style={styles.statValue}>{stats.highRisk}</Text>
                <Text style={styles.statLabel}>High Risk</Text>
              </View>
            </View>

            {/* Sticky-like Filters */}
            <View style={styles.filterWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                {(['all', 'low', 'medium', 'high'] as const).map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterTab, 
                      selectedFilter === filter && styles.filterTabActive
                    ]}
                    onPress={() => setSelectedFilter(filter)}
                  >
                    <Text style={[
                      styles.filterTabText, 
                      selectedFilter === filter && styles.filterTabTextActive
                    ]}>
                      {filter.toUpperCase()} ({filter === 'all' ? entries.length : entries.filter(e => e.riskLevel === filter).length})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
               <Text style={styles.emptyEmoji}>🍽️</Text>
            </View>
            <Text style={styles.emptyTitle}>No meals logged yet</Text>
            <Text style={styles.emptySubtext}>Start tracking your meals to understand how they affect your skin.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleScanFood}>
              <Text style={styles.primaryButtonText}>Scan Your First Meal</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background2,
    },

    header: {
      backgroundColor: colors.background,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      // borderBottomWidth: 1,
      // borderBottomColor: colors.borderBottomColor,
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

    scanBadge: {
      flexDirection: 'row',
      backgroundColor: '#6366F1',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      alignItems: 'center',
      gap: 4,
    },

    scanText: {
      fontSize: 16,
      color: '#FFF',
      fontWeight: '700',
    },

    statsGrid: {
      flexDirection: 'row',
      padding: 20,
      gap: 12,
    },

    statCard: {
      flex: 1,
      padding: 15,
      borderRadius: 20,
      alignItems: 'center',
      borderWidth: 1,
      backgroundColor: colors.headerBackground,
      borderColor: colors.borderBottomColor,
    },

    statIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },

    statIconText: {
      fontSize: 18,
    },

    statValue: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.statValue,
    },

    statLabel: {
      fontSize: 10,
      fontWeight: '600',
      marginTop: 2,
      color: colors.statLabel,
    },

    filterWrapper: {
      paddingVertical: 10,
      backgroundColor: colors.headerBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderBottomColor,
    },

    filterScroll: {
      paddingHorizontal: 20,
      gap: 10,
    },

    filterTab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.borderBottomColor,
    },

    filterTabActive: {
      backgroundColor: colors.filterTabActive,
    },

    filterTabText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.filterTabText,
    },

    filterTabTextActive: {
      color: colors.filterTabTextActive,
    },

    listContent: {
      paddingBottom: 40,
    },

    entryCard: {
      backgroundColor: colors.cardBackground,
      marginHorizontal: 20,
      marginTop: 16,
      borderRadius: 24,
      overflow: 'hidden',
      borderLeftWidth: 5,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 3,
    },

    cardPhotoSection: {
      height: 140,
      backgroundColor: colors.cardPhotoBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },

    cardEmoji: {
      fontSize: 50,
    },

    floatingRiskBadge: {
      position: 'absolute',
      top: 15,
      right: 15,
      width: 54,
      height: 54,
      borderRadius: 27,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: colors.riskBadgeBorder,
    },

    floatingRiskScore: {
      color: colors.onAccent,
      fontSize: 18,
      fontWeight: '900',
    },

    floatingRiskLabel: {
      color: colors.onAccentMuted,
      fontSize: 7,
      fontWeight: '800',
    },

    cardContent: {
      padding: 16,
    },

    cardHeader: {
      marginBottom: 12,
    },

    cardFoodName: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
    },

    cardDateTime: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
    },

    triggerAlert: {
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
    },

    triggerTitle: {
      fontSize: 12,
      fontWeight: '800',
      marginBottom: 2,
    },

    triggerText: {
      fontSize: 12,
      lineHeight: 18,
    },

    safeContainer: {
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      backgroundColor: colors.safeBackground,
      borderColor: colors.safeBorder,
    },

    safeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.safeText,
    },

    emptyState: {
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 40,
    },

    emptyIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.emptyIconBg,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },

    emptyEmoji: {
      fontSize: 40,
    },

    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 8,
    },

    emptySubtext: {
      textAlign: 'center',
      color: colors.textMuted,
      lineHeight: 22,
      marginBottom: 24,
    },

    primaryButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: 30,
      paddingVertical: 15,
      borderRadius: 20,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },

    primaryButtonText: {
      color: colors.onAccent,
      fontSize: 16,
      fontWeight: '700',
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
  });
