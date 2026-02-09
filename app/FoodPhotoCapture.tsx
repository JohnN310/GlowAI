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
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';


import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../FirebaseConfig';

import { GoogleGenerativeAI } from "@google/generative-ai";

import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';

import { LinearGradient } from 'expo-linear-gradient';

import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../app/theme/ThemeContext';

const GEN_AI_KEY = process.env.EXPO_PUBLIC_GEN_AI_KEY || '';
const genAI = new GoogleGenerativeAI(GEN_AI_KEY);

type PhotoSource = 'camera' | 'gallery' | null;

interface FoodAnalysisResult {
  foodName: string;
  confidence: number;
  acneRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  triggers: string[];
  recommendations: string[];
}

interface ScanData {
  severity?: string;
  region?: string[];
  detectedAcne?: { type: string; count?: number }[];
}


export default function FoodPhotoCapture() {
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);

  const router = useRouter();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResult | null>(null);
  const [editedFoodName, setEditedFoodName] = useState<string>('');

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



  // Take Photo with Camera
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera access to scan your food.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedPhoto(result.assets[0].uri);
    }
  };

  // Upload from Gallery
  const handleSelectFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need gallery access to select food photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedPhoto(result.assets[0].uri);
    }
  };

  // Analyze Photo using AI 
  const handleAnalyzePhoto = async () => {
      if (!selectedPhoto) return;
      setIsAnalyzing(true);

      try {
        const base64Data = await FileSystem.readAsStringAsync(selectedPhoto, {
          encoding: 'base64',
        });

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        You are a dermatology-aware food analysis system.
        Analyze the provided food image strictly for acne breakout risk. Make sure to consider the following user information for reasoning: 

        ${JSON.stringify(userInfoParts, null, 2)}

        IMPORTANT RULES (MUST FOLLOW):
        - Output ONLY valid JSON.
        - Do NOT include explanations, markdown, or extra text.
        - Use conservative, evidence-based assumptions.
        - If uncertain about the food, choose the MOST LIKELY common dish and LOWER the confidence score.
        - NEVER invent ingredients not visually present.

        OUTPUT FORMAT (STRICT):
        {
          "foodName": string,
          "confidence": number (0-100),
          "acneRiskScore": number (0-100),
          "riskLevel": "low" | "medium" | "high",
          "triggers": string[],
          "recommendations": string[]
        }

        SCORING RULES (DETERMINISTIC):
        1. Start acneRiskScore at 0.
        2. Add points:
          - High glycemic carbohydrates (white bread, sugar, pastries, fries): +25
          - Moderate glycemic carbohydrates (rice, pasta, tortillas): +15
          - Dairy (milk, cheese, cream, yogurt): +20
          - Highly processed or fried foods: +15
          - Added sugar (desserts, sweet sauces, sodas): +20
        3. Cap acneRiskScore at 100.

        RISK LEVEL MAPPING:
        - 0-30   → "low"
        - 31-60  → "medium"
        - 61-100 → "high"

        TRIGGERS FIELD:
        - Include only triggers that are visually identifiable.
        - Use ONLY these exact trigger labels when applicable:
          ["High glycemic carbs", "Dairy", "Added sugar", "Highly processed", "Fried food"]
        - If no triggers are present, return ["None detected"].

        CONFIDENCE RULES:
        - 90-100: Food is very clearly identifiable.
        - 70-89: Food is mostly clear but may have minor ambiguity.
        - 40-69: Food identification is uncertain.
        - Below 40: Only use if image is very unclear.

        RECOMMENDATIONS RULES:
        - Return EXACTLY 3 short, actionable skin-health tips.
        - Each recommendation must be ≤ 10 words.
        - Use neutral, supportive language.
        - Do NOT mention acneRiskScore or riskLevel.
        - Examples of acceptable themes:
          hydration, portion moderation, fiber, anti-inflammatory foods, balance.

        FINAL CHECK:
        - JSON must be parseable.
        - Arrays must not be empty.
        - All numeric values must be integers.
        `;

        console.log("Prompt:", prompt);

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: "image/jpeg",
            },
          },
        ]);

        const response = await result.response;
        const text = response.text();
        
        // Parse the JSON response
        const cleanJson = text.replace(/```json|```/g, "").trim();
        const parsedAnalysis: FoodAnalysisResult = JSON.parse(cleanJson);

        setAnalysisResult(parsedAnalysis);
        setEditedFoodName(parsedAnalysis.foodName);
      } catch (error) {
        console.error("Gemini Analysis Error:", error);
        Alert.alert("Analysis Failed", "Could not identify the food. Please try again with a clearer photo.");
      } finally {
        setIsAnalyzing(false);
      }
    };

  // Mock Analyze Photo Function (for testing without API)
  // const handleAnalyzePhoto = async () => {
  //   if (!selectedPhoto) return;
  //   setIsAnalyzing(true);

  //   // Simulation of AI Analysis (In reality, you'd send the URI to a backend/API) ** FIX This **
  //   setTimeout(() => {
  //     const mockAnalysis: FoodAnalysisResult = {
  //       foodName: 'Fried Chicken Sandwich',
  //       confidence: 92,
  //       acneRiskScore: 85,
  //       riskLevel: 'high',
  //       triggers: ['High in refined carbs', 'High in unhealthy fats'],
  //       recommendations: [
  //         'Consider swapping for grilled options instead',
  //         'Limit portion size to reduce acne risk',
  //         'Pair with vegetables for added nutrients',
  //       ],
  //     };
  //     setAnalysisResult(mockAnalysis);
  //     setIsAnalyzing(false);
  //   }, 2000);
  // };


  const handleReanalyze = async () => {
  if (!editedFoodName || !selectedPhoto) return;
  setIsAnalyzing(true);

  try {
    const base64Data = await FileSystem.readAsStringAsync(selectedPhoto, {
      encoding: 'base64',
    });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Updated prompt focusing on the user's correction
    const prompt = `
         You are a dermatology-aware food analysis system.
        Analyze the provided food image and user's edited food name: "${editedFoodName}" strictly for acne breakout risk. Make sure to consider the following user information: 

        ${JSON.stringify(userInfoParts, null, 2)}

        IMPORTANT RULES (MUST FOLLOW):
        - Output ONLY valid JSON.
        - Do NOT include explanations, markdown, or extra text.
        - Use conservative, evidence-based assumptions.
        - If uncertain about the food, choose the MOST LIKELY common dish and LOWER the confidence score.
        - NEVER invent ingredients not visually present.

        OUTPUT FORMAT (STRICT):
        {
          "foodName": string,
          "confidence": number (0-100),
          "acneRiskScore": number (0-100),
          "riskLevel": "low" | "medium" | "high",
          "triggers": string[],
          "recommendations": string[]
        }

        SCORING RULES (DETERMINISTIC):
        1. Start acneRiskScore at 0.
        2. Add points:
          - High glycemic carbohydrates (white bread, sugar, pastries, fries): +25
          - Moderate glycemic carbohydrates (rice, pasta, tortillas): +15
          - Dairy (milk, cheese, cream, yogurt): +20
          - Highly processed or fried foods: +15
          - Added sugar (desserts, sweet sauces, sodas): +20
        3. Cap acneRiskScore at 100.

        RISK LEVEL MAPPING:
        - 0-30   → "low"
        - 31-60  → "medium"
        - 61-100 → "high"

        TRIGGERS FIELD:
        - Include only triggers that are visually identifiable.
        - Use ONLY these exact trigger labels when applicable:
          ["High glycemic carbs", "Dairy", "Added sugar", "Highly processed", "Fried food"]
        - If no triggers are present, return ["None detected"].

        CONFIDENCE RULES:
        - 90-100: Food is very clearly identifiable.
        - 70-89: Food is mostly clear but may have minor ambiguity.
        - 40-69: Food identification is uncertain.
        - Below 40: Only use if image is very unclear.

        RECOMMENDATIONS RULES:
        - Return EXACTLY 3 short, actionable skin-health tips.
        - Each recommendation must be ≤ 10 words.
        - Use neutral, supportive language.
        - Do NOT mention acneRiskScore or riskLevel.
        - Examples of acceptable themes:
          hydration, portion moderation, fiber, anti-inflammatory foods, balance.

        FINAL CHECK:
        - JSON must be parseable.
        - Arrays must not be empty.
        - All numeric values must be integers.
        `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
    ]);

    const response = await result.response;
    const cleanJson = response.text().replace(/```json|```/g, "").trim();
    const updatedAnalysis: FoodAnalysisResult = JSON.parse(cleanJson);

    setAnalysisResult(updatedAnalysis);
    setEditedFoodName(updatedAnalysis.foodName);
  } catch (error) {
    Alert.alert("Re-analysis Failed", "Could not update analysis. Please try again.");
  } finally {
    setIsAnalyzing(false);
  }
};

const handleSaveLog = async () => {
    if (!analysisResult) return;
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be logged in to save logs.");
      return;
    }

    setIsSaving(true);
    try {
    
      await addDoc(collection(db, `users/${user.uid}/foodLogs`), {
        foodName: editedFoodName || analysisResult.foodName,
        confidence: analysisResult.confidence,
        acneRiskScore: analysisResult.acneRiskScore,
        riskLevel: analysisResult.riskLevel,
        triggers: analysisResult.triggers,
        recommendations: analysisResult.recommendations,
        imageUrl: null, 
        timestamp: serverTimestamp(),
      });

      Alert.alert('Success', 'Food data logged successfully!', [
        { 
          text: 'View History', 
          onPress: () => router.push('/FoodHistory') 
        },
        { 
          text: 'OK', 
          onPress: handleRetake 
        }
      ]);
    } catch (error) {
      console.error("Firestore Save Error:", error);
      Alert.alert('Error', 'Failed to save food log data.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetake = () => {
    setSelectedPhoto(null);
    setAnalysisResult(null);
  };

  const getRiskColor = (level: 'low' | 'medium' | 'high'): string => {
    const colors = { low: '#10B981', medium: '#F59E0B', high: '#EF4444' };
    return colors[level];
  };

   const messages = [
    'Analyzing food composition',
    'Identifying potential triggers',
    'Preparing personalized insights',
  ];

  const [messageIndex, setMessageIndex] = useState(0);
  const pulse = useSharedValue(1);
  const rotate = useSharedValue(0);
  const textOpacity = useSharedValue(1);

  // Card breathing animation
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.02, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  // Halo ring rotation
  useEffect(() => {
    rotate.value = withRepeat(
      withTiming(360, { duration: 6000, easing: Easing.linear }),
      -1
    );
  }, []);

  // Rotating insight text
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

//     if (isLoading) {
//     return (
//       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor : colors.background}}>
//         <ActivityIndicator size="large" color="#F472B6" />
//       </View>
//     );
//   }

//   // Initial state: No photo selected
//   if (!selectedPhoto) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <StatusBar barStyle="dark-content" />
        
//         {/* Header */}
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
//             <Text style={styles.cancelText}>Cancel</Text>
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Scan Food</Text>
//           <TouchableOpacity onPress={() => router.push("/FoodHistory")} style={styles.historyButton}>
//             <Text style={styles.historyText}>History</Text>
//           </TouchableOpacity>
//         </View>

//         <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
//           {/* Camera Preview Placeholder */}
//           <View style={styles.cameraPlaceholder}>
//             <View style={styles.cameraIconContainer}>
//               <Text style={styles.cameraIcon}>📸</Text>
//             </View>
//             <Text style={styles.cameraPlaceholderText}>
//               Take a photo of your meal
//             </Text>
//             <Text style={styles.cameraSubtext}>
//               AI will analyze acne risk factors
//             </Text>
//           </View>

//           {/* Action Buttons */}
//           <View style={styles.actionButtons}>
//             <TouchableOpacity style={styles.primaryButton} onPress={handleTakePhoto}>
//               <Text style={styles.cameraButtonIcon}>📷</Text>
//               <Text style={styles.primaryButtonText}>Take Photo</Text>
//             </TouchableOpacity>

//             <TouchableOpacity style={styles.secondaryButton} onPress={handleSelectFromGallery}>
//               <Text style={styles.galleryButtonIcon}>🖼️</Text>
//               <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
//             </TouchableOpacity>
//           </View>

//           {/* Tips Section */}
//           <View style={styles.tipsContainer}>
//             <Text style={styles.tipsTitle}>Tips for best results:</Text>
//             <View style={styles.tipsList}>
//               <View style={styles.tipItem}>
//                 <Text style={styles.tipBullet}>•</Text>
//                 <Text style={styles.tipText}>Ensure good lighting</Text>
//               </View>
//               <View style={styles.tipItem}>
//                 <Text style={styles.tipBullet}>•</Text>
//                 <Text style={styles.tipText}>Capture the entire meal</Text>
//               </View>
//               <View style={styles.tipItem}>
//                 <Text style={styles.tipBullet}>•</Text>
//                 <Text style={styles.tipText}>Avoid shadows on food</Text>
//               </View>
//               <View style={styles.tipItem}>
//                 <Text style={styles.tipBullet}>•</Text>
//                 <Text style={styles.tipText}>Hold camera steady</Text>
//               </View>
//             </View>
//           </View>
//         </ScrollView>
//       </SafeAreaView>
//     );
//   }

//   // Photo selected but not analyzed yet
//   if (selectedPhoto && !analysisResult && !isAnalyzing) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <StatusBar barStyle="dark-content" />
        
//         {/* Header */}
//         <View style={styles.header}>
//           <TouchableOpacity onPress={handleRetake} style={styles.cancelButton}>
//             <Text style={styles.cancelText}>Retake</Text>
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Review Photo</Text>
//           <View style={styles.historyButton} />
//         </View>

//         <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
//           {/* Photo Preview */}
//           <View style={styles.photoPreviewContainer}>
//             <Image source={{ uri: selectedPhoto }} style={styles.photoPreview} />
//           </View>

//           {/* Analyze Button */}
//           <TouchableOpacity style={styles.analyzeButton} onPress={handleAnalyzePhoto}>
//             <Text style={styles.analyzeButtonText}>Analyze for Acne Risk</Text>
//             <Text style={styles.analyzeButtonSubtext}>AI-powered food analysis</Text>
//           </TouchableOpacity>

//           <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
//             <Text style={styles.retakeButtonText}>Take Different Photo</Text>
//           </TouchableOpacity>
//         </ScrollView>
//       </SafeAreaView>
//     );
//   }

//   // Analyzing state
//   if (isAnalyzing) {
//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="dark-content" />

//       {/* Background Photo */}
//       <Image source={{ uri: selectedPhoto }} style={StyleSheet.absoluteFill} />

//       {/* Overlay */}
//       <LinearGradient
//         colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
//         style={StyleSheet.absoluteFill}
//       />

//       {/* Fancy Loading Card */}
//       <View style={styles.analyzingOverlay}>
//         <Animated.View style={[styles.loadingCard, cardAnimatedStyle]}>
//           <View style={styles.spinnerWrapper}>
//             <Animated.View style={[styles.ring, ringAnimatedStyle]} />
//             <ActivityIndicator size="large" color="#4F46E5" />
//           </View>

//           <Text style={styles.loadingTitle}>Analyzing your meal</Text>

//           <Animated.Text style={[styles.loadingSubtitle, textAnimatedStyle]}>
//             {messages[messageIndex]}
//           </Animated.Text>
//         </Animated.View>
//       </View>
//     </SafeAreaView>
//   );
// }

//   // Analysis complete
//   if (analysisResult) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <StatusBar barStyle="dark-content" />
        
//         {/* Header */}
//         <View style={styles.header}>
//           <TouchableOpacity onPress={handleRetake} style={styles.cancelButton}>
//             <Text style={styles.cancelText}>Back</Text>
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Analysis Results</Text>
//           <View style={styles.historyButton} />
//         </View>

//         <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
//           {/* Photo Thumbnail */}
//           <View style={styles.thumbnailContainer}>
//             <Image source={{ uri: selectedPhoto }} style={styles.thumbnail} />
//           </View>

//         {/* Updated Food Identification Card */}
//         <View style={styles.resultCard}>
//           <Text style={styles.resultCardTitle}>Identify Food (Edit if incorrect)</Text>
//           <TextInput
//             style={styles.foodNameInput}
//             value={editedFoodName}
//             onChangeText={setEditedFoodName}
//             placeholder="What is this food?"
//             autoCorrect={false}
//           />
//           <Text style={styles.confidenceText}>
//             {analysisResult.confidence}% AI confidence
//           </Text>
          
//           <TouchableOpacity 
//             style={styles.reanalyzeButton} 
//             onPress={handleReanalyze}
//           >
//             <Text style={styles.reanalyzeButtonText}>🔄 Update Analysis</Text>
//           </TouchableOpacity>
//         </View>

//           {/* Acne Risk Score */}
//           <View style={[styles.resultCard, styles.riskCard]}>
//             <Text style={styles.resultCardTitle}>Acne Risk Score</Text>
//             <View style={styles.scoreContainer}>
//               <Text style={styles.scoreNumber}>{analysisResult.acneRiskScore}</Text>
//               <Text style={styles.scoreOutOf}>/100</Text>
//             </View>
//             <View
//               style={[
//                 styles.riskBadge,
//                 { backgroundColor: getRiskColor(analysisResult.riskLevel) + '20' },
//               ]}
//             >
//               <Text
//                 style={[
//                   styles.riskLabel,
//                   { color: getRiskColor(analysisResult.riskLevel) },
//                 ]}
//               >
//                 {analysisResult.riskLevel.toUpperCase()} RISK
//               </Text>
//             </View>
//           </View>

//           {/* Triggers Detected */}
//           <View style={styles.resultCard}>
//             <Text style={styles.resultCardTitle}>Triggers Detected</Text>
//             {analysisResult.triggers.map((trigger, index) => (
//               <View key={index} style={styles.triggerItem}>
//                 <Text style={styles.triggerBullet}>
//                   {trigger === 'None detected' ? '✓' : '⚠️'}
//                 </Text>
//                 <Text
//                   style={[
//                     styles.triggerText,
//                     trigger === 'None detected' && styles.triggerTextGood,
//                   ]}
//                 >
//                   {trigger}
//                 </Text>
//               </View>
//             ))}
//           </View>

//           {/* Recommendations */}
//           <View style={styles.resultCard}>
//             <Text style={styles.resultCardTitle}>Recommendations</Text>
//             {analysisResult.recommendations.map((rec, index) => (
//               <View key={index} style={styles.recommendationItem}>
//                 <Text style={styles.recommendationBullet}>💡</Text>
//                 <Text style={styles.recommendationText}>{rec}</Text>
//               </View>
//             ))}
//           </View>

//           {/* Save Button */}
//           <TouchableOpacity style={styles.saveButton} onPress={handleSaveLog}>
//             <Text style={styles.saveButtonText}>Save</Text>
//           </TouchableOpacity>

//           <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
//             <Text style={styles.retakeButtonText}>Log Different Meal</Text>
//           </TouchableOpacity>
//         </ScrollView>
//       </SafeAreaView>
//     );
//   }

//   return null;
// }

// const getStyles = (colors: any) =>
//   StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: colors.background,
//     },
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 20,
//       paddingVertical: 16,
//       backgroundColor: colors.card,
//       borderBottomWidth: 1,
//       borderBottomColor: colors.border,
//     },
//     cancelButton: {
//       width: 70,
//     },
//     cancelText: {
//       fontSize: 16,
//       color: colors.subtext,
//     },
//     headerTitle: {
//       fontSize: 18,
//       fontWeight: '600',
//       color: colors.text,
//     },
//     historyButton: {
//       width: 70,
//       alignItems: 'flex-end',
//     },
//     historyText: {
//       fontSize: 16,
//       color: colors.primary,
//       fontWeight: '500',
//     },
//     content: {
//       flex: 1,
//     },
//     contentContainer: {
//       padding: 20,
//       paddingBottom: 40,
//     },
//     cameraPlaceholder: {
//       backgroundColor: colors.isDarkMode ? '#111827' : '#1F2937',
//       borderRadius: 16,
//       height: 400,
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginBottom: 24,
//     },
//     cameraIconContainer: {
//       width: 80,
//       height: 80,
//       borderRadius: 40,
//       backgroundColor: 'rgba(255, 255, 255, 0.1)',
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginBottom: 16,
//     },
//     cameraIcon: {
//       fontSize: 40,
//     },
//     cameraPlaceholderText: {
//       fontSize: 18,
//       fontWeight: '600',
//       color: '#FFFFFF',
//       marginBottom: 8,
//     },
//     cameraSubtext: {
//       fontSize: 14,
//       color: '#D1D5DB',
//     },
//     actionButtons: {
//       gap: 12,
//       marginBottom: 32,
//     },
//     primaryButton: {
//       backgroundColor: colors.primary,
//       borderRadius: 12,
//       padding: 18,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'center',
//       gap: 8,
//     },
//     cameraButtonIcon: {
//       fontSize: 20,
//     },
//     primaryButtonText: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: '#FFFFFF',
//     },
//     secondaryButton: {
//       backgroundColor: colors.card,
//       borderRadius: 12,
//       padding: 18,
//       borderWidth: 2,
//       borderColor: colors.primary,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'center',
//       gap: 8,
//     },
//     galleryButtonIcon: {
//       fontSize: 20,
//     },
//     secondaryButtonText: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: colors.primary,
//     },
//     tipsContainer: {
//       backgroundColor: colors.card,
//       borderRadius: 12,
//       padding: 20,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     tipsTitle: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: colors.text,
//       marginBottom: 12,
//     },
//     tipsList: {
//       gap: 8,
//     },
//     tipItem: {
//       flexDirection: 'row',
//       alignItems: 'flex-start',
//       gap: 8,
//     },
//     tipBullet: {
//       fontSize: 16,
//       color: colors.primary,
//       marginTop: 2,
//     },
//     tipText: {
//       flex: 1,
//       fontSize: 14,
//       color: colors.subtext,
//       lineHeight: 20,
//     },
//     photoPreviewContainer: {
//       borderRadius: 16,
//       overflow: 'hidden',
//       marginBottom: 24,
//       shadowColor: '#000',
//       shadowOffset: { width: 0, height: 4 },
//       shadowOpacity: 0.1,
//       shadowRadius: 12,
//       elevation: 4,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     photoPreview: {
//       width: '100%',
//       height: 400,
//       backgroundColor: colors.surface,
//     },
//     analyzeButton: {
//       backgroundColor: colors.primary,
//       borderRadius: 12,
//       padding: 20,
//       alignItems: 'center',
//       marginBottom: 12,
//     },
//     analyzeButtonText: {
//       fontSize: 18,
//       fontWeight: '600',
//       color: '#FFFFFF',
//       marginBottom: 4,
//     },
//     analyzeButtonSubtext: {
//       fontSize: 13,
//       color: colors.isDarkMode ? '#E0E7FF' : '#C7D2FE',
//     },
//     retakeButton: {
//       backgroundColor: colors.card,
//       borderRadius: 12,
//       padding: 18,
//       alignItems: 'center',
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     retakeButtonText: {
//       fontSize: 16,
//       fontWeight: '500',
//       color: colors.subtext,
//     },
//     analyzingOverlay: {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       backgroundColor: 'rgba(0, 0, 0, 0.7)',
//       justifyContent: 'center',
//       alignItems: 'center',
//       borderRadius: 16,
//     },
//     analyzingText: {
//       fontSize: 20,
//       fontWeight: '600',
//       color: '#FFFFFF',
//       marginTop: 16,
//     },
//     analyzingSubtext: {
//       fontSize: 14,
//       color: '#D1D5DB',
//       marginTop: 8,
//     },
//     thumbnailContainer: {
//       borderRadius: 12,
//       overflow: 'hidden',
//       marginBottom: 20,
//       height: 200,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     resultCard: {
//       backgroundColor: colors.card,
//       borderRadius: 12,
//       padding: 20,
//       marginBottom: 12,
//       shadowColor: '#000',
//       shadowOffset: { width: 0, height: 1 },
//       shadowOpacity: 0.05,
//       shadowRadius: 4,
//       elevation: 1,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     resultCardTitle: {
//       fontSize: 14,
//       fontWeight: '600',
//       color: colors.subtext,
//       marginBottom: 12,
//       textTransform: 'uppercase',
//       letterSpacing: 0.5,
//     },
//     foodName: {
//       fontSize: 24,
//       fontWeight: '700',
//       color: colors.text,
//       marginBottom: 4,
//     },
//     confidenceText: {
//       fontSize: 14,
//       color: '#10B981',
//       fontWeight: '500',
//     },
//     scoreNumber: {
//       fontSize: 48,
//       fontWeight: '700',
//       color: colors.text,
//     },
//     scoreOutOf: {
//       fontSize: 20,
//       fontWeight: '400',
//       color: colors.subtext,
//     },
//     triggerText: {
//       flex: 1,
//       fontSize: 15,
//       color: '#EF4444',
//       lineHeight: 22,
//     },
//     triggerTextGood: {
//       color: '#10B981',
//     },
//     recommendationText: {
//       flex: 1,
//       fontSize: 15,
//       color: colors.text,
//       lineHeight: 22,
//     },
//     saveButton: {
//       backgroundColor: '#10B981',
//       borderRadius: 12,
//       padding: 20,
//       alignItems: 'center',
//       marginTop: 8,
//       marginBottom: 12,
//     },
//     saveButtonText: {
//       fontSize: 18,
//       fontWeight: '600',
//       color: '#FFFFFF',
//     },
//     loadingCard: {
//       backgroundColor: colors.card,
//       paddingVertical: 32,
//       paddingHorizontal: 40,
//       borderRadius: 18,
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOpacity: 0.06,
//       shadowRadius: 12,
//       elevation: 5,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     ring: {
//       position: 'absolute',
//       width: 64,
//       height: 64,
//       borderRadius: 32,
//       borderWidth: 2,
//       borderColor: colors.isDarkMode ? colors.primary : '#C7D2FE',
//       borderTopColor: 'transparent',
//     },
//     loadingTitle: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: colors.text,
//       marginTop: 8,
//     },
//     loadingSubtitle: {
//       fontSize: 13,
//       color: colors.subtext,
//       marginTop: 6,
//       textAlign: 'center',
//     },
//     foodNameInput: {
//       fontSize: 22,
//       fontWeight: '700',
//       color: colors.text,
//       marginBottom: 4,
//       borderBottomWidth: 1,
//       borderBottomColor: colors.border,
//       paddingVertical: 4,
//     },
//     reanalyzeButton: {
//       marginTop: 12,
//       backgroundColor: colors.surface,
//       paddingVertical: 8,
//       paddingHorizontal: 12,
//       borderRadius: 8,
//       alignSelf: 'flex-start',
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     reanalyzeButtonText: {
//       color: colors.primary,
//       fontWeight: '600',
//       fontSize: 14,
//     },
//     recommendationItem: {
//       flexDirection: 'row',
//       alignItems: 'flex-start',
//       gap: 8,
//       marginBottom: 12,
//     },
//     recommendationBullet: {
//       fontSize: 16,
//       marginTop: 2,
//     },
//     triggerItem: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     gap: 8,
//     marginBottom: 8,
//   },
//   triggerBullet: {
//     fontSize: 16,
//     marginTop: 2,
//   },

//   riskBadge: {
//     alignSelf: 'flex-start',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 8,
//   },
//   riskLabel: {
//     fontSize: 13,
//     fontWeight: '700',
//     letterSpacing: 0.5,
//   },

//     scoreContainer: {
//     flexDirection: 'row',
//     alignItems: 'baseline',
//     marginBottom: 12,
//   },

//     thumbnail: {
//     width: '100%',
//     height: '100%',
//   },
//     spinnerWrapper: {
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//     riskCard: {
//     borderLeftWidth: 4,
//   },
//   });


  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  // Initial state: No photo selected
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
          <Text style={styles.headerTitle}>Scan Food</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/FoodHistory")} style={styles.historyButton}>
            <Text style={styles.historyText}>History</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Camera Preview Placeholder */}
          <View style={styles.cameraPlaceholder}>
            <View style={styles.cameraIconContainer}>
              <Text style={styles.cameraIcon}>📸</Text>
            </View>
            <Text style={styles.cameraPlaceholderText}>
              Take a photo of your meal
            </Text>
            <Text style={styles.cameraSubtext}>
              AI will analyze acne risk factors
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleTakePhoto}>
              <Text style={styles.buttonIcon}>📷</Text>
              <Text style={styles.primaryButtonText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleSelectFromGallery}>
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
                <Text style={styles.tipText}>Ensure good lighting</Text>
              </View>
              <View style={styles.tipItem}>
                <Text style={styles.tipBullet}>🍽️</Text>
                <Text style={styles.tipText}>Capture the entire meal</Text>
              </View>
              <View style={styles.tipItem}>
                <Text style={styles.tipBullet}>🚫</Text>
                <Text style={styles.tipText}>Avoid shadows on food</Text>
              </View>
              <View style={styles.tipItem}>
                <Text style={styles.tipBullet}>📐</Text>
                <Text style={styles.tipText}>Hold camera steady</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Photo selected but not analyzed yet
  if (selectedPhoto && !analysisResult && !isAnalyzing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleRetake} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Retake</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Photo</Text>
          <View style={styles.historyButton} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Photo Preview */}
          <View style={styles.photoPreviewContainer}>
            <Image source={{ uri: selectedPhoto }} style={styles.photoPreview} />
          </View>

          {/* Analyze Button */}
          <TouchableOpacity style={styles.analyzeButton} onPress={handleAnalyzePhoto}>
            <Text style={styles.analyzeButtonText}>Analyze for Acne Risk</Text>
            <Text style={styles.analyzeButtonSubtext}>AI-powered food analysis</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
            <Text style={styles.retakeButtonText}>Take Different Photo</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Analyzing state
  if (isAnalyzing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

        {/* Background Photo */}
        <Image source={{ uri: selectedPhoto }} style={StyleSheet.absoluteFill} />

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

            <Text style={styles.loadingTitle}>Analyzing your meal</Text>

            <Animated.Text style={[styles.loadingSubtitle, textAnimatedStyle]}>
              {messages[messageIndex]}
            </Animated.Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // Analysis complete
  if (analysisResult) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace("/Home")} style={styles.cancelButton}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>

          <Text style={styles.headerTitle}>Analysis Results</Text>
          <View style={styles.historyButton} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Photo Thumbnail */}
          <View style={styles.thumbnailContainer}>
            <Image source={{ uri: selectedPhoto }} style={styles.thumbnail} />
          </View>

          {/* Updated Food Identification Card */}
          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>Identify Food (Edit if incorrect)</Text>
            <TextInput
              style={styles.foodNameInput}
              value={editedFoodName}
              onChangeText={setEditedFoodName}
              placeholder="What is this food?"
              placeholderTextColor={colors.subtext}
              autoCorrect={false}
            />
            <Text style={styles.confidenceText}>
              {analysisResult.confidence}% AI confidence
            </Text>

            <TouchableOpacity
              style={styles.reanalyzeButton}
              onPress={handleReanalyze}
            >
              <Text style={styles.reanalyzeButtonText}>🔄 Update Analysis</Text>
            </TouchableOpacity>
          </View>

          {/* Acne Risk Score */}
          <View style={[styles.resultCard, styles.riskCard]}>
            <Text style={styles.resultCardTitle}>Acne Risk Score</Text>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreNumber}>{analysisResult.acneRiskScore}</Text>
              <Text style={styles.scoreOutOf}>/100</Text>
            </View>
            <View
              style={[
                styles.riskBadge,
                { backgroundColor: getRiskColor(analysisResult.riskLevel) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.riskLabel,
                  { color: getRiskColor(analysisResult.riskLevel) },
                ]}
              >
                {analysisResult.riskLevel.toUpperCase()} RISK
              </Text>
            </View>
          </View>

          {/* Triggers Detected */}
          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>Triggers Detected</Text>
            {analysisResult.triggers.map((trigger, index) => (
              <View key={index} style={styles.triggerItem}>
                <Text style={styles.triggerBullet}>
                  {trigger === 'None detected' ? '✓' : '⚠️'}
                </Text>
                <Text
                  style={[
                    styles.triggerText,
                    trigger === 'None detected' && styles.triggerTextGood,
                  ]}
                >
                  {trigger}
                </Text>
              </View>
            ))}
          </View>

          {/* Recommendations */}
          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>Recommendations</Text>
            {analysisResult.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationBullet}>💡</Text>
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveLog} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
            <Text style={styles.retakeButtonText}>Log Different Meal</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const getStyles = (colors: any, isDarkMode: boolean) =>
  StyleSheet.create({
    // container: {
    //   flex: 1,
    //   backgroundColor: colors.background,
    // },
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
    cancelButton: {
      width: 70,
    },
    closeText: { 
      fontSize: 16, 
      color: colors.subtext, 
      fontWeight: '500' 
    },

    // cancelText: {
    //   fontSize: 16,
    //   color: colors.subtext,
    //   fontWeight: '500',
    // },
    // headerTitle: {
    //   fontSize: 18,
    //   fontWeight: '600',
    //   color: colors.text,
    // },
    historyButton: {
      width: 70,
      alignItems: 'flex-end',
    },
    // historyText: {
    //   fontSize: 16,
    //   color: colors.primary,
    //   fontWeight: '500',
    // },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
      paddingBottom: 40,
    },
    // cameraPlaceholder: {
    //   backgroundColor: isDarkMode ? '#1F2937' : '#343f50ff',
    //   borderRadius: 16,
    //   height: 400,
    //   justifyContent: 'center',
    //   alignItems: 'center',
    //   marginBottom: 24,
    // },
    // cameraIconContainer: {
    //   width: 80,
    //   height: 80,
    //   borderRadius: 40,
    //   backgroundColor: 'rgba(255, 255, 255, 0.1)',
    //   justifyContent: 'center',
    //   alignItems: 'center',
    //   marginBottom: 16,
    // },
    cameraIcon: {
      fontSize: 40,
    },
    // cameraPlaceholderText: {
    //   fontSize: 18,
    //   fontWeight: '600',
    //   color: '#FFFFFF',
    //   marginBottom: 8,
    // },
    cameraSubtext: {
      fontSize: 14,
      color: colors.textMuted,
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
    buttonIcon: {
      fontSize: 20,
    },
    // primaryButtonText: {
    //   fontSize: 16,
    //   fontWeight: '600',
    //   color: '#FFFFFF',
    // },
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
    // secondaryButtonText: {
    //   fontSize: 16,
    //   fontWeight: '600',
    //   color: colors.primary,
    // },
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
    tipsList: {
      flexWrap: 'wrap',
      flexDirection: 'row',
      gap: 6,
    },
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
    analyzeButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 20,
      alignItems: 'center',
      marginBottom: 12,
    },
    analyzeButtonText: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    analyzeButtonSubtext: {
      fontSize: 13,
      color: isDarkMode ? '#E0E7FF' : '#C7D2FE',
    },
    retakeButton: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 18,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    retakeButtonText: {
      fontSize: 19,
      fontWeight: '700',
      color: colors.subtext,
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
    thumbnailContainer: {
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 20,
      height: 200,
      borderWidth: 1,
      borderColor: colors.border,
    },
    // resultCard: {
    //   backgroundColor: colors.card,
    //   borderRadius: 12,
    //   padding: 20,
    //   marginBottom: 12,
    //   shadowColor: '#000',
    //   shadowOffset: { width: 0, height: 1 },
    //   shadowOpacity: 0.05,
    //   shadowRadius: 4,
    //   elevation: 1,
    //   borderWidth: 1,
    //   borderColor: colors.border,
    // },
    resultCardTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.subtext,
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    // foodNameInput: {
    //   fontSize: 22,
    //   fontWeight: '700',
    //   color: colors.text,
    //   marginBottom: 4,
    //   borderBottomWidth: 1,
    //   borderBottomColor: colors.border,
    //   paddingVertical: 4,
    // },
    confidenceText: {
      fontSize: 14,
      color: '#10B981',
      fontWeight: '500',
    },
    reanalyzeButton: {
      marginTop: 12,
      backgroundColor: colors.surface,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: colors.border,
    },
    reanalyzeButtonText: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 14,
    },
    scoreContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 12,
    },
    // scoreNumber: {
    //   fontSize: 48,
    //   fontWeight: '700',
    //   color: colors.text,
    // },
    // scoreOutOf: {
    //   fontSize: 20,
    //   fontWeight: '400',
    //   color: colors.subtext,
    // },
    riskBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    riskLabel: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    triggerItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 8,
    },
    triggerBullet: {
      fontSize: 16,
      marginTop: 2,
    },
    triggerText: {
      flex: 1,
      fontSize: 15,
      color: '#EF4444',
      lineHeight: 22,
    },
    triggerTextGood: {
      color: '#10B981',
    },
    recommendationItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 12,
    },
    recommendationBullet: {
      fontSize: 16,
      marginTop: 2,
    },
    recommendationText: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
    },
    // saveButton: {
    //   backgroundColor: '#10B981',
    //   borderRadius: 12,
    //   padding: 20,
    //   alignItems: 'center',
    //   marginTop: 8,
    //   marginBottom: 12,
    // },
    // saveButtonText: {
    //   fontSize: 18,
    //   fontWeight: '600',
    //   color: '#FFFFFF',
    // },
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
    loadingSubtitle: {
      fontSize: 13,
      color: colors.subtext,
      marginTop: 6,
      textAlign: 'center',
    },
    thumbnail: {
      width: '100%',
      height: '100%',
    },
    spinnerWrapper: {
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    // riskCard: {
    //   borderLeftWidth: 4,
    // },
    // --- Upgrade ---
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? "#121212" : "#F8FAFC", 
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background,
      marginHorizontal: 16,
      marginTop: 10,
      borderRadius: 24,
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
      color: colors.text,
      letterSpacing: -0.5,
    },
    cancelText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#EF4444',
    },
    historyText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primary,
    },

    cameraPlaceholder: {
      backgroundColor: colors.primary + '10',
      borderRadius: 40,
      height: 380,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 30,
      borderWidth: 2,
      borderColor: colors.primary + '30',
      borderStyle: 'dashed',
    },
    cameraIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      transform: [{ rotate: '-5deg' }], 
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
    },
    cameraPlaceholderText: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.text,
      textAlign: 'center',
    },

    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 22,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    primaryButtonText: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    secondaryButton: {
      backgroundColor: isDarkMode ? colors.card : '#eaeaeaff',
      borderRadius: 22,
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },

    resultCard: {
      backgroundColor: isDarkMode ? colors.card : '#FFFFFF',
      borderRadius: 28,
      padding: 24,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isDarkMode ? 0.3 : 0.08,
      shadowRadius: 20,
      elevation: 8,
    },
    riskCard: {
      backgroundColor: colors.card, 
    },
    scoreNumber: {
      fontSize: 64, 
      fontWeight: '700',
      color: colors.text,
      lineHeight: 70,
    },
    scoreOutOf: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.subtext,
    },
    // foodNameInput: {
    //   fontSize: 28,
    //   fontWeight: '900',
    //   color: colors.primary,
    //   paddingVertical: 10,
    // },
    foodNameInput: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 4,
    },

  tipsContainer: {
    backgroundColor: isDarkMode ? '#1E293B' : '#EEF2FF',
    borderRadius: 24,
    padding: 15,
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

    // analyzingOverlay: {
    //     ...StyleSheet.absoluteFillObject,
    //     backgroundColor: colors.primary, 
    //     justifyContent: 'center',
    //     alignItems: 'center',
    // },
    loadingCard: {
        backgroundColor: isDarkMode ? '#262b33ff' : '#FFFFFF',
        padding: 40,
        borderRadius: 48,
        alignItems: 'center',
        width: '85%',
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    loadingTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: isDarkMode ? '#bdbdbdff' : "#000",
        marginTop: 20,
        textAlign: 'center',
    },

    saveButton: {
      backgroundColor: '#10B981', 
      borderRadius: 24,
      padding: 18,
      alignItems: 'center',
      marginTop: 0,
      marginBottom: 12,
    },
    saveButtonText: {
      fontSize: 19,
      fontWeight: '700',
      color: '#FFFFFF',
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

