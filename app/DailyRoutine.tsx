import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Activity,
    Calendar,
    CheckCircle2,
    ChevronLeft,
    Filter,
    Sparkles,
    XCircle,
    Zap
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
    Dimensions,
    Modal,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    FadeInDown,
    ZoomIn,
    ZoomOut
} from 'react-native-reanimated';

// Import the specific types from your ThemeContext
import { ThemeColors, useTheme } from '../app/theme/ThemeContext';

type TimeRange = '7days' | '30days' | '90days';
type RoutineStatus = 'completed' | 'partial' | 'skipped' | 'nodata';
type FilterType = 'all' | 'morning' | 'night' | 'missed';

interface DayData {
  date: string;
  morning: boolean;
  night: boolean;
  aiNote?: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = 20;
const CELL_GAP = 8;
const CELL_SIZE = (SCREEN_WIDTH - (GRID_PADDING * 2) - (CELL_GAP * 6)) / 7;

// Define status colors locally since they aren't in ThemeContext
const STATUS_COLORS = {
  success: '#10B981', // Emerald 500
  warning: '#F59E0B', // Amber 500
  danger: '#EF4444',  // Red 500
  nodata: '#9CA3AF',  // Gray 400
};

export default function DailyRoutineHistory() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);

  const onBack = () => router.back();

  const [selectedRange, setSelectedRange] = useState<TimeRange>('30days');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  const generateMockData = (): DayData[] => {
    const data: DayData[] = [];
    const today = new Date('2026-02-16');
    const aiNotes = [
      "Routine skipped before breakout detected the next day.",
      "Consistent routine correlated with clear skin.",
      "Partial routine completion - breakout risk increased.",
      undefined, undefined, undefined,
    ];
    
    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const morning = i > 60 ? Math.random() > 0.3 : Math.random() > 0.6;
      const night = i > 60 ? Math.random() > 0.4 : Math.random() > 0.5;
      const hasAiNote = (morning || night) && Math.random() > 0.7;
      
      data.push({
        date: dateStr,
        morning,
        night,
        aiNote: hasAiNote ? aiNotes[Math.floor(Math.random() * aiNotes.length)] : undefined,
      });
    }
    return data;
  };

  const allData = useMemo(() => generateMockData(), []);
  
  const getDaysCount = (range: TimeRange) => {
    switch (range) {
      case '7days': return 7;
      case '30days': return 30;
      case '90days': return 90;
    }
  };

  const filteredData = allData.slice(-getDaysCount(selectedRange));

  const getDayStatus = (day: DayData): RoutineStatus => {
    if (!day.morning && !day.night) return 'skipped';
    if (day.morning && day.night) return 'completed';
    return 'partial';
  };

  const getStatusColor = (status: RoutineStatus) => {
    switch (status) {
      case 'completed': return STATUS_COLORS.success;
      case 'partial': return STATUS_COLORS.warning;
      case 'skipped': return STATUS_COLORS.danger;
      case 'nodata': return colors.border;
    }
  };

  const completedDays = filteredData.filter(d => getDayStatus(d) === 'completed').length;
  const completionRate = Math.round((completedDays / filteredData.length) * 100);
  const breakoutReduction = Math.max(15, Math.min(45, completionRate / 2 + Math.random() * 10));

  const getFilteredDays = () => {
    switch (selectedFilter) {
      case 'morning': return filteredData.filter(d => d.morning);
      case 'night': return filteredData.filter(d => d.night);
      case 'missed': return filteredData.filter(d => getDayStatus(d) === 'skipped');
      default: return filteredData;
    }
  };

  const displayData = selectedFilter === 'all' ? filteredData : getFilteredDays();

  const createCalendarGrid = () => {
    const grid: (DayData | null)[] = [];
    const firstDay = new Date(filteredData[0].date);
    const dayOfWeek = firstDay.getDay(); // 0 = Sunday
    
    for (let i = 0; i < dayOfWeek; i++) {
      grid.push(null);
    }
    grid.push(...filteredData);
    return grid;
  };

  const calendarGrid = createCalendarGrid();
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: '7days', label: '7 Days' },
    { value: '30days', label: '30 Days' },
    { value: '90days', label: '90 Days' },
  ];

  const filters: { value: FilterType; label: string; emoji: string }[] = [
    { value: 'all', label: 'All', emoji: '📅' },
    { value: 'morning', label: 'Morning', emoji: '🌅' },
    { value: 'night', label: 'Night', emoji: '🌙' },
    { value: 'missed', label: 'Missed', emoji: '⚠️' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <View style={styles.backCircle}>
            <ChevronLeft size={24} color={colors.primary} />
            </View>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Routine History</Text>
        </View>
        <View style={{ width: 44 }} /> 
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Time Range Selector (Tags) */}
        <Animated.View entering={FadeInDown.delay(100)}>
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagContainer}
            >
                {timeRanges.map((range) => {
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
        </Animated.View>
        
        <View style={{ height: 24 }} />

        {/* Hero Insight Card */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.heroCard}>
          <LinearGradient
            colors={isDarkMode ? ['#6D28D9', '#4C1D95'] : ['#8B5CF6', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradientOverlay}
          />
          <View style={styles.heroContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <View style={styles.heroIconContainer}>
                    <Sparkles color="#FFF" size={28} />
                </View>
                <View>
                    <Text style={styles.heroTitle}>Impact Analysis</Text>
                    <Text style={styles.heroStatLabel}>AI Insights</Text>
                </View>
            </View>
            
            <Text style={styles.heroMainText}>
                Breakouts were <Text style={{ fontWeight: '900', color: '#FFF' }}>{breakoutReduction.toFixed(0)}% less frequent</Text> on days with full routine completion.
            </Text>
            
            <View style={styles.miniInsight}>
                <Text style={styles.miniInsightText}>
                    💡 Missed night routines correlate with higher acne counts.
                </Text>
            </View>
          </View>
        </Animated.View>

        {/* Filters */}
        <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBox}>
                <Filter size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Filter View</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagContainer}>
            {filters.map((filter) => {
                const isActive = selectedFilter === filter.value;
                return (
                <TouchableOpacity
                    key={filter.value}
                    onPress={() => setSelectedFilter(filter.value)}
                    style={[
                        styles.tag,
                        isActive ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.border }
                    ]}
                >
                    <Text style={{ marginRight: 6, fontSize: 14 }}>{filter.emoji}</Text>
                    <Text style={[
                        styles.tagText,
                         isActive ? { color: '#FFF' } : { color: colors.subtext }
                    ]}>
                        {filter.label}
                    </Text>
                </TouchableOpacity>
                );
            })}
        </ScrollView>

        <View style={{ height: 24 }} />

        {/* Calendar Grid */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.card}>
            <View style={styles.cardPressable}>
                <View style={styles.cardHeader}>
                    <View style={[styles.cardIconCircle, { width: 40, height: 40, backgroundColor: colors.primary + '15' }]}>
                        <Calendar size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.cardName, { marginBottom: 0 }]}>Routine Calendar</Text>
                </View>

                {/* Week Headers */}
                {selectedFilter === 'all' && (
                    <View style={styles.gridHeader}>
                    {weekDays.map((day, i) => (
                        <Text key={i} style={styles.weekDayText}>{day}</Text>
                    ))}
                    </View>
                )}

                {/* The Grid */}
                <View style={styles.grid}>
                    {(selectedFilter === 'all' ? calendarGrid : displayData).map((day, index) => {
                    if (!day && selectedFilter === 'all') {
                        return <View key={`empty-${index}`} style={{ width: CELL_SIZE, height: CELL_SIZE }} />;
                    }
                    if (!day) return null;

                    const status = getDayStatus(day);
                    const dateObj = new Date(day.date);
                    const dayNum = dateObj.getDate();

                    return (
                        <TouchableOpacity
                        key={day.date}
                        onPress={() => setSelectedDay(day)}
                        style={[
                            styles.dayCell,
                            { backgroundColor: getStatusColor(status) }
                        ]}
                        >
                        <Text style={styles.dayNum}>{dayNum}</Text>
                        {day.aiNote && <View style={[styles.aiDot, { borderColor: colors.card }]} />}
                        </TouchableOpacity>
                    );
                    })}
                </View>
            </View>
        </Animated.View>

        {/* Summary Stats */}
        <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBox}>
                <Activity size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Summary Statistics</Text>
        </View>

        <Animated.View entering={FadeInDown.delay(500)} style={{ flexDirection: 'row', gap: 12 }}>
          <StatCard 
            icon={<CheckCircle2 color={STATUS_COLORS.success} size={20} />}
            label="Completed" 
            value={completedDays.toString()} 
            // Using direct hexes for background accents to be safe
            bgColor="#ECFDF5" 
            textColor={STATUS_COLORS.success}
            styles={styles}
          />
          <StatCard 
            icon={<Activity color={colors.primary} size={20} />}
            label="Rate" 
            value={`${completionRate}%`} 
            bgColor="#EEF2FF"
            textColor={colors.primary}
            styles={styles}
          />
          <StatCard 
            icon={<Zap color={STATUS_COLORS.warning} size={20} />}
            label="Streak" 
            value={`${Math.floor(Math.random() * 8) + 3}`} 
            bgColor="#FFFBEB"
            textColor={STATUS_COLORS.warning}
            styles={styles}
          />
        </Animated.View>
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={!!selectedDay}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedDay(null)}
      >
        {selectedDay && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              activeOpacity={1} 
              onPress={() => setSelectedDay(null)} 
            />
            
            <Animated.View entering={ZoomIn.duration(250)} exiting={ZoomOut.duration(200)} style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>
                  {getDayStatus(selectedDay) === 'completed' ? '🎉' : 
                   getDayStatus(selectedDay) === 'partial' ? '⚡' : '💭'}
                </Text>
                <Text style={styles.modalTitle}>
                  {new Date(selectedDay.date).toLocaleDateString('en-US', { 
                    weekday: 'long', month: 'long', day: 'numeric' 
                  })}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {getDayStatus(selectedDay).replace('nodata', 'no data')} routine
                </Text>
              </View>

              <View style={{ gap: 12, marginBottom: 24 }}>
                <RoutineStatusRow 
                  label="Morning Routine" 
                  icon="🌅" 
                  completed={selectedDay.morning} 
                  color={STATUS_COLORS.success}
                  colors={colors}
                  styles={styles}
                />
                <RoutineStatusRow 
                  label="Night Routine" 
                  icon="🌙" 
                  completed={selectedDay.night} 
                  color={colors.primary}
                  colors={colors}
                  styles={styles}
                />
              </View>

              {selectedDay.aiNote && (
                <View style={styles.aiNoteBox}>
                   <View style={[styles.cardIconCircle, { width: 32, height: 32, backgroundColor: colors.primary + '20', marginBottom: 8 }]}>
                        <Sparkles size={16} color={colors.primary} />
                   </View>
                   <Text style={styles.aiNoteText}>{selectedDay.aiNote}</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={() => setSelectedDay(null)}
                style={styles.closeButton}
              >
                 <Text style={styles.closeButtonText}>Close View</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}


const StatCard = ({ icon, label, value, bgColor, textColor, styles }: any) => (
  <View style={[styles.card, { flex: 1, padding: 16, marginBottom: 0 }]}>
    <View style={[styles.cardIconCircle, { width: 38, height: 38, marginBottom: 12, backgroundColor: bgColor }]}>
        {icon}
    </View>
    <Text style={[styles.heroStatNumber, { color: styles.container.backgroundColor === '#0f172a' ? '#fff' : '#1e293b', fontSize: 28 }]}>
        {value}
    </Text>
    <Text style={[styles.cardName, { fontSize: 13, marginBottom: 0 }]}>{label}</Text>
  </View>
);

const RoutineStatusRow = ({ label, icon, completed, color, colors, styles }: any) => {
  return (
    <View style={[styles.statusRow, { backgroundColor: completed ? color + '15' : colors.surface }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 24 }}>{icon}</Text>
        <Text style={styles.statusLabel}>{label}</Text>
      </View>
      {completed ? (
        <CheckCircle2 color={color} size={24} />
      ) : (
        <XCircle color={colors.subtext} size={24} />
      )}
    </View>
  );
};

const getStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
  },
  backButton: { padding: 4 },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '15', // Opacity on primary
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: { alignItems: 'center' },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: colors.text,
    marginBottom: 2,
  },
  
  scrollContent: { padding: 20, paddingBottom: 60 },

  // Tags/Chips
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

  // Hero Card
  heroCard: {
    borderRadius: 28,
    marginBottom: 32,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
    backgroundColor: colors.primary, 
  },
  heroGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: { padding: 28 },
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
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroMainText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
    marginBottom: 20,
  },
  miniInsight: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    borderRadius: 12,
  },
  miniInsightText: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600',
  },
  heroStatNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 4,
  },

  // Sections
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

  // Cards (General)
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
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
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
  },
  cardName: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: colors.text, 
  },

  // Grid
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekDayText: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CELL_GAP,
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayNum: {
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
  },
  aiDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 32,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: { alignItems: 'center', marginBottom: 8 },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    color: colors.subtext,
    textTransform: 'uppercase',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
  },
  statusLabel: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 16,
  },
  aiNoteBox: {
    backgroundColor: colors.primary + '10',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  aiNoteText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  closeButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
  },
});