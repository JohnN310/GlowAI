import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Animated,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../app/theme/ThemeContext';

type SkinIssue = 'redness' | 'stinging' | 'breakouts' | 'dryness' | 'none';
type BarrierHealth = number; // 0-100

interface ActionCard {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  action: () => void;
}

const BarrierMeter = ({ health }: { health: BarrierHealth }) => {
  const { colors, isDarkMode } = useTheme();
    const styles = getStyles(colors, isDarkMode);
  const getColor = () => {
    if (health >= 70) return '#34D399';
    if (health >= 40) return '#FBBF24';
    return '#F87171';
  };

  const getStatus = () => {
    if (health >= 70) return { text: 'Healthy', emoji: '✨' };
    if (health >= 40) return { text: 'Weakened', emoji: '⚠️' };
    return { text: 'Compromised', emoji: '🚨' };
  };

  const status = getStatus();
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: health,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [health]);

  const width = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.barrierMeter}>
      <View style={styles.meterHeader}>
        <Text style={[styles.meterTitle, { color: isDarkMode ? '#FFFFFF' : '#111827' }]}>
          Skin Barrier Health
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getColor() + '20' }]}>
          <Text style={styles.statusEmoji}>{status.emoji}</Text>
          <Text style={[styles.statusText, { color: getColor() }]}>
            {status.text}
          </Text>
        </View>
      </View>

      <View style={styles.meterContainer}>
        <View style={[styles.meterTrack, { backgroundColor: isDarkMode ? '#4B5563' : '#E5E7EB' }]}>
          <Animated.View
            style={[
              styles.meterFill,
              {
                width,
                backgroundColor: getColor(),
              },
            ]}
          />
        </View>
        <Text style={[styles.meterValue, { color: isDarkMode ? '#FFFFFF' : '#111827' }]}>
          {health}%
        </Text>
      </View>
    </View>
  );
};

