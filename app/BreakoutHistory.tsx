import { format, isAfter, subDays, subMonths, subYears } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { Activity, ChevronLeft, TrendingDown, TrendingUp } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { auth, db } from '../FirebaseConfig';
import { useTheme } from '../app/theme/ThemeContext';

interface SkinLogEntry {
  id: string;
  score: number;
  timestamp: Timestamp;
}

interface ChartDataPoint {
  date: string;
  score: number;
  fullDate: Date;
}

type TimeRange = '3days' | 'week' | 'month' | 'year' | 'all';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function BreakoutHistory() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);

  const [logs, setLogs] = useState<SkinLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('week');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, `users/${user.uid}/skinLogs`),
      orderBy('timestamp', 'asc') 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            score: data.score,
            timestamp: data.timestamp,
          };
        })
        .filter(
          (log): log is SkinLogEntry =>
            log.timestamp instanceof Timestamp
        );

      setLogs(fetchedLogs);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching skin history:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredData = useMemo(() => {
    if (logs.length === 0) return [];

    const now = new Date();
    let startDate: Date;

    switch (selectedRange) {
      case '3days': startDate = subDays(now, 3); break;
      case 'week': startDate = subDays(now, 7); break;
      case 'month': startDate = subMonths(now, 1); break;
      case 'year': startDate = subYears(now, 1); break;
      case 'all': startDate = new Date(0); break;
    }

    const relevantLogs = logs.filter(log => {
      if (!log.timestamp) return false;
      return isAfter(log.timestamp.toDate(), startDate);
    });

    if (relevantLogs.length === 0) return [];

    const mapped: ChartDataPoint[] = relevantLogs.map(log => {
      const date = log.timestamp.toDate();
      let label = '';
      
      if (selectedRange === '3days' || selectedRange === 'week') {
        label = format(date, 'EEE'); 
      } else if (selectedRange === 'month') {
        label = format(date, 'd MMM');
      } else {
        label = format(date, 'MMM');
      }

      return {
        date: label,
        score: log.score,
        fullDate: date
      };
    });

    return mapped.length > 15 ? mapped.slice(mapped.length - 15) : mapped;
  }, [logs, selectedRange]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) return { lowest: 0, avg: 0, improvement: 0 };
    
    const scores = filteredData.map(d => d.score);
    const lowest = Math.min(...scores);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const oldest = scores[0];
    const newest = scores[scores.length - 1];
    const improvement = oldest - newest;

    return { lowest, avg, improvement };
  }, [filteredData]);

  // --- Helpers ---
  const handleBack = () => router.back();

  const chartConfig = {
    backgroundGradientFrom: "#FFFFFF",
    backgroundGradientTo: "#FFFFFF",
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    strokeWidth: 3, 
    barPercentage: 0.5,
    decimalPlaces: 0,
    propsForDots: { r: "5", strokeWidth: "2", stroke: "#FFF", fill:"#8B5CF6" },
    propsForBackgroundLines: { strokeDasharray: "", stroke: "rgba(255,255,255,0.2)" },
    propsForLabels: { fontSize: 10, fontWeight: "600", fill: "rgba(255,255,255,0.8)" }
  };

  const rangeOptions: { value: TimeRange; label: string }[] = [
    { value: '3days', label: '3 Days' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
    { value: 'all', label: 'All' },
  ];

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <View style={styles.backCircle}>
            <ChevronLeft size={24} color={colors.primary} />
            </View>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Breakout History</Text>
            <Text style={styles.headerSubtitle}>Track your progress over time</Text>
        </View>
        <View style={{ width: 44 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Time Range Selector */}
        <MotiView 
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
        >
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagContainer} // Moved style here
            >
                {rangeOptions.map((range) => {
                    const isActive = selectedRange === range.value;
                    return (
                      <TouchableOpacity
                        key={range.value}
                        onPress={() => setSelectedRange(range.value)}
                        style={[
                            styles.tag, 
                            isActive ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.border }
                        ]}
                      >
                        <Text style={[
                            styles.tagText, 
                            isActive ? { color: '#FFF' } : { color: colors.subtext }
                        ]}>
                            {range.label}
                        </Text>
                      </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </MotiView>

        <View style={{ height: 24 }} />

        {/* Hero Card with Chart */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 500 }}
          style={styles.heroCard}
        >
          <LinearGradient
            colors={isDarkMode ? ['#6D28D9', '#4C1D95'] : ['#8B5CF6', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradientOverlay}
          />

          <View style={styles.heroContent}>
             <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={styles.heroIconContainer}>
                        <Activity color="#FFF" size={32} />
                    </View>
                    <View>
                        <Text style={styles.heroTitle}>Risk Score Trend</Text>
                        <Text style={styles.heroStatLabel}>Visualized Data</Text>
                    </View>
                 </View>
             </View>

            {filteredData.length > 0 ? (
                <View style={{ alignItems: 'center', marginLeft: -20, marginRight: -20 }}>
                  <LineChart
                    data={{
                      labels: filteredData.map(d => d.date),
                      datasets: [{ data: filteredData.map(d => d.score) }]
                    }}
                    width={SCREEN_WIDTH - 40}
                    height={300}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={chartConfig}
                    bezier
                    style={{ borderRadius: 16 }}
                    withInnerLines={false}
                    withOuterLines={false}
                    withVerticalLines={false}
                    withHorizontalLines={false}
                  />
                </View>
            ) : (
                <View style={{ height: 220, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>No data for this period</Text>
                </View>
            )}
          </View>
        </MotiView>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBox}>
                <Activity size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Summary Statistics</Text>
        </View>

        <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            delay={300}
            style={{ flexDirection: 'row', gap: 12 }} 
        >
            <View style={[styles.card, { flex: 1, padding: 16 }]}>
                 {/* Icon */}
                 <View style={[styles.cardIconCircle, { width: 38, height: 38, marginBottom: 12, backgroundColor: '#D1FAE5' }]}>
                    <TrendingDown color="#059669" size={20} />
                 </View>
                 
                 {/* Number */}
                 <Text style={[styles.heroStatNumber, { color: colors.text, fontSize: 28 }]}>
                    {stats.lowest}
                 </Text>
                 
                 {/* Label */}
                 <Text style={[styles.cardName, { fontSize: 13, marginBottom: 0 }]}>Lowest</Text>
            </View>

            <View style={[styles.card, { flex: 1, padding: 16 }]}>
                 {/* Icon */}
                 <View style={[styles.cardIconCircle, { width: 38, height: 38, marginBottom: 12, backgroundColor: '#DBEAFE' }]}>
                    <Activity color="#2563EB" size={20} />
                 </View>

                 {/* Number */}
                 <Text style={[styles.heroStatNumber, { color: colors.text, fontSize: 28 }]}>
                    {stats.avg}
                 </Text>

                 {/* Label */}
                 <Text style={[styles.cardName, { fontSize: 13, marginBottom: 0 }]}>Average</Text>
            </View>

            <View style={[styles.card, { flex: 1, padding: 16 }]}>
                 {/* Icon */}
                 <View style={[styles.cardIconCircle, { width: 38, height: 38, marginBottom: 12, backgroundColor: '#FCE7F3' }]}>
                    <TrendingUp color="#DB2777" size={20} />
                 </View>

                 {/* Number */}
                 <Text style={[styles.heroStatNumber, { fontSize: 28, color: stats.improvement >= 0 ? '#059669' : '#DC2626' }]}>
                    {stats.improvement > 0 ? '+' : ''}{stats.improvement}
                 </Text>

                 {/* Label */}
                 <Text style={[styles.cardName, { fontSize: 13, marginBottom: 0 }]}>Trend</Text>
            </View>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

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
    color: colors.primary,
    // fontWeight: '600',
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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: '#FFF', 
    marginBottom: 2,
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
    fontSize: 32,
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
  
  tagContainer: { 
    flexDirection: 'row', 
    gap: 10,
    paddingRight: 20,
  },
  tag: { 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 12,
    borderWidth: 1,
  },
  tagText: { 
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
});