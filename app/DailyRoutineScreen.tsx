import { LinearGradient } from 'expo-linear-gradient';
import {
    ArrowLeft,
    Calendar,
    CheckCircle2,
    Filter,
    XCircle
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Dimensions,
    Modal,
    ScrollView,
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

type TimeRange = '7days' | '30days' | '90days';
type RoutineStatus = 'completed' | 'partial' | 'skipped' | 'nodata';
type FilterType = 'all' | 'morning' | 'night' | 'missed';

interface DayData {
  date: string;
  morning: boolean;
  night: boolean;
  aiNote?: string;
}

interface DailyRoutineHistoryProps {
  onBack: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = 24;
const CELL_GAP = 8;
const CELL_SIZE = (SCREEN_WIDTH - (GRID_PADDING * 2) - (CELL_GAP * 6)) / 7;

export function DailyRoutineHistory({ onBack }: DailyRoutineHistoryProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('30days');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  // --- Mock Data Logic ---
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

  const allData = React.useMemo(() => generateMockData(), []);
  
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
      case 'completed': return '#34d399'; // emerald-400
      case 'partial': return '#fbbf24';   // amber-400
      case 'skipped': return '#fda4af';   // rose-300
      case 'nodata': return '#e5e7eb';    // gray-200
    }
  };

  // Stats
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

  // Create Grid
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
    <View style={styles.container}>
      <LinearGradient
        colors={['#faf5ff', '#fdf2f8', '#eff6ff']} // purple-50, pink-50, blue-50
        style={styles.background}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <ArrowLeft color="#9333ea" size={24} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Routine History</Text>
            <Text style={styles.headerSubtitle}>Track your skincare consistency</Text>
          </View>
        </Animated.View>

        {/* Insight Card */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.insightCard}>
          <LinearGradient
            colors={['#f3e8ff', '#f5d0fe']} // violet-100 to purple-100
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.insightContent}>
            <Text style={{ fontSize: 32, marginRight: 12 }}>✨</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Routine Impact Analysis</Text>
              <Text style={styles.cardText}>
                Breakouts were <Text style={{ color: '#9333ea', fontWeight: 'bold' }}>{breakoutReduction.toFixed(0)}% less frequent</Text> on days with full routine completion.
              </Text>
              <View style={styles.miniInsight}>
                <Text style={styles.miniInsightText}>
                  💡 Missed night routines correlate with higher acne counts.
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Controls */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.controlsContainer}>
          {/* Time Range */}
          <View style={{ marginBottom: 16 }}>
            <View style={styles.sectionLabel}>
              <Calendar color="#374151" size={20} />
              <Text style={styles.labelText}>Time Range</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {timeRanges.map((range) => (
                <TouchableOpacity
                  key={range.value}
                  onPress={() => setSelectedRange(range.value)}
                  style={[
                    styles.chip,
                    selectedRange === range.value ? styles.chipActive : styles.chipInactive
                  ]}
                >
                  <Text style={selectedRange === range.value ? styles.chipTextActive : styles.chipTextInactive}>
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Filters */}
          <View>
            <View style={styles.sectionLabel}>
              <Filter color="#374151" size={20} />
              <Text style={styles.labelText}>Filter View</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter.value}
                  onPress={() => setSelectedFilter(filter.value)}
                  style={[
                    styles.chip,
                    selectedFilter === filter.value ? styles.chipActive : styles.chipInactive
                  ]}
                >
                  <Text style={{ marginRight: 6 }}>{filter.emoji}</Text>
                  <Text style={selectedFilter === filter.value ? styles.chipTextActive : styles.chipTextInactive}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Animated.View>

        {/* Calendar Grid */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.calendarContainer}>
          <View style={styles.sectionLabel}>
            <Text style={{ fontSize: 24 }}>📆</Text>
            <Text style={[styles.labelText, { fontSize: 18 }]}>Routine Calendar</Text>
          </View>

          {/* Legend */}
          <View style={styles.legendContainer}>
            {[
              { color: '#34d399', label: 'Completed' },
              { color: '#fbbf24', label: 'Partial' },
              { color: '#fda4af', label: 'Skipped' },
              { color: '#e5e7eb', label: 'No Data' },
            ].map((item, i) => (
              <View key={i} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
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
              // Empty cells for layout alignment
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
                  {day.aiNote && <View style={styles.aiDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.statsContainer}>
          <StatCard 
            icon="✅" 
            label="Completed" 
            value={completedDays.toString()} 
            colors={['#d1fae5', '#ccfbf1']} 
          />
          <StatCard 
            icon="📊" 
            label="Rate" 
            value={`${completionRate}%`} 
            colors={['#dbeafe', '#e0e7ff']} 
          />
          <StatCard 
            icon="🔥" 
            label="Streak" 
            value={`${Math.floor(Math.random() * 8) + 3}`} 
            colors={['#f3e8ff', '#fce7f3']} 
          />
        </Animated.View>
        
        {/* Padding for bottom safety */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={!!selectedDay}
        transparent={true}
        animationType="none"
        onRequestClose={() => setSelectedDay(null)}
      >
        {selectedDay && (
          <View style={styles.modalOverlay}>
             {/* Backdrop click handler */}
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              activeOpacity={1} 
              onPress={() => setSelectedDay(null)} 
            />
            
            <Animated.View entering={ZoomIn.duration(250)} exiting={ZoomOut.duration(200)} style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>
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

              <View style={{ gap: 12, marginBottom: 20 }}>
                <RoutineStatusRow 
                  label="Morning Routine" 
                  icon="🌅" 
                  completed={selectedDay.morning} 
                  color="emerald"
                />
                <RoutineStatusRow 
                  label="Night Routine" 
                  icon="🌙" 
                  completed={selectedDay.night} 
                  color="indigo"
                />
              </View>

              {selectedDay.aiNote && (
                <View style={styles.aiNoteBox}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Text style={{ fontSize: 20 }}>🤖</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aiNoteTitle}>AI Insight</Text>
                      <Text style={styles.aiNoteText}>{selectedDay.aiNote}</Text>
                    </View>
                  </View>
                </View>
              )}

              <TouchableOpacity
                onPress={() => setSelectedDay(null)}
                style={styles.closeButton}
              >
                <LinearGradient
                  colors={['#a855f7', '#ec4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.closeButtonGradient}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </Modal>
    </View>
  );
}


const StatCard = ({ icon, label, value, colors }: any) => (
  <View style={styles.statCard}>
    <LinearGradient 
      colors={colors} 
      style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]} 
    />
    <Text style={{ fontSize: 28, marginBottom: 4 }}>{icon}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const RoutineStatusRow = ({ label, icon, completed, color }: any) => {
  const bg = completed 
    ? (color === 'emerald' ? '#d1fae5' : '#e0e7ff') 
    : '#f3f4f6';
  const iconColor = completed 
    ? (color === 'emerald' ? '#059669' : '#4f46e5') 
    : '#9ca3af';

  return (
    <View style={[styles.statusRow, { backgroundColor: bg }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 24 }}>{icon}</Text>
        <Text style={styles.statusLabel}>{label}</Text>
      </View>
      {completed ? (
        <CheckCircle2 color={iconColor} size={24} />
      ) : (
        <XCircle color={iconColor} size={24} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContent: {
    padding: GRID_PADDING,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  backButton: {
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9333ea', 
  },
  headerSubtitle: {
    color: '#4b5563',
    fontSize: 14,
  },
  insightCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  insightContent: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
  },
  cardText: {
    color: '#374151',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  miniInsight: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    padding: 12,
    borderRadius: 12,
  },
  miniInsightText: {
    fontSize: 12,
    color: '#374151',
  },
  controlsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  labelText: {
    fontWeight: '600',
    color: '#374151',
    fontSize: 14,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: '#a855f7', 
    borderColor: '#a855f7',
  },
  chipInactive: {
    backgroundColor: '#f3f4f6',
    borderColor: '#f3f4f6',
  },
  chipTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  chipTextInactive: {
    color: '#374151',
    fontWeight: '500',
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#4b5563',
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekDayText: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CELL_GAP,
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 8,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9333ea',
    borderWidth: 1,
    borderColor: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    color: '#374151',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: '#4b5563',
    textTransform: 'capitalize',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  statusLabel: {
    fontWeight: '600',
    color: '#111827',
    fontSize: 16,
  },
  aiNoteBox: {
    backgroundColor: '#fdf4ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  aiNoteTitle: {
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    fontSize: 14,
  },
  aiNoteText: {
    color: '#374151',
    fontSize: 14,
  },
  closeButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  closeButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});