const QuestionCard = ({
  question,
  options,
  selected,
  onSelect,
}: {
  question: string;
  options: { value: SkinIssue; label: string; emoji: string }[];
  selected: SkinIssue | null;
  onSelect: (value: SkinIssue) => void;
}) => {
  const { colors, isDarkMode } = useTheme();
    const styles = getStyles(colors, isDarkMode);
  return (
    <View style={[styles.questionCard, { backgroundColor: isDarkMode ? '#374151' : '#FFFFFF' }]}>
      <Text style={[styles.questionText, { color: isDarkMode ? '#FFFFFF' : '#111827' }]}>
        {question}
      </Text>
      <View style={styles.optionsGrid}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              {
                backgroundColor: isDarkMode ? '#4B5563' : '#F3F4F6',
                borderColor: selected === option.value ? '#5D9CEC' : 'transparent',
              },
              selected === option.value && styles.optionButtonSelected,
            ]}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.7}
          >
            <Text style={styles.optionEmoji}>{option.emoji}</Text>
            <Text style={[styles.optionLabel, { color: isDarkMode ? '#FFFFFF' : '#111827' }]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const ActionCardComponent = ({ card }: { card: ActionCard }) => {
  const { colors, isDarkMode } = useTheme();
    const styles = getStyles(colors, isDarkMode);
  return (
    <TouchableOpacity
      style={[styles.actionCard, { backgroundColor: isDarkMode ? '#374151' : '#FFFFFF' }]}
      onPress={card.action}
      activeOpacity={0.8}
    >
      <View style={[styles.actionIconCircle, { backgroundColor: card.color + '20' }]}>
        <Text style={styles.actionEmoji}>{card.emoji}</Text>
      </View>
      <View style={styles.actionContent}>
        <Text style={[styles.actionTitle, { color: isDarkMode ? '#FFFFFF' : '#111827' }]}>
          {card.title}
        </Text>
        <Text style={[styles.actionDescription, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
          {card.description}
        </Text>
      </View>
      <View style={styles.actionArrow}>
        <Text style={[styles.arrowText, { color: card.color }]}>→</Text>
      </View>
    </TouchableOpacity>
  );
};

interface Recommendation {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  details: string; 
}

const getRecommendations = (redness: string | null, stinging: string | null, breakouts: string | null): Recommendation[] => {
  const suggestions: Recommendation[] = [];

  if (stinging === 'stinging') {
    suggestions.push({
      id: 'cool-rinse',
      title: 'Cool Water Rinse',
      description: 'Calm the heat sensation immediately.',
      emoji: '💧',
      color: '#60A5FA',
      details: 'Splash your face with cool (not ice-cold) water for 30 seconds. This helps constrict dilated blood vessels and instantly numbs the stinging sensation. Pat dry gently with a clean microfiber towel—do not rub.'
    });
    
    suggestions.push({
      id: 'skip-actives',
      title: 'Stop Actives',
      description: 'Prevent further chemical damage.',
      emoji: '🚫',
      color: '#EF4444',
      details: 'Immediately stop using Retinol, Vitamin C, AHAs (Glycolic Acid), and BHAs (Salicylic Acid). Your barrier is currently "open," and these ingredients will cause deeper irritation until the skin heals (usually 3-5 days).'
    });
  }

  if (redness === 'redness') {
    suggestions.push({
      id: 'soothe-red',
      title: 'Occlusive Layer',
      description: 'Seal in moisture to reduce redness.',
      emoji: '🛡️',
      color: '#10B981',
      details: 'Apply a thin layer of a petrolatum-based ointment (like Aquaphor or CeraVe Healing Ointment) over your moisturizer. This creates a "second skin" that prevents Transepidermal Water Loss (TEWL), which is the primary cause of inflammation-related redness.'
    });
  }

  if (breakouts === 'breakouts') {
    suggestions.push({
      id: 'pimple-patch',
      title: 'Hydrocolloid Patch',
      description: 'Protect active spots from bacteria.',
      emoji: '🩹',
      color: '#8B5CF6',
      details: 'Apply a hydrocolloid patch to active breakouts. This prevents you from touching/picking at the skin (which further damages the barrier) and sucks out impurities without using harsh, drying acne medications.'
    });
  }

  return suggestions;
};

export default function SkinCheckScreen() {

  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);

  const [redness, setRedness] = useState<SkinIssue | null>(null);
  const [stinging, setStinging] = useState<SkinIssue | null>(null);
  const [breakouts, setBreakouts] = useState<SkinIssue | null>(null);
  const [barrierHealth, setBarrierHealth] = useState<BarrierHealth>(65);

    const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

    React.useEffect(() => {
    let health = 100;
    if (redness === 'redness') health -= 15;
    if (stinging === 'stinging') health -= 25; 
    if (breakouts === 'breakouts') health -= 10;
    
    setBarrierHealth(Math.max(50, health));
  }, [redness, stinging, breakouts]);


  const dynamicActions = getRecommendations(redness, stinging, breakouts);
  const showActions = redness !== null && stinging !== null && breakouts !== null;

  const handleOpenRec = (rec: Recommendation) => {
    setSelectedRec(rec);
    setModalVisible(true);
  };

return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backCircle}>
            <ChevronLeft size={24} color={colors.primary} />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Skin Check</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <LinearGradient
            colors={['#DBEAFE', '#BFDBFE', '#93C5FD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBannerGradient}
          >
            <Text style={styles.heroBannerEmoji}>🔍</Text>
            <Text style={styles.heroBannerTitle}>Quick Skin Assessment</Text>
            <Text style={styles.heroBannerSubtitle}>
              Answer a few questions to get personalized guidance
            </Text>
          </LinearGradient>
        </View>

        {/* Questions */}
        <QuestionCard
          question="Are you experiencing redness?"
          options={[
            { value: 'redness', label: 'Yes, noticeable', emoji: '🔴' },
            { value: 'none', label: 'No, looks normal', emoji: '✅' },
          ]}
          selected={redness}
          onSelect={setRedness}
        />

        <QuestionCard
          question="Any stinging or burning sensation?"
          options={[
            { value: 'stinging', label: 'Yes, it stings', emoji: '🔥' },
            { value: 'none', label: 'No discomfort', emoji: '😊' },
          ]}
          selected={stinging}
          onSelect={setStinging}
        />

        <QuestionCard
          question="New breakouts or irritation?"
          options={[
            { value: 'breakouts', label: 'Yes, breaking out', emoji: '😣' },
            { value: 'none', label: 'Skin is clear', emoji: '✨' },
          ]}
          selected={breakouts}
          onSelect={setBreakouts}
        />

        {/* Results Section */}
        {showActions && (
          <>
            <BarrierMeter health={barrierHealth} />

            <View style={styles.actionsSection}>
              {/* FLEXIBLE TITLE: Only shows if there are recommendations */}
              {dynamicActions.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>Immediate Recommendations</Text>
                  <View style={styles.actionsContainer}>
                    {dynamicActions.map((rec) => (
                      <TouchableOpacity
                        key={rec.id}
                        style={[styles.actionCard, { backgroundColor: isDarkMode ? '#374151' : '#FFFFFF' }]}
                        onPress={() => handleOpenRec(rec)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.actionIconCircle, { backgroundColor: rec.color + '20' }]}>
                          <Text style={styles.actionEmoji}>{rec.emoji}</Text>
                        </View>
                        <View style={styles.actionContent}>
                          <Text style={[styles.actionTitle, { color: isDarkMode ? '#FFFFFF' : '#111827' }]}>
                            {rec.title}
                          </Text>
                          <Text style={[styles.actionDescription, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
                            {rec.description}
                          </Text>
                        </View>
                        <View style={styles.actionArrow}>
                          <Text style={[styles.arrowText, { color: rec.color }]}>→</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                /* SUCCESS MESSAGE: Shows if no issues were selected */
                <View style={styles.successContainer}>
                  <Text style={styles.successEmoji}>✨</Text>
                  <Text style={styles.successTitle}>Great Job!</Text>
                  <Text style={[styles.successText, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
                    Your skin barrier appears to be in excellent condition. Keep up your current routine!
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF' }]}>
            <Text style={styles.modalEmoji}>{selectedRec?.emoji}</Text>
            <Text style={styles.modalTitle}>{selectedRec?.title}</Text>
            <Text style={styles.modalDetails}>{selectedRec?.details}</Text>

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: selectedRec?.color || colors.primary }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#1F1F23' : '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: isDarkMode ? '#FFFFFF' : '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  heroBanner: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#5D9CEC',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroBannerGradient: {
    padding: 28,
    alignItems: 'center',
  },
  heroBannerEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  heroBannerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 8,
  },
  heroBannerSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E3A8A',
    textAlign: 'center',
  },
  questionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  questionText: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 3,
  },
  optionButtonSelected: {
    shadowColor: '#5D9CEC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  optionEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  barrierMeter: {
    backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  meterTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusEmoji: {
    fontSize: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
  },
  meterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  meterTrack: {
    flex: 1,
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 8,
  },
  meterValue: {
    fontSize: 20,
    fontWeight: '800',
    minWidth: 50,
    textAlign: 'right',
  },
  actionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: isDarkMode ? '#FFFFFF' : '#111827',
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
  actionsContainer: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionEmoji: {
    fontSize: 28,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  actionArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDarkMode ? '#4B5563' : '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 20,
    fontWeight: '600',
  },
  tipsCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  tipsEmoji: {
    fontSize: 28,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5D9CEC',
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalEmoji: {
    fontSize: 52,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: isDarkMode ? '#FFFFFF' : '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDetails: {
    fontSize: 15,
    lineHeight: 22,
    color: isDarkMode ? '#D1D5DB' : '#4B5563',
    textAlign: 'center',
    marginBottom: 28,
    fontWeight: '500',
  },
  closeButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: isDarkMode ? '#374151' : '#F0FDF4', 
    borderRadius: 24,
    marginTop: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#4B5563' : '#DCFCE7',
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: isDarkMode ? '#FFFFFF' : '#166534',
    marginBottom: 8,
  },
  successText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },

});
