import { useLocalSearchParams, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../FirebaseConfig';

import { useTheme } from '../app/theme/ThemeContext';

export type AcneType = 'papule' | 'pustule' | 'cyst' | 'comedone' | 'nodule';
export type AcneSeverity = 'mild' | 'moderate' | 'severe';

export interface AcneDetectionResult {
  photoUri: string;
  region: string | null;
  detectedAcne: {
    type: AcneType;
    count: number;
    confidence: number;
  }[];
  totalCount: number;
  severityScore: number;
  severity: AcneSeverity;
  healingEstimate: {
    days: number;
    description: string;
  };
  timestamp: string;
}

export default function AcneDetectionResults() {

  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);

  const params = useLocalSearchParams();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const [showConfidence, setShowConfidence] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // Fetch showConfidence
  useEffect(() => {
      fetchLatestScan();
    }, []);
  
    const fetchLatestScan = async () => {
      try {
        setIsLoading(true);
        const auth = getAuth();
        const currentUser = auth.currentUser;
  
        if (!currentUser) {
          setError('No user logged in');
          return;
        }  
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setShowConfidence(data.showConfidence ?? true);
          }
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching scan:', err);
        setError('Failed to load scan data');
        setIsLoading(false);
      }
    };



  // Initial Parse from AI Parameters
  const result: AcneDetectionResult | null = useMemo(() => {
    try {
      if (!params.resultData) return null;
      const aiResults = JSON.parse(params.resultData as string);
      // Return a combined object that includes the separate photo and region params
      return {
        ...aiResults,
        photoUri: (params.photoUri as string) || "",
        region: (params.region as string) || aiResults.region || "Full Face",
        timestamp: aiResults.timestamp || new Date().toLocaleTimeString([], { 
          hour: '2-digit', minute: '2-digit' 
        }),
      };
    } catch (e) {
      console.error("Error reconstructing result object:", e);
      return null;
    }
  }, [params.resultData, params.photoUri, params.region]); 

  const [editableSeverity, setEditableSeverity] = useState<AcneSeverity>('mild');
  const [editableCount, setEditableCount] = useState(0);
  const [editableAcneTypes, setEditableAcneTypes] = useState<any[]>([]);

  useEffect(() => {
    if (result) {
      setEditableSeverity(result.severity || 'mild');
      setEditableCount(result.totalCount || 0);
      setEditableAcneTypes(result.detectedAcne || []);
    }
  }, [result]);

  const handleSaveAndClose = async () => {
    const user = auth.currentUser;
    if (!user || isSaving) return;

    setIsSaving(true);
    try {
      await addDoc(collection(db, `users/${user.uid}/acneScans`), {
        totalCount: editableCount,
        severity: editableSeverity,
        severityScore: result?.severityScore || 0,
        region: params.region || result?.region || "Full Face",
        status: 'active',
        timestamp: serverTimestamp(),
        detectedAcne: editableAcneTypes,
      });
      Alert.alert('Success', 'Acne scan was saved successfully!');

      setTimeout(() => {
      }, 700);

    } catch (e) {
      console.error("Firestore Save Error:", e);
      Alert.alert("Error", "Could not save results.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle case where params might be missing
  if (!result) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 50 }}>No analysis data found.</Text>
      </SafeAreaView>
    );
  }


  const getAcneTypeLabel = (type: AcneType): string => {
    const labels: Record<AcneType, string> = {
      papule: 'Papule',
      pustule: 'Pustule',
      cyst: 'Cyst',
      comedone: 'Comedone',
      nodule: 'Nodule',
    };
    return labels[type] || 'Unknown';
  };

  const getAcneTypeDescription = (type: AcneType): string => {
    const descriptions: Record<AcneType, string> = {
      papule: 'Small, raised, red bumps',
      pustule: 'Inflamed bumps with pus',
      cyst: 'Deep, painful, pus-filled lumps',
      comedone: 'Blackheads or whiteheads',
      nodule: 'Large, hard bumps beneath skin',
    };
    return descriptions[type] || '';
  };

  const getAcneTypeIcon = (type: AcneType): string => {
    const icons: Record<AcneType, string> = {
      papule: '🔴',
      pustule: '⚪',
      cyst: '🔵',
      comedone: '⚫',
      nodule: '🟣',
    };
    return icons[type] || '❓';
  };

  const getSeverityColor = (severity: AcneSeverity): string => {
    switch (severity) {
      case 'mild': return '#10B981';
      case 'moderate': return '#F59E0B';
      case 'severe': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getSeverityLabel = (severity: AcneSeverity): string => {
    return severity.charAt(0).toUpperCase() + severity.slice(1);
  };

  const onClose = () => {
    router.replace("/Home");
  };

  const updateAcneTypeCount = (index: number, delta: number) => {
  const newTypes = [...editableAcneTypes];
  const newCount = Math.max(0, (newTypes[index].count || 0) + delta);
  newTypes[index] = { ...newTypes[index], count: newCount };
  
  setEditableAcneTypes(newTypes);

  const total = newTypes.reduce((sum, item) => sum + (item.count || 0), 0);
  setEditableCount(total);
  };


    // Loading state
    if (isLoading) {
      return (
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Loading scan data...</Text>
          </View>
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


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleWrapper}>        
        <Text style={styles.headerTitle}>Analysis Results</Text>
        </View>

        <View style={styles.closeButtonPlaceholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Photo Preview */}
        <View style={styles.photoContainer}>
          <Image source={{ uri: result.photoUri }} style={styles.photo} />
          {result.region && (
            <View style={styles.regionBadge}>
              <Text style={styles.regionBadgeText}>{result.region}</Text>
            </View>
          )}
        </View>

        {/* Summary Card */}
        <View style={[styles.summaryCard, { borderLeftColor: getSeverityColor(editableSeverity) }]}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Detection Summary</Text>
            <View style={styles.timestampContainer}>
              <Text style={styles.timestamp}>{result.timestamp}</Text>
            </View>
          </View>

          {/* Editable count */}
          <View style={styles.countRow}>
            <Text style={styles.countLabel}>Total Active Acne</Text>
            <View style={styles.editableCounter}>
                {/* <TouchableOpacity onPress={() => setEditableCount(Math.max(0, editableCount - 1))} style={styles.miniBtn}>
                    <Text style={styles.miniBtnText}>−</Text>
                </TouchableOpacity> */}

                <Text style={styles.countInput}>
                  {editableCount}
                </Text>

                {/* <TouchableOpacity onPress={() => setEditableCount(editableCount + 1)} style={styles.miniBtn}>
                    <Text style={styles.miniBtnText}>+</Text>
                </TouchableOpacity> */}
            </View>
          </View>

          {/* Editable severity */}
          <View style={styles.severityRow}>
            <Text style={styles.severityLabel}>Severity</Text>
            <View style={styles.severityPicker}>
                {(['mild', 'moderate', 'severe'] as AcneSeverity[]).map((s) => (
                    <TouchableOpacity 
                        key={s} 
                        onPress={() => setEditableSeverity(s)}
                        style={[
                            styles.sevOption, 
                            editableSeverity === s && { backgroundColor: getSeverityColor(s) }
                        ]}
                    >
                        <Text style={[styles.sevOptionText, editableSeverity === s && { color: '#FFF' }]}>
                            {s.charAt(0).toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>AI Severity Score</Text>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreNumber}>{result.severityScore}</Text>
              <Text style={styles.scoreOutOf}>/100</Text>
            </View>
          </View>
        </View>

        {/* Acne Type Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detected Acne Types</Text>
            {editableAcneTypes.map((acne: any, index: number) => (
              <View key={index} style={styles.acneTypeCard}>
                <View style={styles.acneTypeHeader}>
                  <View style={styles.acneTypeTitleRow}>
                    <Text style={styles.acneTypeIcon}>{getAcneTypeIcon(acne.type)}</Text>
                    <View style={styles.acneTypeTitleContainer}>
                      <Text style={styles.acneTypeLabel}>{getAcneTypeLabel(acne.type)}</Text>
                      <Text style={styles.acneTypeDescription}>
                        {getAcneTypeDescription(acne.type)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.editableCounter}>
                    <TouchableOpacity 
                      onPress={() => updateAcneTypeCount(index, -1)} 
                      style={styles.miniBtn}
                    >
                      <Text style={styles.miniBtnText}>−</Text>
                    </TouchableOpacity>

                    <TextInput
                      style={styles.typeCountInput}
                      value={String(acne.count)} 
                      onChangeText={(text) => {
                        const numericValue = parseInt(text.replace(/[^0-9]/g, ''), 10);
                        const val = isNaN(numericValue) ? 0 : numericValue;
                        
                        const newTypes = [...editableAcneTypes];
                        newTypes[index] = { ...newTypes[index], count: val };
                        setEditableAcneTypes(newTypes);
                        
                        const total = newTypes.reduce((sum, item) => sum + (item.count || 0), 0);
                        setEditableCount(total);
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />

                    <TouchableOpacity 
                      onPress={() => updateAcneTypeCount(index, 1)} 
                      style={styles.miniBtn}
                    >
                      <Text style={styles.miniBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confidence bar remains the same */}
                {showConfidence && (
                <>
                <View style={styles.confidenceBar}>
                  <View style={[styles.confidenceBarFill, { width: `${acne.confidence}%` }]} />
                </View>
                <Text style={styles.confidenceText}>{acne.confidence}% confidence</Text>
                </>
              )}
              
              </View>
            ))}
        </View>

        {/* Healing Estimate */}
        <View style={styles.healingCard}>
          <View style={styles.healingHeader}>
            <Text style={styles.healingIcon}>⏱️</Text>
            <Text style={styles.healingTitle}>Healing Estimate</Text>
          </View>
          <Text style={styles.healingDays}>{result.healingEstimate.days} days</Text>
          <Text style={styles.healingDescription}>{result.healingEstimate.description}</Text>
        </View>

        {/* Confirm & Save Button (Main Action) */}
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#3ac263ff', marginBottom: 12 }]} onPress={handleSaveAndClose}>
                    <Text style={styles.primaryButtonText}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push({ pathname: "/TreatmentRecommendations", params: { resultData: JSON.stringify(result) } })}>
          <Text style={styles.primaryButtonText}>View Treatment Recommendations</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push("/SafetyWarnings")}>
          <View style={styles.warningIconContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
          </View>
          <Text style={styles.secondaryButtonText}>Safety & What NOT to Do</Text>
        </TouchableOpacity>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            This analysis is AI-powered and meant for informational purposes. Consult a dermatologist for severe or persistent acne.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.background
    },
    headerTitleWrapper: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      pointerEvents: 'none',
    },
    closeButton: { padding: 4, width: 70 },
    closeButtonPlaceholder: { width: 70 },
    closeText: { fontSize: 16, color: colors.subtext, fontWeight: '500' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    content: { flex: 1 },
    contentContainer: { padding: 20, paddingBottom: 40 },
    // photoContainer: {
    //   borderRadius: 16,
    //   overflow: 'hidden',
    //   marginBottom: 20,
    //   position: 'relative',
    // },
    photo: { width: '100%', height: 300, backgroundColor: colors.surface },
    regionBadge: {
      position: 'absolute',
      top: 16,
      right: 16,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    regionBadgeText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
    // summaryCard: {
    //   backgroundColor: colors.card,
    //   borderRadius: 16,
    //   padding: 20,
    //   marginBottom: 20,
    //   borderLeftWidth: 4,
    //   elevation: 2,
    //   shadowColor: '#000',
    //   shadowOffset: { width: 0, height: 2 },
    //   shadowOpacity: 0.05,
    //   shadowRadius: 8,
    //   borderWidth: colors.isDarkMode ? 1 : 0,
    //   borderColor: colors.border,
    // },
    summaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    summaryTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    timestampContainer: {
      backgroundColor: colors.surface,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    timestamp: { fontSize: 11, color: colors.subtext, fontWeight: '500' },
    countRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    countLabel: { fontSize: 15, color: colors.subtext },
    countValue: { fontSize: 28, fontWeight: '700', color: colors.text },
    severityRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    severityLabel: { fontSize: 15, color: colors.subtext },
    severityBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    severityText: {
      fontSize: 14,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    scoreRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    scoreLabel: { fontSize: 15, color: colors.subtext },
    scoreContainer: { flexDirection: 'row', alignItems: 'baseline' },
    scoreNumber: { fontSize: 24, fontWeight: '700', color: colors.text },
    scoreOutOf: { fontSize: 14, color: colors.subtext },
    section: { marginBottom: 20 },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },
    acneTypeCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      borderWidth: colors.isDarkMode ? 1 : 0,
      borderColor: colors.border,
    },
    acneTypeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    acneTypeTitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      flex: 1,
      gap: 12,
    },
    acneTypeIcon: { fontSize: 24 },
    acneTypeTitleContainer: { flex: 1 },
    acneTypeLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    acneTypeDescription: { fontSize: 13, color: colors.subtext },
    acneTypeCount: {
      backgroundColor: colors.primary,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    acneTypeCountNumber: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
    confidenceBar: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 6,
    },
    confidenceBarFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 3,
    },
    confidenceText: { fontSize: 12, color: colors.subtext },
    // healingCard: {
    //   backgroundColor: colors.isDarkMode ? '#451a03' : '#FFFBEB',
    //   borderRadius: 12,
    //   padding: 20,
    //   marginBottom: 24,
    //   borderWidth: 1,
    //   borderColor: colors.isDarkMode ? '#92400e' : '#FDE68A',
    // },
    healingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    healingIcon: { fontSize: 24 },
    healingTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.isDarkMode ? '#fcd34d' : '#d5966fff',
    },
    // healingDays: {
    //   fontSize: 32,
    //   fontWeight: '700',
    //   color: colors.isDarkMode ? '#fbbf24' : '#78350F',
    //   marginBottom: 8,
    // },
    healingDescription: {
      fontSize: 14,
      color: colors.isDarkMode ? '#fbbf24' : '#d5966fff',
      lineHeight: 20,
    },
    // primaryButton: {
    //   backgroundColor: colors.primary,
    //   borderRadius: 12,
    //   padding: 18,
    //   alignItems: 'center',
    //   marginBottom: 12,
    // },
    // primaryButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
    secondaryButton: {
      backgroundColor: colors.isDarkMode ? '#450a0a' : '#FEF2F2',
      borderRadius: 20,
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.isDarkMode ? '#7f1d1d' : '#FEE2E2',
      marginBottom: 20,
    },
    secondaryButtonText: {
      fontSize: 19,
      fontWeight: '700',
      color: colors.isDarkMode ? '#f87171' : '#DC2626',
    },
    infoNote: {
      flexDirection: 'row',
      backgroundColor: colors.isDarkMode ? '#172554' : '#EFF6FF',
      borderRadius: 12,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.isDarkMode ? '#1e3a8a' : '#DBEAFE',
    },
    infoIcon: { fontSize: 20 },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: colors.isDarkMode ? '#bfdbfe' : '#1E40AF',
      lineHeight: 18,
    },
    editableCounter: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    miniBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    miniBtnText: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
    // severityPicker: { flexDirection: 'row', gap: 8 },
    // sevOption: {
    //   paddingHorizontal: 10,
    //   paddingVertical: 4,
    //   borderRadius: 6,
    //   backgroundColor: colors.surface,
    // },
    // sevOptionText: { fontSize: 12, fontWeight: '600', color: colors.subtext },
    // countInput: {
    //   fontSize: 24,
    //   fontWeight: '700',
    //   color: colors.text,
    //   textAlign: 'center',
    //   minWidth: 40,
    //   paddingHorizontal: 5,
    //   backgroundColor: colors.background,
    //   borderRadius: 8,
    //   borderWidth: 2,
    //   borderColor: colors.border,
    // },
    typeCountInput: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary,
      textAlign: 'center',
      minWidth: 30,
      backgroundColor: colors.surface,
      borderRadius: 6,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    loadingText: { marginTop: 16, fontSize: 16, color: colors.subtext },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
      backgroundColor: colors.background,
    },
    errorIcon: { fontSize: 64, marginBottom: 16 },
    errorTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#DC2626',
      marginBottom: 8,
    },
    errorText: {
      fontSize: 14,
      color: colors.subtext,
      textAlign: 'center',
      marginBottom: 24,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
    warningIconContainer: { marginRight: 4 },
    warningIcon: { fontSize: 20 },

    scrollContent: {
  padding: 20,
  paddingBottom: 20,
},

photoContainer: {
  borderRadius: 24,
  overflow: 'hidden',
  height: 220, 
  marginBottom: 16,
},

summaryCard: {
  backgroundColor: isDarkMode ? colors.card : '#FFFFFF',
  borderRadius: 28,
  padding: 24,
  marginBottom: 16,
  borderLeftWidth: 6,
},

countInput: {
  fontSize: 24,
  fontWeight: '900',
  color: colors.primary,
  textAlign: 'center',
  minWidth: 40,
},

severityPicker: {
  flexDirection: 'row',
  gap: 8,
  backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9',
  padding: 4,
  borderRadius: 14,
},

sevOption: {
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 10,
},

sevOptionText: {
  fontSize: 10,
  fontWeight: '900',
  color: colors.subtext,
},

healingCard: {
  marginBottom: 30,
  backgroundColor: isDarkMode ? '#271211ff' : '#FFFBEB',
  borderRadius: 24,
  padding: 24,
  borderWidth: 2,
  borderColor: isDarkMode ? '#92400e' : '#FDE68A',
},

healingDays: {
  fontSize: 42, 
  fontWeight: '900',
  color: isDarkMode ? '#fbbf24' : '#78350F',
},

primaryButton: {
  backgroundColor: "#6366F1",
  borderRadius: 24,
  padding: 18,
  alignItems: 'center',
  marginBottom: 12,
  width: '100%',
},

primaryButtonText: {

  fontSize: 19,
  fontWeight: '700',
  color: '#FFFFFF',
},

textActionBtn: {
  alignItems: 'center',
  paddingVertical: 8,
},

textActionText: {
  fontSize: 14,
  fontWeight: '800',
  color: '#EF4444',
},
  });

