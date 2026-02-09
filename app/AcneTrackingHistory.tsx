import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from "expo-router";
import { getAuth } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc
} from 'firebase/firestore';
import {
  Check,
  ChevronLeft,
  Lock,
  Save,
  Sparkles
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../FirebaseConfig';
import { useTheme } from './theme/ThemeContext';

import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming
} from 'react-native-reanimated';

const AnimatedText = Animated.createAnimatedComponent(Text);

export default function AcneTrackingScreen() {
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [scans, setScans] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // useEffect(() => {
  //   fetchScans();
  // }, []);

  useFocusEffect(
    useCallback(() => {
      fetchScans();
    }, [])
  );

  const fetchScans = async () => {
    try {
      setIsLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const scansRef = collection(db, `users/${user.uid}/acneScans`);
      const q = query(scansRef, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);

      const fetchedScans = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Local UI state for selection
        severity: doc.data().severity || 'mild',
        isSelected: doc.data().status === 'active',
        formattedDate: doc.data().timestamp?.toDate().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      }));

      setScans(fetchedScans);
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  const toggleScanSelection = (id: string) => {
    setScans(prev => prev.map(scan => 
      scan.id === id ? { ...scan, isSelected: !scan.isSelected } : scan
    ));
    setHasChanges(true);
  };

  const calculateTotalActiveCount = () => {
    return scans
      .filter(scan => scan.isSelected)
      .reduce((total, scan) => {
        const scanSum = scan.detectedAcne?.reduce((sum: number, item: any) => sum + (item.count || 0), 0) || 0;
        return total + scanSum;
      }, 0);
  };

  const activeCount = scans
    .filter(scan => scan.isSelected)
    .reduce((total, scan) => {
      const scanSum = scan.detectedAcne?.reduce((sum: number, item: any) => sum + (item.count || 0), 0) || 0;
      return total + scanSum;
    }, 0);

  const animatedCount = useDerivedValue(() => {
    return withTiming(activeCount, { duration: 500 });
  });

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      animatedCount.value,
      [0, 10, 20, 50],
      ['#10B981', '#F59E0B', '#EF4444', '#7C2D12']
    );

    return { backgroundColor };
  });

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'severe': return '#EF4444';
      case 'moderate': return '#F59E0B';
      case 'mild': return '#10B981';
      default: return colors.subtext;
    }
  };

  const handleSaveActiveCount = async () => {
    try {
      setIsSaving(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const activeAcneCount = calculateTotalActiveCount();
      const userRef = doc(db, "users", user.uid);

      // Save the aggregated count
      await updateDoc(userRef, {
        activeAcneCount: activeAcneCount,
        // lastTrackingUpdate: new Date(),
      });

      // Update individual scan statuses in the subcollection to match selection
      for (const scan of scans) {
        const scanRef = doc(db, `users/${user.uid}/acneScans`, scan.id);
        await updateDoc(scanRef, { status: scan.isSelected ? 'active' : 'cleared' });
      }

      setHasChanges(false);
      Alert.alert('Success', `Active acne count updated to ${activeAcneCount}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to save active count');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={[styles.header]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <View style={styles.backCircle}>
            <ChevronLeft size={24} color={colors.primary} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerTitleWrapper}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Acne Tracking</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/AcneCamera")} style={styles.scanBadge}>
                  <Text style={styles.scanText}>+ Scan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Aggregated Summary Card */}
        <Animated.View style={[styles.summaryCard, animatedStyle]}>
          <View style={styles.summaryHeader}>
            <Sparkles size={20} color="#FFF" />
            <Text style={styles.summaryLabel}>Total Active Acne Count</Text>
          </View>
          <Text style={styles.hugeCount}>{activeCount}</Text>
          <Text style={styles.summarySubtext}>
             {activeCount < 10
                ? 'Low'
                : activeCount < 20
                ? 'Noticeable'
                : activeCount < 50
                ? 'High'
                : 'Critical'}
          </Text>
        </Animated.View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Past Scans</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.subtext }]}>Tap to select • Hold to edit details</Text>
        </View>

        {/* Scan List */}
        <View style={styles.listContainer}>
          {scans.map((scan) => {
            const scanTotal = scan.detectedAcne?.reduce((sum: number, item: any) => sum + (item.count || 0), 0) || 0;
            
            return (
              <TouchableOpacity 
                key={scan.id} 
                onPress={() => toggleScanSelection(scan.id)}


                onLongPress={() => router.push({
                pathname: "/AcneTracking", 
                params: { scanId: scan.id }
              })}

                activeOpacity={0.7}
                style={[
                  styles.scanItem, 
                  { 
                    backgroundColor: colors.card, 
                    borderColor: scan.isSelected ? colors.primary : colors.border,
                    borderWidth: scan.isSelected ? 2 : 1 
                  }
                ]}
              >
                <View style={styles.scanInfo}>
                  <View style={styles.dateRow}>
                    <Text style={[styles.scanDate, { color: colors.text }]}>{scan.formattedDate}</Text>
                    {/* Severity Badge */}
                    <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(scan.severity) + '15' }]}>
                        <Text style={[styles.severityBadgeText, { color: getSeverityColor(scan.severity) }]}>
                            {scan.severity?.toUpperCase()}
                        </Text>
                    </View>
                  </View>                  
                  <Text style={[styles.scanRegion, { color: colors.subtext }]}>{scan.region || 'Full Face'}</Text>
                  
                  <View style={styles.typeBadges}>
                    {scan.detectedAcne?.filter((a: any) => a.count > 0).map((item: any, i: number) => (
                      <View key={i} style={[styles.miniBadge, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.miniBadgeText, { color: colors.subtext }]}>
                          {item.type}: {item.count}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.scanRight}>
                  <Text style={[styles.scanTotal, { color: colors.text }]}>{scanTotal}</Text>
                    
                    <View style={styles.editHint}>
                      <Text style={styles.editHintText}>Hold to edit</Text>
                    </View>

                  <View style={[
                    styles.checkbox, 
                    { 
                      borderColor: scan.isSelected ? colors.primary : colors.border, 
                      backgroundColor: scan.isSelected ? colors.primary : 'transparent' 
                    }
                  ]}>
                    {scan.isSelected && <Check size={14} color="#FFF" strokeWidth={3} />}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.privacyNote}>
          <Lock size={14} color={colors.subtext} />
          <Text style={[styles.privacyText, { color: colors.subtext }]}>
            Scans represent data at the time of capture. Toggle to update current status.
          </Text>
        </View>
      </ScrollView>

      {/* Floating Save Button */}
      {hasChanges && (
        <View style={styles.saveContainer}>
          <TouchableOpacity 
            style={[styles.saveBtn, { backgroundColor: colors.primary }]} 
            onPress={handleSaveActiveCount}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Save size={20} color="#FFF" />
                <Text style={styles.saveBtnText}>Update Global Status</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    backgroundColor: colors.background,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16, 
    // borderBottomWidth: 1,
  },
  headerTitleWrapper: { 
  position: 'absolute', 
  left: 0, 
  right: 0, 
  alignItems: 'center', 
  pointerEvents: 'none', 
},
  headerTitle: { fontSize: 18, fontWeight: '800'},
  iconBtn: { padding: 4 },
  scanBadge: { 
    flexDirection: 'row', 
    backgroundColor: '#6366F1', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20, 
    alignItems: 'center', 
    gap: 4 
  },
  scanText: {
    fontSize: 16,
    color: '#FFFFFF', 
    fontWeight: '700',
  },
  scrollContent: { padding: 20, paddingBottom: 100 },
  
  summaryCard: { 
    padding: 24, 
    borderRadius: 24, 
    alignItems: 'center', 
    marginBottom: 30,
    elevation: 4,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '700' },
  hugeCount: { color: '#FFF', fontSize: 56, fontWeight: '900' },
  summarySubtext: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },

  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13 },

  listContainer: { gap: 12 },
  scanItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 16, 
    borderRadius: 20, 
    borderWidth: 1 
  },
  scanInfo: { flex: 1 },
  scanDate: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  scanRegion: { fontSize: 13, marginBottom: 8 },
  typeBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  miniBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  miniBadgeText: { fontSize: 10, fontWeight: '600' },
  
  scanRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  scanTotal: { fontSize: 24, fontWeight: '800' },
  checkbox: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    borderWidth: 2, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginTop: 10
  },

  privacyNote: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginTop: 30, 
    paddingHorizontal: 10 
  },
  privacyText: { fontSize: 11, fontStyle: 'italic', flex: 1 },

  saveContainer: { position: 'absolute', bottom: 30, left: 20, right: 20 },
  saveBtn: { 
    height: 60, 
    borderRadius: 20, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    backText: {
    fontSize: 16,
    color: '#FFF', 
    fontWeight: '500',
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  severityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  severityBadgeText: { fontSize: 10, fontWeight: '800' },

  editHint: {
  marginTop: 4,
},

editHintText: {
  fontSize: 10,
  color: '#9CA3AF',
  fontStyle: 'italic',
  textAlign: 'right',
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