import { GoogleGenerativeAI } from "@google/generative-ai";
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';

import { LinearGradient } from 'expo-linear-gradient';

import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { auth, db } from '../FirebaseConfig';

import { ChevronLeft } from "lucide-react-native";
import { useTheme } from '../app/theme/ThemeContext';

// Initialize Gemini
const GEN_AI_KEY = process.env.EXPO_PUBLIC_GEN_AI_KEY || '';
const genAI = new GoogleGenerativeAI(GEN_AI_KEY);

interface AcneCameraProps {
    // onPhotoTaken?: (photoUri: string, selectedRegion: string | null) => void;

  onCancel?: () => void;
  onAnalysisComplete?: (result: any) => void; 
}

interface ScanData {
  severity?: string;
  region?: string[];
  detectedAcne?: { type: string; count?: number }[];
}

type FaceRegion = 'forehead' | 'leftCheek' | 'rightCheek' | 'chin' | 'nose' | null;

export default function AcneCamera({
    // onPhotoTaken = (uri, region) => {},
  onCancel = () => {},
  onAnalysisComplete = (res) => {},
}: AcneCameraProps) {

  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);

  const router = useRouter();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<FaceRegion>(null);
  const [showRegionSelector, setShowRegionSelector] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [skinType, setSkinType] = useState('Oily');
  const [acneTypes, setAcneTypes] = useState<string[]>([]);
  const [severity, setSeverity] = useState('Moderate');
  const [areas, setAreas] = useState<string[]>([]);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [sleep, setSleep] = useState(60);
  const [stress, setStress] = useState(50);

  const userInfoParts: string[] = [];



    useEffect(() => {
    const fetchProfileAndScan = async () => {
      const user = auth.currentUser;
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        let profileData: any = {};
        if (userSnap.exists()) profileData = userSnap.data();

        setSkinType(profileData.skinType || 'Oily');  
        setTriggers(profileData.triggers || []);
        setSleep(profileData.sleepValue || 0);
        setStress(profileData.stressValue || 0);

        const scansRef = collection(db, 'users', user.uid, 'acneScans');
        const recentScanQuery = query(scansRef, orderBy('timestamp', 'desc'), limit(1));
        const scanSnap = await getDocs(recentScanQuery);

        let latestScan: ScanData = {};
        if (!scanSnap.empty) {
          latestScan = scanSnap.docs[0].data() as ScanData;
        }

        if (latestScan.detectedAcne && latestScan.detectedAcne.length > 0) {
          const mappedTypes = latestScan.detectedAcne.map((item) => {
            const type = item.type.toLowerCase();
            if (type === 'comedone') return 'Comedones';
            return type.charAt(0).toUpperCase() + type.slice(1) + 's';
          });
          setAcneTypes([...new Set(mappedTypes)]);
        } else if (profileData.acneTypes) {
          setAcneTypes(profileData.acneTypes);
        }

        if (latestScan.severity) {
          setSeverity(latestScan.severity);
        }
        else{
          setSeverity('');
        }

        if (latestScan.region && latestScan.region.length > 0) {
            const dataAsArray = Array.isArray(latestScan.region) 
                ? latestScan.region 
                : [latestScan.region];
                
              setAreas(dataAsArray);
            } else {
              setAreas([]);
            }

      } catch (error) {
        console.error('Error fetching profile or scan:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileAndScan();
  }, []);


    if (acneTypes?.length) {
      userInfoParts.push(`User has a history of acne types: ${acneTypes.join(", ")}.`);
    }

    if (severity != '') {
      userInfoParts.push(`Previous scanned acne severity is ${severity}.`);
    }

    if (areas?.length) {
      userInfoParts.push(`Breakouts usually appear in: ${areas.join(", ")}.`);
    }

    if (triggers?.length) {
      userInfoParts.push(`Known lifestyle or food triggers: ${triggers.join(", ")}.`);
    }

    if (skinType) userInfoParts.push(`Skin type: ${skinType}.`);

    if (sleep != 0) userInfoParts.push(`Sleep quality is ${sleep}%.`);

    if (stress != 0) userInfoParts.push(`Stress level is ${stress}%.`);



  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedPhoto(result.assets[0].uri);
      setShowRegionSelector(true);
    }
  };

  const handlePickImage = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (status !== 'granted') {
    alert('Sorry, we need camera roll permissions to make this work!');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [3, 4],
    quality: 1,
  });

  if (!result.canceled) {
    setSelectedPhoto(result.assets[0].uri);
    setShowRegionSelector(true); 
  }
};

  const handleAnalyze = async () => {
    if (!selectedPhoto) return;
    setIsAnalyzing(true);

    try {
      const base64Data = await FileSystem.readAsStringAsync(selectedPhoto, {
        encoding: 'base64',
      });

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `You are a dermatology-aware computer vision analysis system.
            Analyze the provided skin image focusing ONLY on the ${selectedRegion || 'full face'}. Make sure to also focus on the following user information for reasoning:

            ${JSON.stringify(userInfoParts, null, 2)}

            IMPORTANT RULES (MUST FOLLOW):
            - Output ONLY valid JSON.
            - Do NOT include explanations, markdown, or extra text.
            - Use conservative, non-diagnostic language.
            - Do NOT identify medical conditions beyond acne.
            - If image quality is poor, reduce confidence values accordingly.
            - NEVER overestimate severity.

            OUTPUT FORMAT (STRICT):
            {
              "detectedAcne": [
                {
                  "type": "papule" | "pustule" | "cyst" | "comedone" | "nodule",
                  "count": number,
                  "confidence": number
                }
              ],
              "totalCount": number,
              "severityScore": number,
              "severity": "mild" | "moderate" | "severe",
              "healingEstimate": {
                "days": number,
                "description": string
              }
            }

            ACNE TYPE DEFINITIONS (USE STRICTLY):
            - comedone: blackheads or whiteheads, non-inflamed
            - papule: small, red, inflamed bump without visible pus
            - pustule: inflamed bump with visible white/yellow center
            - nodule: large, firm, painful lesion beneath skin surface
            - cyst: deep, painful, fluid-filled lesion

            COUNTING RULES:
            - Count ONLY clearly visible lesions.
            - If uncertain, do NOT count.
            - Minimum count is 0.

            CONFIDENCE RULES:
            - Confidence is per acne type (0-100).
            - 90-100: Very clear visual evidence
            - 70-89: Mostly clear, minor ambiguity
            - 40-69: Uncertain or partially obscured
            - Below 40 only if image quality is poor

            SEVERITY SCORING (DETERMINISTIC):
            1. Start severityScore at 0.
            2. Add:
              - comedone: +1 point each
              - papule: +2 points each
              - pustule: +3 points each
              - nodule: +6 points each
              - cyst: +8 points each
            3. Cap severityScore at 100.

            SEVERITY LABEL MAPPING:
            - 0-20   → "mild"
            - 21-50  → "moderate"
            - 51-100 → "severe"

            HEALING ESTIMATE RULES:
            - Base days on the most severe acne type detected.
            - Use these ranges:
              - comedone: 2-5 days
              - papule: 4-7 days
              - pustule: 5-10 days
              - nodule: 10-21 days
              - cyst: 14-28 days
            - If multiple types exist, choose the LONGEST healing time.
            - Description must be supportive and non-alarming (≤ 12 words).

            FINAL CHECK:
            - totalCount must equal sum of all detected counts.
            - detectedAcne must not be empty (use empty array if none).
            - All numeric values must be integers.
            - JSON must be parseable.
            `;

      console.log("Prompt:  ", prompt);

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
      ]);

      const response = await result.response;
      const cleanJson = response.text().replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
        router.push({
                pathname: "/AcneDetectionResults",
                params: { 
                resultData: JSON.stringify(parsed), 
                photoUri: selectedPhoto,
                region: getRegionLabel(selectedRegion)
                }
            });
    //   // Pass the result back to the parent/results screen
    //   onAnalysisComplete({
    //     ...parsed,
    //     photoUri: selectedPhoto,
    //     region: getRegionLabel(selectedRegion),
    //     timestamp: "Today, " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    //   });
      
    } catch (error) {
      console.error(error);
      Alert.alert("Analysis Failed", "Please try again with a clearer photo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  /* Mock analyzer */
  //   const handleAnalyze = async () => {
  //   if (!selectedPhoto) return;
  //   setIsAnalyzing(true);

  //   try {
  //     // Simulate AI processing delay (UX realistic)
  //     await new Promise(resolve => setTimeout(resolve, 1800));

  //     // Mocked AI response (matches Gemini schema exactly)
  //     const parsed = {
  //       detectedAcne: [
  //         {
  //           type: "papule",
  //           count: 2,
  //           confidence: 88
  //         },
  //         {
  //           type: "comedone",
  //           count: 3,
  //           confidence: 92
  //         }
  //       ],
  //       totalCount: 5,
  //       severityScore: 7, 
  //       severity: "mild",
  //       healingEstimate: {
  //         days: 7,
  //         description: "Should improve with gentle, consistent care"
  //       }
  //     };

  //     router.push({
  //       pathname: "/AcneDetectionResults",
  //       params: { 
  //         resultData: JSON.stringify(parsed), 
  //         photoUri: selectedPhoto,
  //         region: getRegionLabel(selectedRegion)
  //       }
  //     });

  //   } catch (error) {
  //     console.error(error);
  //     Alert.alert("Analysis Failed", "Please try again with a clearer photo.");
  //   } finally {
  //     setIsAnalyzing(false);
  //   }
  // };
   //////////

  const getRegionLabel = (region: FaceRegion): string => {
    if (!region) return 'Full Face';
    const labels: any = { forehead: 'Forehead', leftCheek: 'Left Cheek', rightCheek: 'Right Cheek', chin: 'Chin', nose: 'Nose' };
    return labels[region];
  };

  const handleRetake = () => {
    setSelectedPhoto(null);
    setSelectedRegion(null);
    setShowRegionSelector(false);
  };

  const handleRegionSelect = (region: FaceRegion) => {
    setSelectedRegion(region);
  };

    const handleContinue = () => {
    if (selectedPhoto) {
      handleAnalyze(); 
    }
  };

  const pulse = useSharedValue(1);

  const rotate = useSharedValue(0);
  const textOpacity = useSharedValue(1);

  const messages = [
    'Analyzing skin texture',
    'Identifying acne patterns',
    'Preparing personalized insights',
  ];

  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.02, {
        duration: 1800,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    rotate.value = withRepeat(
      withTiming(360, {
        duration: 6000,
        easing: Easing.linear,
      }),
      -1
    );
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      textOpacity.value = withTiming(0, { duration: 300 }, () => {
        runOnJS(setMessageIndex)((prev) => (prev + 1) % messages.length);
        textOpacity.value = withTiming(1, { duration: 300 });
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.95,
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  // UI logic for loading
  if (isAnalyzing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

        {/* Background Photo */}
        <Image source={{ uri: selectedPhoto! }} style={StyleSheet.absoluteFill} />

        {/* Overlay */}
        <LinearGradient
          colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
          style={StyleSheet.absoluteFill}
        />

        {/* Fancy Loading Card */}
        <View style={styles.analyzingOverlay}>
          <Animated.View style={[styles.loadingCard, cardAnimatedStyle]}>
            <View style={styles.spinnerWrapper}>
              <Animated.View style={[styles.ring, ringAnimatedStyle]} />
              <ActivityIndicator size="large" color="#4F46E5" />
            </View>

            <Text style={styles.loadingTitle}>Analyzing your skin</Text>

            <Animated.Text style={[styles.loadingSubtitle, textAnimatedStyle]}>
              {messages[messageIndex]}
            </Animated.Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // Initial camera state
  if (!selectedPhoto) {
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
          <Text style={styles.headerTitle}>Scan Acne</Text>
        </View>
          <TouchableOpacity onPress={() => router.push('/AcneTrackingHistory')} style={styles.historyButton}>
            <Text style={styles.historyText}>History</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Camera Preview Placeholder */}
          <View style={styles.cameraPlaceholder}>
            <View style={styles.cameraIconContainer}>
              <Text style={styles.cameraIcon}>👤</Text>
            </View>
            <Text style={styles.cameraPlaceholderText}>
              Center your face in the frame
            </Text>
            <Text style={styles.cameraSubtext}>
              AI will analyze acne patterns
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleTakePhoto}>
              <Text style={styles.buttonIcon}>📷</Text>
              <Text style={styles.primaryButtonText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handlePickImage}>
              <Text style={styles.buttonIcon}>🖼️</Text>
              <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>

          {/* Tips Section */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Tips for best results:</Text>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <Text style={styles.tipBullet}>💡</Text>
                <Text style={styles.tipText}>Use natural light</Text>
              </View>
              <View style={styles.tipItem}>
                <Text style={styles.tipBullet}>📐</Text>
                <Text style={styles.tipText}>Face camera directly</Text>
              </View>
              <View style={styles.tipItem}>
                <Text style={styles.tipBullet}>🚫</Text>
                <Text style={styles.tipText}>Avoid harsh shadows</Text>
              </View>
              <View style={styles.tipItem}>
                <Text style={styles.tipBullet}>✨</Text>
                <Text style={styles.tipText}>Clean skin, no makeup</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Region selection state
  if (showRegionSelector) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleRetake} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Retake</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Select Region</Text>
          <View style={styles.historyButton} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Photo Preview */}
          <View style={styles.photoPreviewContainer}>
            <Image source={{ uri: selectedPhoto }} style={styles.photoPreview} />
          </View>

          {/* Region Selection */}
          <View style={styles.regionSelectorCard}>
            <Text style={styles.sectionTitle}>Where is the concern area?</Text>
            <Text style={styles.sectionSubtitle}>
              Select the area for focused analysis (optional)
            </Text>

            <View style={styles.regionGrid}>
              <TouchableOpacity
                style={[
                  styles.regionButton,
                  selectedRegion === 'forehead' && styles.regionButtonActive,
                ]}
                onPress={() => handleRegionSelect('forehead')}
              >
                <Text style={styles.regionEmoji}>🧠</Text>
                <Text
                  style={[
                    styles.regionText,
                    selectedRegion === 'forehead' && styles.regionTextActive,
                  ]}
                >
                  Forehead
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.regionButton,
                  selectedRegion === 'nose' && styles.regionButtonActive,
                ]}
                onPress={() => handleRegionSelect('nose')}
              >
                <Text style={styles.regionEmoji}>👃</Text>
                <Text
                  style={[
                    styles.regionText,
                    selectedRegion === 'nose' && styles.regionTextActive,
                  ]}
                >
                  Nose
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.regionButton,
                  selectedRegion === 'leftCheek' && styles.regionButtonActive,
                ]}
                onPress={() => handleRegionSelect('leftCheek')}
              >
                <Text style={styles.regionEmoji}>◀️</Text>
                <Text
                  style={[
                    styles.regionText,
                    selectedRegion === 'leftCheek' && styles.regionTextActive,
                  ]}
                >
                  Left Cheek
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.regionButton,
                  selectedRegion === 'rightCheek' && styles.regionButtonActive,
                ]}
                onPress={() => handleRegionSelect('rightCheek')}
              >
                <Text style={styles.regionEmoji}>▶️</Text>
                <Text
                  style={[
                    styles.regionText,
                    selectedRegion === 'rightCheek' && styles.regionTextActive,
                  ]}
                >
                  Right Cheek
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.regionButton,
                  selectedRegion === 'chin' && styles.regionButtonActive,
                ]}
                onPress={() => handleRegionSelect('chin')}
              >
                <Text style={styles.regionEmoji}>🫦</Text>
                <Text
                  style={[
                    styles.regionText,
                    selectedRegion === 'chin' && styles.regionTextActive,
                  ]}
                >
                  Chin
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.regionButton,
                  selectedRegion === null && styles.regionButtonActive,
                ]}
                onPress={() => handleRegionSelect(null)}
              >
                <Text style={styles.regionEmoji}>😊</Text>
                <Text
                  style={[
                    styles.regionText,
                    selectedRegion === null && styles.regionTextActive,
                  ]}
                >
                  Full Face
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        {/* Continue Button */}
        <View style={styles.stickyButtonContainer}>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>
              Analyze {getRegionLabel(selectedRegion)}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
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
    color: colors.subtext,
    fontWeight: '500',
  },
  // header: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'space-between',
  //   paddingHorizontal: 20,
  //   paddingVertical: 16,
  //   backgroundColor: colors.card,
  //   borderBottomWidth: 1,
  //   borderBottomColor: colors.border,
  // },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 22,
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.05,
    // shadowRadius: 10,
    // elevation: 3,
  },
  cancelButton: {
    width: 70,
  },
    cancelText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#EF4444',
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
  // headerTitle: {
  //   fontSize: 18,
  //   fontWeight: '600',
  //   color: colors.text,
  // },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
    headerTitleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  historyButton: {
    width: 70,
    alignItems: 'flex-end',
  },
  historyText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  // contentContainer: {
  //   padding: 20,
  //   paddingBottom: 40,
  // },
  contentContainer: {
    flex: 1, 
    paddingHorizontal: 20,
    paddingVertical: 15,
    justifyContent: 'space-between', 
  },
  // cameraPlaceholder: {
  //   backgroundColor: isDarkMode ? '#1F2937' : '#343f50ff',    borderRadius: 16,
  //   height: 400,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   marginBottom: 24,
  // },
  cameraPlaceholder: {
    flex: 1,
    minHeight: 280,
    backgroundColor: colors.primary + '10',
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.primary + '30',
    borderStyle: 'dashed',
  },
  // cameraIconContainer: {
  //   width: 80,
  //   height: 80,
  //   borderRadius: 40,
  //   backgroundColor: 'rgba(255, 255, 255, 0.1)',
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   marginBottom: 16,
  // },
  cameraIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    transform: [{ rotate: '-8deg' }],
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  cameraIcon: {
    fontSize: 40,
  },
  // cameraPlaceholderText: {
  //   fontSize: 18,
  //   fontWeight: '600',
  //   color: '#FFFFFF',
  //   marginBottom: 8,
  // },
  cameraPlaceholderText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  // cameraSubtext: {
  //   fontSize: 14,
  //   color: '#D1D5DB',
  // },
  cameraSubtext: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: 4,
    fontWeight: '600',
  },
  actionButtons: {
    gap: 12,
    marginBottom: 32,
  },
  // primaryButton: {
  //   backgroundColor: colors.primary,
  //   borderRadius: 12,
  //   padding: 18,
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   gap: 8,
  // },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonIcon: {
    fontSize: 20,
  },
  // primaryButtonText: {
  //   fontSize: 16,
  //   fontWeight: '600',
  //   color: '#FFFFFF',
  // },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  // secondaryButton: {
  //   backgroundColor: colors.card,
  //   borderRadius: 12,
  //   padding: 18,
  //   borderWidth: 2,
  //   borderColor: colors.primary,
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   gap: 8,
  // },
  secondaryButton: {
    backgroundColor: isDarkMode ? colors.card : '#eaeaeaff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  // secondaryButtonText: {
  //   fontSize: 16,
  //   fontWeight: '600',
  //   color: colors.primary,
  // },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  // tipsContainer: {
  //   backgroundColor: colors.card,
  //   borderRadius: 12,
  //   padding: 20,
  //   borderWidth: 1,
  //   borderColor: colors.border,
  // },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  // tipsList: {
  //   gap: 8,
  // },
  // tipItem: {
  //   flexDirection: 'row',
  //   alignItems: 'flex-start',
  //   gap: 8,
  // },
  tipBullet: {
    fontSize: 16,
    marginTop: 2,
  },
  // tipText: {
  //   flex: 1,
  //   fontSize: 14,
  //   color: colors.subtext,
  //   lineHeight: 20,
  // },
  photoPreviewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoPreview: {
    width: '100%',
    height: 400,
    backgroundColor: colors.surface,
  },
  // regionSelectorCard: {
  //   backgroundColor: colors.card,
  //   borderRadius: 16,
  //   padding: 20,
  //   marginBottom: 20,
  //   borderWidth: 1,
  //   borderColor: colors.border,
  // },
  regionSelectorCard: {
    backgroundColor: isDarkMode ? colors.card : '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: 20,
  },
  // regionGrid: {
  //   flexDirection: 'row',
  //   flexWrap: 'wrap',
  //   gap: 12,
  // },
  regionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  // regionButton: {
  //   width: '48%',
  //   backgroundColor: colors.background,
  //   borderRadius: 12,
  //   padding: 16,
  //   alignItems: 'center',
  //   borderWidth: 2,
  //   borderColor: 'transparent',
  // },
  regionButton: {
    width: '31%', 
    backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  // regionButtonActive: {
  //   backgroundColor: colors.surface,
  //   borderColor: colors.primary,
  // },
  regionButtonActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  // regionEmoji: {
  //   fontSize: 32,
  //   marginBottom: 8,
  // },
  // regionText: {
  //   fontSize: 14,
  //   fontWeight: '500',
  //   color: colors.subtext,
  // },
  // regionTextActive: {
  //   color: colors.primary,
  //   fontWeight: '600',
  // },
  regionEmoji: { fontSize: 24, marginBottom: 5 },
  regionText: { fontSize: 11, fontWeight: '700', color: colors.subtext },
  regionTextActive: { color: colors.primary },

  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  stickyButtonContainer: {
  paddingHorizontal: 20,
  paddingTop: 10,
  paddingBottom: 0, 
  backgroundColor: isDarkMode ? colors.background : '#F8FAFC',
  borderTopWidth: 1,
  borderTopColor: colors.border + '50', 
},

  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // loadingCard: {
  //   backgroundColor: colors.card,
  //   paddingVertical: 32,
  //   paddingHorizontal: 40,
  //   borderRadius: 18,
  //   alignItems: 'center',
  //   shadowColor: '#000',
  //   shadowOpacity: 0.06,
  //   shadowRadius: 12,
  //   elevation: 5,
  //   borderWidth: 1,
  //   borderColor: colors.border,
  // },
  ring: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.primary,
    borderTopColor: 'transparent',
  },
  // loadingTitle: {
  //   fontSize: 16,
  //   fontWeight: '600',
  //   color: colors.text,
  //   marginTop: 8,
  // },
  // loadingSubtitle: {
  //   fontSize: 13,
  //   color: colors.subtext,
  //   marginTop: 6,
  //   textAlign: 'center',
  // },
  spinnerWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  loadingCard: {
    backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
    padding: 35,
    borderRadius: 45,
    alignItems: 'center',
    width: '85%',
    shadowColor: colors.primary,
    shadowOpacity: isDarkMode ? 0.4 : 0.1,
    shadowRadius: 25,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: isDarkMode ? '#FFF' : '#000',
    marginTop: 15,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  tipsContainer: {
    backgroundColor: isDarkMode ? '#1E293B' : '#EEF2FF',
    borderRadius: 24,
    padding: 15,
  },
  tipsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tipItem: {
    backgroundColor: isDarkMode ? colors.chipBackground : '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tipText: { fontWeight: '700', color: colors.text, fontSize: 11 },
});


/* Old design */ 
//     if (isLoading) {
//     return (
//       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor : colors.background }}>
//         <ActivityIndicator size="large" color="#F472B6" />
//       </View>
//     );
//   }


//   // UI logic for loading
//   if (isAnalyzing) {
//     return (
//     <LinearGradient
//       colors={ isDarkMode
//     ? ['#111827', '#1F2937']
//     : ['#F9FAFB', '#EEF2FF']}
//       style={styles.loadingContainer}
//     >
//       <Animated.View style={[styles.loadingCard, cardAnimatedStyle]}>
//         <View style={styles.spinnerWrapper}>
//           <Animated.View style={[styles.ring, ringAnimatedStyle]} />
//           <ActivityIndicator size="large" color="#4F46E5" />
//         </View>

//         <Text style={styles.loadingTitle}>Analyzing your skin</Text>

//         <Animated.Text style={[styles.loadingSubtitle, textAnimatedStyle]}>
//           {messages[messageIndex]}
//         </Animated.Text>
//       </Animated.View>
//     </LinearGradient>
//     );
//   }

//   // Initial camera state
//   if (!selectedPhoto) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <StatusBar barStyle="light-content" />
        
//         {/* Header */}
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
//             <Text style={styles.cancelText}>Cancel</Text>
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Scan Acne</Text>
//           <TouchableOpacity onPress={() => router.push('/AcneTrackingHistory')} style={styles.historyButton}>
//             <Text style={styles.historyText}>History</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Camera Preview Placeholder */}
//         <View style={styles.cameraPreview}>
//           {/* Face Guide Overlay */}
//             <View style={styles.faceGuideOverlay}>
//             <View style={styles.faceGuideCircle}>
//                 <View style={[styles.faceGuideCorner, styles.topLeft]} />
//                 <View style={[styles.faceGuideCorner, styles.topRight]} />
//                 <View style={[styles.faceGuideCorner, styles.bottomLeft]} />
//                 <View style={[styles.faceGuideCorner, styles.bottomRight]} />
//             </View>
//             </View>

//           {/* Instructions Overlay */}
//           <View style={styles.instructionsOverlay}>
//             <View style={styles.instructionCard}>
//               <Text style={styles.instructionIcon}>👤</Text>
//               <Text style={styles.instructionText}>Center your face in the frame</Text>
//             </View>
//           </View>
//         </View>

//         {/* Bottom Controls */}
//         <View style={styles.bottomControls}>
//           {/* Lighting Tips */}
//           <View style={styles.tipsContainer}>
//             <View style={styles.tipItem}>
//               <Text style={styles.tipIcon}>💡</Text>
//               <Text style={styles.tipText}>Use natural light</Text>
//             </View>
//             <View style={styles.tipItem}>
//               <Text style={styles.tipIcon}>📐</Text>
//               <Text style={styles.tipText}>Face camera directly</Text>
//             </View>
//             <View style={styles.tipItem}>
//               <Text style={styles.tipIcon}>🚫</Text>
//               <Text style={styles.tipText}>Avoid harsh shadows</Text>
//             </View>
//           </View>

//           <View style={styles.actionRow}> 
//             <View style={{ width: 50 }} />
//               {/* Capture Button */}
//               <TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto}>
//                 <View style={styles.captureButtonInner} />
//               </TouchableOpacity>
              
//               {/* Gallery Button */}
//               <TouchableOpacity style={styles.galleryButton} onPress={handlePickImage}>
//                 <Text style={{ fontSize: 24 }}>🖼️</Text>
//               </TouchableOpacity>
             
              
//               {/* Empty View for symmetry if needed
//               <View style={{ width: 40 }} />  */}
//             </View>
//             <Text style={styles.galleryLabel}>Upload a photo</Text>

//           <Text style={styles.captureHint}>Tap to capture</Text>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   // Region selection state
//   if (showRegionSelector) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <StatusBar barStyle="dark-content" />
        
//         {/* Header */}
//         <View style={[styles.header, styles.headerLight]}>
//           <TouchableOpacity onPress={handleRetake} style={styles.cancelButton}>
//             <Text style={[styles.cancelText, styles.textDark]}>Retake</Text>
//           </TouchableOpacity>
//           <Text style={[styles.headerTitle, styles.textDark]}>Select Region</Text>
//           <View style={styles.historyButton} />
//         </View>

//         <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
//           {/* Photo Preview */}
//           <View style={styles.photoPreviewContainer}>
//             <Image source={{ uri: selectedPhoto }} style={styles.photoPreview} />
//           </View>

//           {/* Region Selection */}
//           <View style={styles.regionSelectorCard}>
//             <Text style={styles.sectionTitle}>Where is the concern area?</Text>
//             <Text style={styles.sectionSubtitle}>
//               Select the area for focused analysis (optional)
//             </Text>

//             <View style={styles.regionGrid}>
//               <TouchableOpacity
//                 style={[
//                   styles.regionButton,
//                   selectedRegion === 'forehead' && styles.regionButtonActive,
//                 ]}
//                 onPress={() => handleRegionSelect('forehead')}
//               >
//                 <Text style={styles.regionEmoji}>🧠</Text>
//                 <Text
//                   style={[
//                     styles.regionText,
//                     selectedRegion === 'forehead' && styles.regionTextActive,
//                   ]}
//                 >
//                   Forehead
//                 </Text>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={[
//                   styles.regionButton,
//                   selectedRegion === 'nose' && styles.regionButtonActive,
//                 ]}
//                 onPress={() => handleRegionSelect('nose')}
//               >
//                 <Text style={styles.regionEmoji}>👃</Text>
//                 <Text
//                   style={[
//                     styles.regionText,
//                     selectedRegion === 'nose' && styles.regionTextActive,
//                   ]}
//                 >
//                   Nose
//                 </Text>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={[
//                   styles.regionButton,
//                   selectedRegion === 'leftCheek' && styles.regionButtonActive,
//                 ]}
//                 onPress={() => handleRegionSelect('leftCheek')}
//               >
//                 <Text style={styles.regionEmoji}>◀️</Text>
//                 <Text
//                   style={[
//                     styles.regionText,
//                     selectedRegion === 'leftCheek' && styles.regionTextActive,
//                   ]}
//                 >
//                   Left Cheek
//                 </Text>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={[
//                   styles.regionButton,
//                   selectedRegion === 'rightCheek' && styles.regionButtonActive,
//                 ]}
//                 onPress={() => handleRegionSelect('rightCheek')}
//               >
//                 <Text style={styles.regionEmoji}>▶️</Text>
//                 <Text
//                   style={[
//                     styles.regionText,
//                     selectedRegion === 'rightCheek' && styles.regionTextActive,
//                   ]}
//                 >
//                   Right Cheek
//                 </Text>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={[
//                   styles.regionButton,
//                   selectedRegion === 'chin' && styles.regionButtonActive,
//                 ]}
//                 onPress={() => handleRegionSelect('chin')}
//               >
//                 <Text style={styles.regionEmoji}>🫦</Text>
//                 <Text
//                   style={[
//                     styles.regionText,
//                     selectedRegion === 'chin' && styles.regionTextActive,
//                   ]}
//                 >
//                   Chin
//                 </Text>
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={[
//                   styles.regionButton,
//                   selectedRegion === null && styles.regionButtonActive,
//                 ]}
//                 onPress={() => handleRegionSelect(null)}
//               >
//                 <Text style={styles.regionEmoji}>😊</Text>
//                 <Text
//                   style={[
//                     styles.regionText,
//                     selectedRegion === null && styles.regionTextActive,
//                   ]}
//                 >
//                   Full Face
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>

//           {/* Continue Button */}
//           <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
//             <Text style={styles.continueButtonText}>
//               Analyze {getRegionLabel(selectedRegion)}
//             </Text>
//           </TouchableOpacity>
//         </ScrollView>
//       </SafeAreaView>
//     );
//   }

//   return null;
// }

// const getStyles = (colors: any) => StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#000000', 
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 20,
//     paddingVertical: 16,
//     backgroundColor: 'transparent',
//   },
//   headerLight: {
//     backgroundColor: colors.card, 
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border, 
//   },
//   cancelButton: {
//     width: 70,
//   },
//   cancelText: {
//     fontSize: 16,
//     color: '#FFFFFF', 
//     fontWeight: '500',
//   },
//   textDark: {
//     color: colors.subtext, 
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#FFFFFF', 
//   },
//   historyButton: {
//     width: 70,
//     alignItems: 'flex-end',
//   },
//   historyText: {
//     fontSize: 16,
//     color: colors.primary, 
//     fontWeight: '500',
//   },
//   cameraPreview: {
//     flex: 1,
//     backgroundColor: '#1a1a1a',
//     position: 'relative',
//   },
//   faceGuideOverlay: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   faceGuideCircle: {
//     width: 280,
//     height: 360,
//     borderRadius: 140,
//     borderWidth: 3,
//     borderColor: 'rgba(79, 70, 229, 0.6)', 
//     position: 'relative',
//   },
//   faceGuideCorner: {
//     position: 'absolute',
//     width: 30,
//     height: 30,
//     borderColor: colors.primary, 
//   },
//   // Corners maintain primary brand color for tracking
//   topLeft: { top: -3, left: -3, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 8 },
//   topRight: { top: -3, right: -3, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 8 },
//   bottomLeft: { bottom: -3, left: -3, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 8 },
//   bottomRight: { bottom: -3, right: -3, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 8 },
  
//   instructionsOverlay: {
//     position: 'absolute',
//     top: 20,
//     left: 20,
//     right: 20,
//   },
//   instructionCard: {
//     backgroundColor: 'rgba(0, 0, 0, 0.7)',
//     borderRadius: 12,
//     padding: 16,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//   },
//   instructionText: {
//     flex: 1,
//     fontSize: 16,
//     color: '#FFFFFF',
//     fontWeight: '500',
//     alignItems: 'center'
//   },
//   bottomControls: {
//     backgroundColor: '#000000',
//     paddingTop: 20,
//     paddingBottom: 40,
//     paddingHorizontal: 20,
//   },
//   tipText: {
//     fontSize: 11,
//     color: '#D1D5DB', 
//     textAlign: 'center',
//   },
//   captureButton: {
//     width: 80,
//     height: 80,
//     borderRadius: 40,
//     backgroundColor: '#FFFFFF',
//     alignSelf: 'center',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 2,
//     marginTop: 20
//   },
//   captureButtonInner: {
//     width: 68,
//     height: 68,
//     borderRadius: 34,
//     backgroundColor: colors.primary, 
//   },
//   captureHint: {
//     fontSize: 14,
//     color: '#9CA3AF',
//     textAlign: 'center',
//   },

//   content: {
//     flex: 1,
//     backgroundColor: colors.background, 
//   },
//   contentContainer: {
//     flexGrow: 1,
//     padding: 20,
//     paddingBottom: 40,
//   },
//   photoPreviewContainer: {
//     flexGrow: 1,
//     borderRadius: 16,
//     overflow: 'hidden',
//     marginBottom: 24,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.1,
//     shadowRadius: 12,
//     elevation: 4,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   photoPreview: {
//     width: '100%',
//     flex: 1,
//     backgroundColor: colors.surface, 
//     resizeMode: 'cover',
//   },
//   regionSelectorCard: {
//     backgroundColor: colors.card, 
//     borderRadius: 16,
//     padding: 20,
//     marginBottom: 20,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   sectionTitle: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: colors.text, 
//     marginBottom: 8,
//   },
//   sectionSubtitle: {
//     fontSize: 14,
//     color: colors.subtext, 
//     marginBottom: 20,
//   },
//   regionGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 12,
//   },
//   regionButton: {
//     width: '48%',
//     backgroundColor: colors.background, 
//     borderRadius: 12,
//     padding: 16,
//     alignItems: 'center',
//     borderWidth: 2,
//     borderColor: 'transparent',
//   },
//   regionButtonActive: {
//     backgroundColor: colors.surface, 
//     borderColor: colors.primary,
//   },
//   regionText: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: colors.subtext, 
//   },
//   regionTextActive: {
//     color: colors.primary, 
//     fontWeight: '600',
//   },
//   continueButton: {
//     backgroundColor: colors.primary, 
//     borderRadius: 12,
//     padding: 20,
//     alignItems: 'center',
//   },
//   continueButtonText: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#FFFFFF',
//   },

 
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: colors.background, 
//   },
//   loadingCard: {
//     backgroundColor: colors.card, 
//     paddingVertical: 32,
//     paddingHorizontal: 40,
//     borderRadius: 18,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOpacity: 0.06,
//     shadowRadius: 12,
//     elevation: 5,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   ring: {
//     position: 'absolute',
//     width: 64,
//     height: 64,
//     borderRadius: 32,
//     borderWidth: 2,
//     borderColor: colors.isDarkMode ? colors.primary : '#C7D2FE',
//     borderTopColor: 'transparent',
//   },
//   loadingTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: colors.text, 
//     marginTop: 8,
//   },
//   loadingSubtitle: {
//     fontSize: 13,
//     color: colors.subtext, 
//     marginTop: 6,
//     textAlign: 'center',
//   },
//     spinnerWrapper: {
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   instructionIcon: {
//     fontSize: 24,
//   },
//   tipsContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     // marginBottom: 24,
//       alignItems: 'flex-start',

//   },
//   tipItem: {
//     flex: 1, 
//     alignItems: 'center',
//     gap: 4,
//   },
//   tipIcon: {
//     fontSize: 20,
//       textAlign: 'center', 
//   },
//   regionEmoji: {
//     fontSize: 32,
//     marginBottom: 8,
//   },
//   actionRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     width: '100%',
//     paddingHorizontal: 30,
//     marginBottom: 10,
//   },
//   galleryButton: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     backgroundColor: 'rgba(255, 255, 255, 0.2)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: 56,
//   },
//   galleryLabel: {
//     position: 'absolute',
//     top: 179,         
//     left: 311,       
//     fontSize: 12,
//     color: '#9CA3AF',
//     textAlign: 'center',
//   }
// });