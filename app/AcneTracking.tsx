import { router, useLocalSearchParams, useRouter } from "expo-router";
import { getAuth } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { Check, ChevronLeft, Flame, MapPin, Minus, Plus, Save, TrendingUp } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../FirebaseConfig';
import { useTheme } from '../app/theme/ThemeContext';

type AcneSeverity = 'mild' | 'moderate' | 'severe';

interface AcneScan {
  id: string;
  totalCount: number;
  severity: AcneSeverity;
  region: string;
  status: 'active' | 'cleared';
  timestamp: Date;
  detectedAcne: Array<{ type: string; count: number; confidence?: number }>;
  AIseverityScore?: number;
  notes: string;
}

export default function AcneTracking({
  onBack = () => {},
  onScanNew = () => { router.push("/AcneCamera") },
}) {
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors);
  const { scanId } = useLocalSearchParams<{ scanId?: string }>();

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [scanData, setScanData] = useState<AcneScan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [showConfidence, setShowConfidence] = useState(true);

  const [editableAcneTypes, setEditableAcneTypes] = useState<Array<{ type: string; count: number; confidence: number }>>([]);

  const [selectedSeverity, setSelectedSeverity] = useState<AcneSeverity>('mild');
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchLatestScan();
  }, [scanId]);

  const fetchLatestScan = async () => {
    try {
      setIsLoading(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setError('No user logged in');
        return;
      }

      let scanDocData;
      let docId;

      if (scanId) {
        const scanRef = doc(db, `users/${currentUser.uid}/acneScans`, scanId);
        const scanSnap = await getDoc(scanRef);

        if (scanSnap.exists()) {
          scanDocData = scanSnap.data();
          docId = scanSnap.id;
        }
      } else {
        const scansRef = collection(db, `users/${currentUser.uid}/acneScans`);
        const q = query(
          scansRef,
          where('status', '==', 'active'),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          scanDocData = querySnapshot.docs[0].data();
          docId = querySnapshot.docs[0].id;
        }
      }

      if (!scanDocData) {
        setScanData(null);
        setIsLoading(false);
        return;
      }

      const scan: AcneScan = {
        id: docId || '',
        totalCount: scanDocData.totalCount || 0,
        severity: scanDocData.severity || 'mild',
        region: scanDocData.region || 'Full Face',
        status: scanDocData.status || 'active',
        timestamp: scanDocData.timestamp?.toDate() || new Date(),
        detectedAcne: scanDocData.detectedAcne || [],
        AIseverityScore: scanDocData.severityScore || 0,
        notes: scanDocData.notes || '',
      };

      setScanData(scan);
      setSelectedSeverity(scan.severity);
      setTotalCount(scan.totalCount);
      setEditableAcneTypes(scanDocData.detectedAcne || []);
      setNotes(scan.notes);

      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setShowConfidence(userSnap.data().showConfidence ?? true);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching scan:', err);
      setError('Failed to load scan data');
      setIsLoading(false);
    }
  };

  const updateIndividualAcneCount = (index: number, delta: number) => {
    const newTypes = [...editableAcneTypes];
    const currentCount = newTypes[index].count || 0;
    const newCount = Math.max(0, currentCount + delta);

    newTypes[index] = { ...newTypes[index], count: newCount };
    setEditableAcneTypes(newTypes);

    const newTotal = newTypes.reduce((sum, item) => sum + item.count, 0);
    setTotalCount(newTotal);
  };

  const handleUpdateScan = async () => {
    if (!scanData) return;

    try {
      setIsUpdating(true);
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) return;

      const scanRef = doc(db, `users/${user.uid}/acneScans`, scanData.id);

      await updateDoc(scanRef, {
        severity: selectedSeverity,
        totalCount: totalCount,
        detectedAcne: editableAcneTypes,
        notes: notes,
        updatedAt: Timestamp.now(),
      });

      Alert.alert(
        'Success',
        'Skin status updated',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
      setIsUpdating(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to update status');
      setIsUpdating(false);
    }
  };

  const getSeverityColor = (severity: AcneSeverity): string => {
    switch (severity) {
      case 'mild': return '#10B981';
      case 'moderate': return '#F59E0B';
      case 'severe': return '#EF4444';
    }
  };

  const getSeverityBg = (severity: AcneSeverity): string => {
    switch (severity) {
      case 'mild': return '#D1FAE5';
      case 'moderate': return '#FEF3C7';
      case 'severe': return '#FEE2E2';
    }
  };

  const hasChanges = () => {
    if (!scanData) return false;
    const countChanged = totalCount !== scanData.totalCount;
    const severityChanged = selectedSeverity !== scanData.severity;
    const notesChanged = notes !== scanData.notes;
    const typesChanged = JSON.stringify(editableAcneTypes) !== JSON.stringify(scanData.detectedAcne);

    return countChanged || severityChanged || notesChanged || typesChanged;
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getAreaEmoji = (area: string): string => {
    const emojiMap: Record<string, string> = {
      "Forehead": '🧠',
      "Nose": '👃',
      "Left Cheek": '◀️',
      "Right Cheek": '▶️',
      "Chin": '🫦',
      "Full Face": '😊',
    };
    return emojiMap[area] || '📍';
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color="#FA9DA8" />
        <Text style={styles.loadingText}>Loading scan data...</Text>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Error Loading Data</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLatestScan}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  if (!scanData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backCircle}>
            <ChevronLeft size={24} color={colors.primary} />
          </View>
          </TouchableOpacity>
          <View style={styles.headerTitleWrapper}>
            <Text style={styles.headerTitle}>Acne Tracking</Text>
          </View>
          <View style={styles.backButton} />
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
          </View>
          <Text style={styles.emptyTitle}>No Scans Yet</Text>
          <Text style={styles.emptyText}>
            Get started by scanning your skin to track your acne progress over time.
          </Text>
          <TouchableOpacity style={styles.scanButton} onPress={onScanNew}>
            <Text style={styles.scanButtonText}>Scan Your Skin</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const normalizedScore = (scanData.totalCount);

  // Main screen
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

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
        <TouchableOpacity onPress={onScanNew} style={styles.scanNewButton}>
          <Text style={styles.scanNewText}>+ Scan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Analysis Card */}
        {/* <View style={styles.analysisCard}>
          <View style={styles.cardHeader}>
            <Sparkles size={20} color="#6366F1" />
            <Text style={styles.cardTitle}>AI Analysis</Text>
            <Text style={styles.dateText}>{formatDate(scanData.timestamp)}</Text>
          </View>
          <View style={styles.confidenceRow}>
            <View style={styles.confidenceBadge}>
              <Sparkles size={16} color="#6366F1" />
              <View style={styles.confidenceTextContainer}>
                <Text style={styles.confidenceLabel}>Severity Score</Text>
                <Text style={styles.confidenceValue}>{scanData.AIseverityScore}%</Text>
              </View>
            </View>
          </View>
        </View> */}

        {/* Risk Score Visual Card */}
        <View style={styles.riskCard}>
          <View style={styles.cardHeader}>
            <Flame size={20} color="#FF6B6B" />
            <Text style={styles.cardTitle}>Current Status</Text>
          </View>

          <View style={styles.riskContent}>
            <View style={styles.riskLeft}>
              <Text style={[styles.riskNumber, { color: getSeverityColor(scanData.severity) }]}>
                {scanData.totalCount}
              </Text>
              <Text style={styles.riskLabel}>Active Spots</Text>
              <View style={[styles.severityPill, { backgroundColor: getSeverityBg(scanData.severity) }]}>
                <View style={[styles.severityDot, { backgroundColor: getSeverityColor(scanData.severity) }]} />
                <Text style={[styles.severityPillText, { color: getSeverityColor(scanData.severity) }]}>
                  {scanData.severity.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Visual Meter */}
            <View style={styles.meterContainer}>
                {[50, 45, 40, 35, 30, 25, 20, 15, 10, 5].map((level) => (
                <View
                  key={level}
                  style={[
                    styles.meterBar,
                    {
                      backgroundColor: level <= normalizedScore 
                        ? getSeverityColor(scanData.severity)
                        : '#E5E7EB',
                      opacity: level <= normalizedScore ? 1 : 0.3
                    }
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Concern Region Card */}
        <View style={styles.regionCard}>
          <View style={styles.cardHeader}>
            <MapPin size={20} color="#8B5CF6" />
            <Text style={styles.cardTitle}>Concern Region</Text>
          </View>
          <View style={styles.regionChip}>
            <Text style={styles.regionEmoji}>{getAreaEmoji(scanData.region)}</Text>
            <Text style={styles.regionText}>{scanData.region}</Text>
          </View>
        </View>

        {/* Breakdown by Type Card */}
        <View style={styles.typesCard}>
          <View style={styles.cardHeader}>
            <TrendingUp size={20} color="#10B981" />
            <Text style={styles.cardTitle}>Breakdown by Type</Text>
          </View>
          {editableAcneTypes.map((item, index) => (
            <View key={index} style={styles.typeRow}>
              <View style={styles.typeInfo}>
                <Text style={styles.typeName}>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Text>
                {showConfidence && (
                  <Text style={styles.typeConfidence}>
                    {item.confidence}% confidence
                  </Text>
                )}
              </View>

              <View style={styles.typeCounter}>
                <TouchableOpacity
                  onPress={() => updateIndividualAcneCount(index, -1)}
                  style={styles.typeCounterBtn}
                >
                  <Minus size={14} color="#6366F1" strokeWidth={3} />
                </TouchableOpacity>

                <TextInput
                  style={styles.typeCountInput}
                  value={String(item.count)}
                  onChangeText={(text) => {
                    const numericValue = parseInt(text.replace(/[^0-9]/g, ''), 10);
                    const val = isNaN(numericValue) ? 0 : numericValue;

                    const newTypes = [...editableAcneTypes];
                    newTypes[index] = { ...newTypes[index], count: val };
                    setEditableAcneTypes(newTypes);

                    const newTotal = newTypes.reduce((sum, i) => sum + (i.count || 0), 0);
                    setTotalCount(newTotal);
                  }}
                  keyboardType="numeric"
                  maxLength={3}
                  returnKeyType="done"
                />

                <TouchableOpacity
                  onPress={() => updateIndividualAcneCount(index, 1)}
                  style={styles.typeCounterBtn}
                >
                  <Plus size={14} color="#6366F1" strokeWidth={3} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Update Section */}
        {/* <View style={styles.updateCard}>
          <Text style={styles.updateTitle}>Update Your Status</Text> */}

          {/* Severity Selector */}
          {/* <Text style={styles.inputLabel}>Severity Level</Text>
          <View style={styles.severitySelector}>
            {(['mild', 'moderate', 'severe'] as AcneSeverity[]).map((severity) => (
              <TouchableOpacity
                key={severity}
                style={[
                  styles.severityOption,
                  selectedSeverity === severity && [
                    styles.severityOptionActive,
                    { borderColor: getSeverityColor(severity), backgroundColor: getSeverityBg(severity) }
                  ],
                ]}
                onPress={() => setSelectedSeverity(severity)}
                activeOpacity={0.7}
              >
                {selectedSeverity === severity && (
                  <View style={[styles.severityCheck, { backgroundColor: getSeverityColor(severity) }]}>
                    <Check size={12} color="#FFF" strokeWidth={3} />
                  </View>
                )}
                <Text
                  style={[
                    styles.severityOptionText,
                    selectedSeverity === severity && { 
                      color: getSeverityColor(severity),
                      fontWeight: '700'
                    },
                  ]}
                >
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View> */}

          {/* Total Count Selector */}
          {/* <View style={styles.totalCountBanner}> 
             <View style={styles.totalCountLeft}>
              <Text style={styles.totalCountLabel}>Total Active Spots</Text>
              <Text style={styles.totalCountSubtext}>Auto-calculated from breakdown</Text>
            </View>
            <View style={[
              styles.totalCountBadge, 
              { backgroundColor: getSeverityBg(selectedSeverity) }
            ]}>
              <Text style={[
                styles.totalCountNumber, 
                { color: getSeverityColor(selectedSeverity) }
              ]}>
                {totalCount}
              </Text>
            </View> 
          </View> */}

          {/* Update Section */}
          <View style={styles.updateCard}>
            <Text style={styles.updateTitle}>Update Your Status</Text>

            {/* Severity Selector */}
            <Text style={styles.inputLabel}>Severity Level</Text>
            <View style={styles.severitySelector}>
              {(['mild', 'moderate', 'severe'] as AcneSeverity[]).map((severity) => (
                <TouchableOpacity
                  key={severity}
                  style={[
                    styles.severityOption,
                    selectedSeverity === severity && [
                      styles.severityOptionActive,
                      { borderColor: getSeverityColor(severity), backgroundColor: getSeverityBg(severity) }
                    ],
                  ]}
                  onPress={() => setSelectedSeverity(severity)}
                  activeOpacity={0.7}
                >
                  {selectedSeverity === severity && (
                    <View style={[styles.severityCheck, { backgroundColor: getSeverityColor(severity) }]}>
                      <Check size={12} color="#FFF" strokeWidth={3} />
                    </View>
                  )}
                  <Text style={[
                      styles.severityOptionText,
                      selectedSeverity === severity && { color: getSeverityColor(severity), fontWeight: '700' },
                    ]}
                  >
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Refined Total Count Section */}
            <View style={styles.totalCountRow}> 
                <View>
                  <Text style={styles.inputLabel}>Total Active Spots</Text>
                  <Text style={styles.totalCountSubtext}>Calculated from breakdown</Text>
                </View>
                <View style={[
                  styles.totalCountBadge, 
                  { backgroundColor: getSeverityBg(selectedSeverity) }
                ]}>
                  <Text style={[
                    styles.totalCountNumber, 
                    { color: getSeverityColor(selectedSeverity) }
                  ]}>
                    {totalCount}
                  </Text>
                </View> 
            </View>

            <View style={styles.divider} />

            {/* Notes Input */}
            <Text style={styles.inputLabel}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any observations..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

        {/* Save Button - Only shows when changes exist */}
        {hasChanges() && (
          <TouchableOpacity
            style={[styles.saveButton, isUpdating && styles.saveButtonDisabled]}
            onPress={handleUpdateScan}
            disabled={isUpdating}
            activeOpacity={0.8}
          >
            {isUpdating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Save size={20} color="#FFF" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
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
    marginTop: 16,
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
    // borderBottomWidth: 1,
    // borderBottomColor: colors.headerBorder,
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
  scanNewButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scanNewText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.errorTitle,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.retry,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onAccent,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.emptyIconBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  scanButton: {
    backgroundColor: colors.retry,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: colors.retry,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onAccent,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  // Card Base
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    color: colors.statLabel,
    fontWeight: '500',
  },

  // AI Analysis Card
  analysisCard: {
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
  confidenceRow: {
    flexDirection: 'row',
  },
  confidenceBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.badgeBorderColor,
  },
  confidenceTextContainer: {
    marginLeft: 8,
  },
  confidenceLabel: {
    fontSize: 10,
    color: colors.label,
    fontWeight: '600',
  },
  confidenceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },

  // Risk Score Card
  riskCard: {
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
  riskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  riskLeft: {
    flex: 1,
  },
  riskNumber: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
    marginBottom: 4,
  },
  riskLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 12,
  },
  severityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severityPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  meterContainer: {
    gap: 4,
    marginLeft: 16,
  },
  meterBar: {
    width: 64,
    height: 6,
    borderRadius: 3,
  },

  // Region Card
  regionCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  regionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.chipBaclground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    alignSelf: 'flex-start',
  },
  regionEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  regionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.regionTextColor,
  },

  // Types Card
  typesCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  typeInfo: {
    flex: 1,
  },
  typeName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  typeConfidence: {
    fontSize: 11,
    color: colors.statLabel,
    fontWeight: '500',
  },
  typeCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeCounterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bannerBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.badgeBorderColor,
  },
  typeCountInput: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    minWidth: 40,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.meterInactive,
  },

  // Update Card
  updateCard: {
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
  updateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  // inputLabel: {
  //   fontSize: 14,
  //   fontWeight: '600',
  //   color: colors.textSecondary,
  //   marginBottom: 10,
  // },

  // Severity Selector
  severitySelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  severityOption: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    backgroundColor: colors.background,
    alignItems: 'center',
    position: 'relative',
  },
  severityOptionActive: {
    borderWidth: 2,
  },
  severityCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  severityOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.subtext,
  },

  // Main Counter
  mainCounterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  mainCounterBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.label,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.label,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mainCounterDisplay: {
    minWidth: 90,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  mainCounterInput: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },

  // Notes Input
  // notesInput: {
  //   backgroundColor: colors.background,
  //   borderRadius: 12,
  //   padding: 14,
  //   minHeight: 100,
  //   borderWidth: 1,
  //   borderColor: colors.cardBorder,
  //   fontSize: 14,
  //   color: colors.textPrimary,
  //   textAlignVertical: 'top',
  // },

  // Save Button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.saveColor,
    padding: 20,
    borderRadius: 24,
    gap: 10,
    shadowColor: colors.saveColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onAccent,
  },

  totalCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginTop: 10,
  },

  totalCountSubtext: {
    fontSize: 12,
    color: colors.statLabel,
    marginTop: -4, 
  },

  totalCountBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12, 
    minWidth: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },

  totalCountNumber: {
    fontSize: 22,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 20,
    opacity: 0.5,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },

  notesInput: {
    backgroundColor: colors.backgroundAlt, 
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    fontSize: 15,
    color: colors.textPrimary,
  },

});
