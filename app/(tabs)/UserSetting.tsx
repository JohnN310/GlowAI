import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc
} from 'firebase/firestore';

import { auth, db } from '../../FirebaseConfig';
import { useTheme } from '../theme/ThemeContext';

import { SafeAreaView } from 'react-native-safe-area-context';


if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
interface CollapsibleProps {
  title: string;
  icon: any;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

interface SingleSelectProps {
  options: string[];
  selected: string;
  onChange: (selected: string) => void;
}

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

const sections = ['skinProfile', 'lifestyle', 'notifications', 'privacy', 'account'] as const;

type SectionKey = typeof sections[number];

// function CollapsibleSection({ title, icon, children, defaultOpen = true, badge }: CollapsibleProps) {
//   const [open, setOpen] = useState(defaultOpen);
//   const { colors } = useTheme();
//   const styles = getStyles(colors);
//   const toggle = () => {
//     LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
//     setOpen(!open);
//   };

//   return (
//     <View style={styles.card}>
//       <Pressable style={styles.sectionHeader} onPress={toggle}>
//         <View style={styles.sectionLeft}>
//           <View style={styles.iconCircle}>
//             <Ionicons name={icon} size={18} color="#4F46E5" />
//           </View>
//           <Text style={styles.sectionTitle}>{title}</Text>
//           {badge && (
//             <View style={styles.badgeContainer}>
//                <Text style={styles.badge}>{badge}</Text>
//             </View>
//           )}
//         </View>
//         <Ionicons
//           name={open ? 'chevron-up' : 'chevron-down'}
//           size={20}
//           color="#94A3B8"
//         />
//       </Pressable>

//       {open && <View style={styles.collapsibleContent}>{children}</View>}
//     </View>
//   );
// }


// function MultiSelectChips({ options, selected, onChange }: MultiSelectProps) {
//   const { colors, isDarkMode } = useTheme();
//   const styles = getStyles(colors);
//   return (
//     <View style={styles.chipContainer}>
//       {options.map((opt) => {
//         const isSelected = selected.includes(opt);
//         return (
//           <Pressable
//             key={opt}
//             onPress={() =>
//               onChange(
//                 isSelected
//                   ? selected.filter((x) => x !== opt)
//                   : [...selected, opt]
//               )
//             }
//             style={[styles.chip, isSelected && styles.chipSelected]}
//           >
//             <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
//               {opt}
//             </Text>
//           </Pressable>
//         );
//       })}
//     </View>
//   );
// }

// /* Single Select */

// function SingleSelect({ options, selected, onChange }: SingleSelectProps) {
//   const { colors, isDarkMode } = useTheme();
//   const styles = getStyles(colors);
//   return (
//     <View style={{ gap: 10 }}>
//       {options.map((opt) => (
//         <Pressable
//           key={opt}
//           onPress={() => onChange(opt)}
//           style={[
//             styles.singleOption,
//             selected === opt && styles.singleOptionSelected,
//           ]}
//         >
//           <Text
//             style={[
//               styles.singleText,
//               selected === opt && { color: 'white', fontWeight: '600' },
//             ]}
//           >
//             {opt}
//           </Text>
//           {selected === opt && <Ionicons name="checkmark" size={18} color="white" />}
//         </Pressable>
//       ))}
//     </View>
//   );
// }

// /* Toggle Row */
// function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
//   const { colors } = useTheme();
//   const styles = getStyles(colors);
//   return (
//     <View style={styles.toggleRow}>
//       <View style={{ flex: 1 }}>
//         <Text style={styles.toggleLabel}>{label}</Text>
//         {description && <Text style={styles.toggleDesc}>{description}</Text>}
//       </View>
//       <Switch 
//         value={value} 
//         onValueChange={onChange}
//         trackColor={{ false: "#E2E8F0", true: "#C7D2FE" }} 
//         thumbColor={value ? "#4F46E5" : "#F4F4F5"}      
//       />
//     </View>
//   );
// }


export default function ProfileSettingsScreen() {


  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    skinProfile: true,
    lifestyle: true,
    notifications: true,
    privacy: true,
    account: true,
  });


  const [acneTypes, setAcneTypes] = useState<string[]>([]);
  const [severity, setSeverity] = useState<string | null>(null);
  const [areas, setAreas] = useState<string[]>([]);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [skinType, setSkinType] = useState<string | null>('Oily'); 
  

  const [sleep, setSleep] = useState(60);
  const [stress, setStress] = useState(50);
  const [darkMode, setDarkMode] = useState(false);
  const [showConfidence, setShowConfidence] = useState(true);
  const [notifications, setNotifications] = useState({
    risk: true,
    food: true,
    scan: false,
    milestone: true,
  });

  const { colors, isDarkMode, toggleTheme  } = useTheme();
      
  const styles = getStyles(colors, isDarkMode);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [initialData, setInitialData] = useState<any>(null);

  const [displayName, setDisplayName] = useState('Your Name');
  const [avatarIcon, setAvatarIcon] = useState<any>('person');
  const [isAvatarModalVisible, setAvatarModalVisible] = useState(false);

  const AVAILABLE_AVATARS = [
    'person', 'sunny', 'moon', 'leaf', 'water', 'flower', 
    'star', 'heart', 'flash', 'rose', 'paw', 'planet'
  ];

  const [themeColor, setThemeColor] = useState('#4F46E5'); 

  const PRESET_COLORS = [
    '#4F46E5', 
    '#EC4899', 
    '#8B5CF6', 
    '#06B6D4', 
    '#10B981', 
    '#F59E0B', 
    '#EF4444', 
    '#64748B', 
  ];

  const navigation = useNavigation();
  const router = useRouter();

  const stateRef = useRef({
    skinType,
    acneTypes,
    severity,
    areas,
    themeColor,
    displayName,   
    avatarIcon, 
    triggers,
    sleep,
    stress,
    notifications,
    darkMode,
    showConfidence,
  });


  
  useEffect(() => {
  stateRef.current = {
  skinType,
  acneTypes,
  severity,
  areas,
  themeColor,
  displayName,   
  avatarIcon, 
  triggers,
  sleep,
  stress,
  notifications,
  darkMode,
  showConfidence,
  };
}, [    
  skinType,
  acneTypes,
  severity,
  areas,
  themeColor,
  displayName,   
  avatarIcon, 
  triggers,
  sleep,
  stress,
  notifications,
  darkMode,
  showConfidence,]);

  // Fetch from firestore
useFocusEffect(
  useCallback(() => {
    let isActive = true;
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (isActive) {
          setSkinType(data.skinType || 'Oily');
          // setAcneTypes(data.acneTypes || []);
          // setSeverity(data.severity || 'Moderate');
          // setAreas(data.proneAreas || []);
          setTriggers(data.triggers || []);
          setSleep(data.sleepValue ?? 60);
          setStress(data.stressValue ?? 50);
          if (data.notifications) setNotifications(data.notifications);
          const firestoreDarkMode = data.darkMode || false;
          setDarkMode(firestoreDarkMode);
          if (firestoreDarkMode !== isDarkMode) {
            toggleTheme();
          }
          setShowConfidence(data.showConfidence ?? true);
          setDisplayName(data.displayName);
          setAvatarIcon(data.avatarIcon);
          setThemeColor(data.themeColor);
          }
        }
        const scansRef = collection(db, "users", user.uid, "acneScans");
        const recentScanQuery = query(
          scansRef, 
          orderBy("timestamp", "desc"), 
          limit(1)
        );
        
        const scanSnap = await getDocs(recentScanQuery);
        const latestScan = !scanSnap.empty ? scanSnap.docs[0].data() : {};

        let mappedAcneTypes: string[] = [];
        if (!scanSnap.empty) {
          const latestScan = scanSnap.docs[0].data();

          setSeverity(latestScan.severity || 'Moderate');
          setAreas(latestScan.region || []); 
          // console.log("Latest scan data loaded:", latestScan.severity);

          if (latestScan.detectedAcne && Array.isArray(latestScan.detectedAcne)) {
            const mappedTypes = latestScan.detectedAcne
                .filter((item: any) => item.count > 0) 
                .map((item: any) => {
                  const type = item.type.toLowerCase();
                  if (type === 'comedone') return 'Comedones';
                  return type.charAt(0).toUpperCase() + type.slice(1) + 's';
                });
            
            setAcneTypes([...new Set(mappedTypes)] as string[]);
            mappedAcneTypes = [...new Set(mappedTypes)];
        }
      }

      const userData = docSnap.exists() ? docSnap.data() : {};
      const loadedData = {
        skinType: userData.skinType || 'Oily',
        acneTypes: mappedAcneTypes,
        severity: latestScan.severity || '',
        areas: latestScan.region || [], 
        triggers: userData.triggers || [],
        sleep: userData.sleepValue || 60,
        stress: userData.stressValue || 50,
        notifications: userData.notifications || { risk: true, food: true, scan: false, milestone: true },
        darkMode: userData.darkMode || false,
        showConfidence: userData.showConfidence ?? true,
        displayName: userData.displayName || 'Your Name',
        avatarIcon: userData.avatarIcon || 'person',
        themeColor: userData.themeColor || '#4F46E5'
      };

      setInitialData(loadedData);
      stateRef.current = structuredClone(loadedData);
      
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setIsLoading(false);
      }

    };

    fetchProfile();
    return () => {
      isActive = false;
    };
  }, [])
);
  const handleSave = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    const currentData = stateRef.current;

    if (!initialData || !hasUnsavedChanges(currentData)) {
      console.log("No changes detected. Firebase write skipped.");
      return;
    }

    try {
      const profileData = {
        skinType: currentData.skinType,
        themeColor: currentData.themeColor,
        displayName: currentData.displayName,
        avatarIcon: currentData.avatarIcon,
        triggers: currentData.triggers,
        sleepValue: currentData.sleep,
        stressValue: currentData.stress,
        notifications: currentData.notifications,
        darkMode: currentData.darkMode,
        showConfidence: currentData.showConfidence,

      };

      await setDoc(doc(db, "users", user.uid), profileData, { merge: true });

      setInitialData(structuredClone(stateRef.current));
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  }, [initialData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', handleSave);
    return unsubscribe;
  }, [navigation, handleSave]);

  const hasUnsavedChanges = (currentData: any) => {
  if (!initialData) return false;

  const arraysMatch = (a: any, b: any) => {
    const arrA = Array.isArray(a) ? [...a].sort() : [];
    const arrB = Array.isArray(b) ? [...b].sort() : [];
    
    return (
      arrA.length === arrB.length && 
      arrA.every((val, index) => val === arrB[index])
    );
  };
  // console.log("Comparing Display Name:", currentData.displayName, "vs", initialData.displayName);
  // console.log("Comparing Sleep:", currentData.sleep, "vs", initialData.sleep);

  return (
    currentData.displayName !== initialData.displayName ||
    currentData.avatarIcon !== initialData.avatarIcon ||
    currentData.themeColor !== initialData.themeColor ||
    currentData.skinType !== initialData.skinType ||
    currentData.severity !== initialData.severity ||
    currentData.sleep !== initialData.sleep ||
    currentData.stress !== initialData.stress ||
    currentData.darkMode !== initialData.darkMode ||
    currentData.showConfidence !== initialData.showConfidence ||
    !arraysMatch(currentData.acneTypes, initialData.acneTypes) ||
    !arraysMatch(currentData.areas, initialData.areas) ||
    !arraysMatch(currentData.triggers, initialData.triggers) ||

    currentData.notifications?.risk !== initialData.notifications?.risk ||
    currentData.notifications?.food !== initialData.notifications?.food ||
    currentData.notifications?.scan !== initialData.notifications?.scan ||
    currentData.notifications?.milestone !== initialData.notifications?.milestone
  );
  };


  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ marginTop: 10, color: '#64748B' }}>Loading Profile...</Text>
      </View>
    );
  }

//   const getSleepLabel = (val: number) => {
//   if (val > 80) return "Excellent";
//   if (val > 60) return "Good";
//   if (val > 40) return "Fair";
//   return "Poor";
// };

//   const getStressLabel = (val: number) => {
//     if (val > 80) return "High";
//     if (val > 40) return "Moderate";
//     return "Low";
//   };

  const getSleepBadge = (sleep: number) => {
    if (sleep === 0) return { label: 'Severe Risk', color: '#B91C1C' };
    if (sleep <= 20) return { label: 'Very Low', color: '#EF4444' };
    if (sleep <= 40) return { label: 'Low', color: '#F87171' };
    if (sleep <= 60) return { label: 'Moderate', color: '#FBBF24' };
    if (sleep <= 80) return { label: 'Good', color: '#34D399' };
    return { label: 'Excellent', color: '#10B981' };
  };

  const getStressBadge = (stress: number) => {
    if (stress === 100) return { label: 'Extreme', color: '#B91C1C' };
    if (stress >= 80) return { label: 'High', color: '#EF4444' };
    if (stress >= 60) return { label: 'Moderate', color: '#FBBF24' };
    if (stress >= 40) return { label: 'Low', color: '#34D399' };
    return { label: 'Minimal', color: '#10B981' };
  };

    const toggleSection = (section: SectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

//   return (
//     <ScrollView 
//       style={styles.container} 
//       contentContainerStyle={styles.scrollContent}
//       showsVerticalScrollIndicator={false}
//     >

//     <View style={styles.header}>
//       {/* Tap Avatar to change Icon */}
    
//     <Pressable 
//       onPress={() => setAvatarModalVisible(true)} 
//       style={[styles.avatar, { backgroundColor: themeColor }]} 
//     >
//       <Ionicons name={avatarIcon} size={28} color="white" />
//       <View style={styles.editBadge}>
//         <Ionicons name="pencil" size={10} color="white" />
//       </View>
//     </Pressable>

//       {/* Tap Name to edit Text */}
//         <TextInput
//           style={styles.headerTitleInput}
//           value={displayName}
//           onChangeText={setDisplayName}
//           placeholder="Enter your name..."
//           placeholderTextColor="#94A3B8"
//           maxLength={20}
//         />


//       <Text style={styles.headerSub}>Personalize your skin journey</Text>
//     </View>

//       {/* Skin Profile Section */}
//       <CollapsibleSection
//         title="Skin Profile"
//         icon="sparkles"
//         badge="AI Powered"
//         defaultOpen={true}
//       >
//         <View style={{ gap: 16 }}>
//           {/* Editable: Skin Type */}
//           <View>
//             <Text style={styles.sectionLabel}>Your Skin Type</Text>

//             <SingleSelect
//               options={['Oily', 'Dry', 'Combination', 'Sensitive']}
//               selected={skinType || ''}
//               onChange={setSkinType}
//             />

//             <Text style={styles.helperText}>
//               Select the skin type that best describes you
//             </Text>
//           </View>

//           {/* Divider */}
//           <View style={styles.divider} />

//           {/* Read-only: AI Detected Data */}
//           <View style={styles.aiCard}>
//             {/* Header */}
//             <View style={styles.aiHeader}>
//               <Ionicons name="sparkles" size={14} color="#FB7185" />
//               <Text style={styles.aiHeaderText}>
//                 AI-Detected from Your Latest Scan
//               </Text>
//             </View>

//             {/* Scanned Acne Types */}
//             <View style={styles.aiBlock}>
//               <Text style={styles.aiLabel}>Acne Type{acneTypes.length > 1 ? 's' : ''} Detected</Text>

//               <View style={styles.chipsWrap}>
//                 {acneTypes?.length > 0 ? (
//                   acneTypes.map((type) => (
//                     <View key={type} style={styles.aiChip}>
//                       <Text style={styles.aiChipText}>{type}</Text>
//                     </View>
//                   ))
//                 ) : (
//                   <View style={styles.fallbackChip}>
//                     <Text style={styles.fallbackText}>Not detected yet</Text>
//                   </View>
//                 )}
//               </View>
//             </View>

//             {/* Typical Severity */}
//             <View style={styles.aiBlock}>
//               <Text style={styles.aiLabel}>Severity</Text>

//               {severity ? (
//                 <View style={styles.aiChip}>
//                   <Text style={styles.aiChipText}>{severity}</Text>
//                 </View>
//               ) : (
//                 <View style={styles.fallbackChip}>
//                   <Text style={styles.fallbackText}>Not detected yet</Text>
//                 </View>
//               )}
//             </View>

//             {/* Scanned Areas */}
//             <View style={styles.aiBlock}>
//               <Text style={styles.aiLabel}>Area Detected</Text>

//               <View style={styles.chipsWrap}>
//                 {Array.isArray(areas) && areas.length > 0 ? (
//                   areas.map((area) => (
//                     <View key={area} style={styles.aiChip}>
//                       <Text style={styles.aiChipText}>{area}</Text>
//                     </View>
//                   ))
//                 ) : typeof areas === 'string' && areas ? (
//                   <View style={styles.aiChip}>
//                     <Text style={styles.aiChipText}>{areas}</Text>
//                   </View>
//                 ) : (
//                   <View style={styles.fallbackChip}>
//                     <Text style={styles.fallbackText}>Not detected yet</Text>
//                   </View>
//                 )}
//               </View>
//             </View>

//             <Text style={styles.aiFooter}>
//               This data is automatically updated from your latest skin scan
//             </Text>
//           </View>
//         </View>
//       </CollapsibleSection>

//       <CollapsibleSection title="Lifestyle & Triggers" icon="heart-outline">
//         <Text style={styles.label}>Known Triggers</Text>
//         <MultiSelectChips
//           options={["Dairy", "Sugar", "Stress", "Lack of sleep", "Menstrual cycle"]}
//           selected={triggers}
//           onChange={setTriggers}
//         />

//       <View style={styles.sliderHeaderRow}>
//         <Text style={styles.label}>Sleep Quality: {Math.round(sleep)}%</Text>
//         <Text style={styles.subtitle}>Contributes to breakout risk</Text>
//         <View style={[styles.badgeContainer, { backgroundColor: colors.background }]}>
//           <Text style={[styles.badge, { color: getSleepBadge(sleep).color }]}>
//             {getSleepBadge(sleep).label}
//           </Text>
//         </View>
//         </View>
//         <Slider 
//           value={sleep} 
//           minimumValue={0} 
//           maximumValue={100} 
//           onValueChange={setSleep}
//           minimumTrackTintColor="#7183fbff"
//           maximumTrackTintColor="#e5e7eb"
//         />

//     <View style={styles.sliderHeaderRow}>
//         <Text style={styles.label}>Stress Level: {Math.round(stress)}%</Text>
//         <Text style={styles.subtitle}>Contributes to breakout risk</Text>

//         <View style={[styles.badgeContainer, { backgroundColor: colors.background }]}>
//           <Text style={[styles.badge, { color: getStressBadge(stress).color }]}>
//             {getStressBadge(stress).label}
//           </Text>
//         </View>
//       </View>        
//       <Slider 
//           value={stress} 
//           minimumValue={0} 
//           maximumValue={100} 
//           onValueChange={setStress}
//           minimumTrackTintColor="#7183fbff"
//           maximumTrackTintColor="#e5e7eb"
//         />
//       </CollapsibleSection>

//         <CollapsibleSection title="Notifications" icon="notifications-outline">
//         <ToggleRow 
//             label="Breakout Risk Alerts" 
//             value={notifications.risk}
//             onChange={(v: boolean) => setNotifications({ ...notifications, risk: v })} 
//         />
//         <ToggleRow 
//             label="Food Warnings" 
//             value={notifications.food}
//             onChange={(v: boolean) => setNotifications({ ...notifications, food: v })} 
//         />
//         <ToggleRow 
//             label="Scan Reminders" 
//             value={notifications.scan}
//             onChange={(v: boolean) => setNotifications({ ...notifications, scan: v })} 
//         />
//         </CollapsibleSection>

//         <CollapsibleSection title="Privacy & Trust" icon="shield-checkmark-outline">
//         <ToggleRow
//             label="Show AI Confidence Scores"
//             value={showConfidence}
//             onChange={(v: boolean) => setShowConfidence(v)}
//         />
//         </CollapsibleSection>

//         <CollapsibleSection title="Account & Settings" icon="settings-outline">
//         <ToggleRow 
//             label="Dark Mode 🌙" 
//             value={isDarkMode} 
//             onChange={(v: boolean) => {
//                     setDarkMode(v); 
//                     toggleTheme();  
//                   }}
//         />
//         </CollapsibleSection>

//         {/* Save button
//         {hasUnsavedChanges() && (
//           <Pressable 
//             onPress={handleSave} 
//             style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
//             disabled={isSaving}
//           >
//             {isSaving ? (
//               <ActivityIndicator color="white" />
//             ) : (
//               <Text style={styles.saveBtnText}>Save Changes</Text>
//             )}
//           </Pressable>
//         )} */}

//     <Modal visible={isAvatarModalVisible} transparent={true} animationType="slide">
//       <View style={styles.modalOverlay}>
//         <View style={styles.modalContent}>
//           <Text style={styles.modalTitle}>Customize Avatar</Text>
          
//           {/* Color Selection */}
//           <Text style={styles.modalSubTitle}>Choose Background Color</Text>
//           <View style={styles.colorGrid}>
//             {PRESET_COLORS.map((color) => (
//               <Pressable
//                 key={color}
//                 onPress={() => setThemeColor(color)}
//                 style={[
//                   styles.colorCircle,
//                   { backgroundColor: color },
//                   themeColor === color && styles.colorCircleSelected
//                 ]}
//               />
//             ))}
//           </View>

//           {/* Icon Selection */}
//           <Text style={styles.modalSubTitle}>Choose Icon</Text>
//           <FlatList
//             data={AVAILABLE_AVATARS}
//             numColumns={4}
//             renderItem={({ item }) => (
//               <Pressable
//                 onPress={() => setAvatarIcon(item)}
//                 style={[
//                   styles.avatarOption,
//                   avatarIcon === item && { backgroundColor: themeColor }
//                 ]}
//               >
//                 <Ionicons 
//                   name={item as any} 
//                   size={22} 
//                   color={avatarIcon === item ? 'white' : themeColor} 
//                 />
//               </Pressable>
//             )}
//           />
          
//           <Pressable style={[styles.closeBtn, { backgroundColor: themeColor }]} onPress={() => setAvatarModalVisible(false)}>
//             <Text style={styles.closeBtnText}>Done</Text>
//           </Pressable>
//         </View>
//       </View>
//     </Modal>

//     </ScrollView>
//   );
// }

// const getStyles = (colors: any) => StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: colors.background, 
//   },
//   scrollContent: {
//     padding: 40,
//     paddingHorizontal: 16,
//     paddingBottom: 40,
//   },
//   header: {
//     alignItems: 'center',
//     paddingVertical: 30,
//   },
//   avatar: {
//     width: 64,
//     height: 64,
//     borderRadius: 32,
//     backgroundColor: colors.primary, 
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: 12,
//   },
//   headerTitle: {
//     fontSize: 22,
//     fontWeight: '700',
//     color: colors.text,
//   },
//   headerTitleInput: {
//     fontSize: 22,
//     fontWeight: '700',
//     color: colors.text,
//     textAlign: 'center',
//     padding: 0, 
//     marginTop: 4,
//   },
//   headerSub: {
//     paddingTop: 6,
//     fontSize: 14,
//     color: colors.subtext, 
//   },
//   editBadge: {
//     position: 'absolute',
//     right: -2,
//     bottom: -2,
//     backgroundColor: colors.text, 
//     width: 20,
//     height: 20,
//     borderRadius: 10,
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 2,
//     borderColor: colors.background,
//   },

//   // Card Styles
//   card: {
//     backgroundColor: colors.card,
//     borderRadius: 24,
//     padding: 16,
//     marginBottom: 16,
//     overflow: 'hidden',
//     shadowColor: colors.primary,
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.05,
//     shadowRadius: 10,
//     elevation: 2,
//   },
//   sectionHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   sectionLeft: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10,
//   },
//   iconCircle: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     backgroundColor: colors.surface, 
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   sectionTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: colors.text,
//   },
//   sectionLabel: {
//     fontSize: 13,
//     color: colors.subtext,
//     marginBottom: 12,
//   },
//   divider: {
//     height: 1,
//     backgroundColor: colors.border,
//   },

//   // Chip & Selectors
//   // label: {
//   //   marginTop: 16,
//   //   marginBottom: 8,
//   //   fontSize: 14,
//   //   fontWeight: '500',
//   //   color: colors.text,
//   // },
//   chipContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//   },
//   chip: {
//     paddingHorizontal: 14,
//     paddingVertical: 8,
//     borderRadius: 20,
//     backgroundColor: colors.surface,
//     borderWidth: 1,
//     borderColor: 'transparent',
//   },
//   chipSelected: {
//     backgroundColor: colors.primary, 
//     borderColor: colors.primary, 
//   },
//   chipText: {
//     color: colors.subtext,
//     fontSize: 13,
//   },
//   chipTextSelected: {
//     color: '#FFFFFF', 
//     fontWeight: '600',
//   },

//   // Single Selection Elements
//   singleOption: {
//     padding: 14,
//     borderRadius: 16,
//     backgroundColor: colors.background,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   singleOptionSelected: {
//     backgroundColor: colors.primary, 
//   },
//   singleText: {
//     fontSize: 15,
//     color: colors.text,
//   },

//   // Toggle/Switch Elements
//   toggleRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 12,
//   },
//   toggleLabel: {
//     fontSize: 15,
//     fontWeight: '500',
//     color: colors.text,
//   },
//   toggleDesc: {
//     fontSize: 12,
//     color: colors.subtext,
//     marginTop: 2,
//   },

//   // AI Insights Specific
//   aiCard: {
//     backgroundColor: colors.bannerBackground || '#FFF1F2',
//     borderRadius: 16,
//     padding: 16,
//   },
//   aiHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//     marginBottom: 16,
//   },
//   aiHeaderText: {
//     fontSize: 13,
//     color: colors.text,
//     fontWeight: '500',
//   },
//   aiChip: {
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 999,
//     backgroundColor: '#FB7185', 
//   },
//   aiChipText: {
//     fontSize: 13,
//     color: '#FFFFFF',
//   },
//   aiFooter: {
//     fontSize: 11,
//     color: colors.subtext,
//     marginTop: 1,
//     fontStyle: 'italic',
//   },

//   // Modals & Overlay
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.6)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modalContent: {
//     width: '80%',
//     backgroundColor: colors.card,
//     borderRadius: 24,
//     padding: 24,
//     alignItems: 'center',
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: colors.text,
//     marginBottom: 20,
//   },
//   colorCircle: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     borderWidth: 2,
//     borderColor: 'transparent',
//   },
//   colorCircleSelected: {
//     borderColor: colors.text,
//     transform: [{ scale: 1.1 }],
//   },

//   // Buttons
//   saveBtn: {
//     backgroundColor: '#2dc065', 
//     padding: 16, 
//     borderRadius: 16,
//     alignItems: 'center', 
//     marginTop: 20,
//   },
//   saveBtnText: { 
//     color: 'white', 
//     fontSize: 16, 
//     fontWeight: '700' 
//   },
//   closeBtn: {
//     marginTop: 20,
//     paddingVertical: 12,
//     paddingHorizontal: 40,
//     borderRadius: 12,
//     backgroundColor: colors.primary,
//   },
//   closeBtnText: {
//     color: 'white',
//     fontWeight: 'bold',
//   },
  
//   loadingContainer: { 
//     flex: 1, 
//     justifyContent: 'center', 
//     alignItems: 'center', 
//     backgroundColor: colors.background 
//   },
//   avatarOption: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     backgroundColor: colors.surface, 
//     margin: 8,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   modalSubTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: colors.subtext, 
//     marginBottom: 12,
//     alignSelf: 'flex-start',
//   },
//   colorGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 12,
//     marginBottom: 24,
//     justifyContent: 'center',
//   },

//   // AI & Fallback Content
//   aiBlock: {
//     marginBottom: 16,
//     alignItems: 'flex-start',
//   },
//   aiLabel: {
//     fontSize: 11,
//     color: colors.subtext, 
//     marginBottom: 8,
//   },
//   chipsWrap: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//   },
//   fallbackChip: {
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 999,
//     backgroundColor: colors.surface, 
//   },
//   fallbackText: {
//     fontSize: 13,
//     color: colors.subtext, 
//   },

//   helperText: {
//     fontSize: 11,
//     color: colors.subtext, 
//     marginTop: 8,
//     marginLeft: 8,
//   },
//   badgeContainer: {
//     backgroundColor: colors.surface, 
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 12,
//     marginLeft: 4,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   badge: {
//     color: colors.primary,
//     fontSize: 10,
//     fontWeight: 'bold',
//   },
//   collapsibleContent: {
//     paddingTop: 12,
//   },

//   sliderHeaderRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginTop: 20, // Replaces the margin on the label
//     marginBottom: 1,
//   },
//   label: {
//     paddingBottom: 20,
//     fontSize: 14,
//     fontWeight: '500',
//     color: colors.text,
//   },
//   // badgeContainer: {
//   //   paddingHorizontal: 8,
//   //   paddingVertical: 2,
//   //   borderRadius: 6,
//   // },
//   // badge: {
//   //   fontSize: 11,
//   //   fontWeight: '700',
//   //   textTransform: 'uppercase',
//   // },
//   // helperText: {
//   //   fontSize: 12,
//   //   color: colors.subtext,
//   //   fontStyle: 'italic',
//   //   marginTop: 12,
//   //   lineHeight: 18,
//   // },
//   subtitle: {
//   fontSize: 11,            
//   color: colors.subtext,   
//   fontStyle: 'italic',      
//   marginTop: 2,            
//   fontWeight: '500',
//   position: 'absolute',
//   left: 0,                 
//   bottom: 0,             
// },
// });

/*New update 1/3/2026 */
 return (
  <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <Pressable
            onPress={() => setAvatarModalVisible(true)}
            style={[styles.avatar, { backgroundColor: themeColor }]}
          >
            <Ionicons name={avatarIcon} size={36} color="white" />
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={12} color="white" />
            </View>
          </Pressable>

          <TextInput
            style={styles.profileNameInput}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your name..."
            placeholderTextColor={colors.subtext}
            maxLength={20}
          />
          <Text style={styles.profileSubtext}>Tap avatar to customize</Text>
        </View>

        {/* Skin Profile Section */}
        <View style={[styles.categoryCard, { borderTopColor: '#FB7185' }]}>
          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() => toggleSection('skinProfile')}
            activeOpacity={0.7}
          >
            <View style={styles.categoryLeft}>
              <View style={[styles.categoryIconCircle, { backgroundColor: '#FFF1F2' }]}>
                <Text style={styles.categoryEmoji}>✨</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryTitle}>Skin Profile</Text>
                <Text style={styles.categorySubtitle}>AI-powered skin analysis</Text>
              </View>
            </View>
            <View style={[styles.expandCircle, expandedSections.skinProfile && styles.expandCircleActive]}>
              <Text style={styles.expandIcon}>
                {expandedSections.skinProfile ? '▲' : '▼'}
              </Text>
            </View>
          </TouchableOpacity>

          {expandedSections.skinProfile && (
            <View style={styles.categoryContent}>
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Your Skin Type</Text>
                <View style={styles.optionsGrid}>
                  {['Oily', 'Dry', 'Combination', 'Sensitive'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionButton,
                        skinType === type && styles.optionButtonActive,
                      ]}
                      onPress={() => setSkinType(type)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          skinType === type && styles.optionTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* AI Detected Data */}
              <View style={styles.aiDetectionCard}>
                <View style={styles.aiDetectionHeader}>
                  <View style={styles.aiIconBox}>
                    <Text style={styles.aiIcon}>🤖</Text>
                  </View>
                  <Text style={styles.aiDetectionTitle}>AI-Detected from Latest Scan</Text>
                </View>

                {/* Acne Types */}
                <View style={styles.aiDataBlock}>
                  <Text style={styles.aiDataLabel}>Acne Type{acneTypes.length > 1 ? 's' : ''} Detected</Text>
                  <View style={styles.chipsWrap}>
                    {acneTypes?.length > 0 ? (
                      acneTypes.map((type) => (
                        <View key={type} style={styles.aiChip}>
                          <Text style={styles.aiChipText}>{type}</Text>
                        </View>
                      ))
                    ) : (
                      <View style={styles.fallbackChip}>
                        <Text style={styles.fallbackText}>Not detected yet</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Severity */}
                <View style={styles.aiDataBlock}>
                  <Text style={styles.aiDataLabel}>Severity Level</Text>
                  <View style={styles.chipsWrap}>
                    {severity ? (
                      <View style={styles.aiChip}>
                        <Text style={styles.aiChipText}>{severity}</Text>
                      </View>
                    ) : (
                      <View style={styles.fallbackChip}>
                        <Text style={styles.fallbackText}>Not detected yet</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Areas */}
                <View style={styles.aiDataBlock}>
                  <Text style={styles.aiDataLabel}>Affected Areas</Text>
                  <View style={styles.chipsWrap}>
                    {Array.isArray(areas) && areas.length > 0 ? (
                      areas.map((area) => (
                        <View key={area} style={styles.aiChip}>
                          <Text style={styles.aiChipText}>{area}</Text>
                        </View>
                      ))
                    ) : typeof areas === 'string' && areas ? (
                      <View style={styles.aiChip}>
                        <Text style={styles.aiChipText}>{areas}</Text>
                      </View>
                    ) : (
                      <View style={styles.fallbackChip}>
                        <Text style={styles.fallbackText}>Not detected yet</Text>
                      </View>
                    )}
                  </View>
                </View>

                <Text style={styles.aiFooterNote}>
                  This data updates automatically from your latest skin scan
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Lifestyle & Triggers Section */}
        <View style={[styles.categoryCard, { borderTopColor: '#F59E0B' }]}>
          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() => toggleSection('lifestyle')}
            activeOpacity={0.7}
          >
            <View style={styles.categoryLeft}>
              <View style={[styles.categoryIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.categoryEmoji}>💪</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryTitle}>Lifestyle & Triggers</Text>
                <Text style={styles.categorySubtitle}>Track what affects your skin</Text>
              </View>
            </View>
            <View style={[styles.expandCircle, expandedSections.lifestyle && styles.expandCircleActive]}>
              <Text style={styles.expandIcon}>
                {expandedSections.lifestyle ? '▲' : '▼'}
              </Text>
            </View>
          </TouchableOpacity>

          {expandedSections.lifestyle && (
            <View style={styles.categoryContent}>
              {/* Triggers */}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Known Triggers</Text>
                <View style={styles.chipsWrap}>
                  {['Dairy', 'Sugar', 'Stress', 'Lack of sleep', 'Menstrual cycle'].map((trigger) => (
                    <TouchableOpacity
                      key={trigger}
                      style={[
                        styles.triggerChip,
                        triggers.includes(trigger) && styles.triggerChipActive,
                      ]}
                      onPress={() => {
                        if (triggers.includes(trigger)) {
                          setTriggers(triggers.filter((t) => t !== trigger));
                        } else {
                          setTriggers([...triggers, trigger]);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      {triggers.includes(trigger) && (
                        <Text style={styles.triggerCheckmark}>✓</Text>
                      )}
                      <Text
                        style={[
                          styles.triggerChipText,
                          triggers.includes(trigger) && styles.triggerChipTextActive,
                        ]}
                      >
                        {trigger}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sleep Quality */}
              <View style={styles.sliderBlock}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Sleep Quality</Text>
                  <View style={[styles.sliderBadge, { backgroundColor: getSleepBadge(sleep).color + '20' }]}>
                    <Text style={[styles.sliderBadgeText, { color: getSleepBadge(sleep).color }]}>
                      {getSleepBadge(sleep).label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.sliderValue}>{Math.round(sleep)}%</Text>
                <Slider
                  value={sleep}
                  minimumValue={0}
                  maximumValue={100}
                  onValueChange={setSleep}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.primary}
                  style={styles.slider}
                />
                <Text style={styles.sliderHelper}>Higher sleep quality reduces breakout risk</Text>
              </View>

              {/* Stress Level */}
              <View style={styles.sliderBlock}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Stress Level</Text>
                  <View style={[styles.sliderBadge, { backgroundColor: getStressBadge(stress).color + '20' }]}>
                    <Text style={[styles.sliderBadgeText, { color: getStressBadge(stress).color }]}>
                      {getStressBadge(stress).label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.sliderValue}>{Math.round(stress)}%</Text>
                <Slider
                  value={stress}
                  minimumValue={0}
                  maximumValue={100}
                  onValueChange={setStress}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.primary}
                  style={styles.slider}
                />
                <Text style={styles.sliderHelper}>Lower stress levels promote clearer skin</Text>
              </View>
            </View>
          )}
        </View>

        {/* Notifications Section */}
        <View style={[styles.categoryCard, { borderTopColor: '#8B5CF6' }]}>
          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() => toggleSection('notifications')}
            activeOpacity={0.7}
          >
            <View style={styles.categoryLeft}>
              <View style={[styles.categoryIconCircle, { backgroundColor: '#F3E8FF' }]}>
                <Text style={styles.categoryEmoji}>🔔</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryTitle}>Notifications</Text>
                <Text style={styles.categorySubtitle}>Manage your alerts</Text>
              </View>
            </View>
            <View style={[styles.expandCircle, expandedSections.notifications && styles.expandCircleActive]}>
              <Text style={styles.expandIcon}>
                {expandedSections.notifications ? '▲' : '▼'}
              </Text>
            </View>
          </TouchableOpacity>

          {expandedSections.notifications && (
            <View style={styles.categoryContent}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Breakout Risk Alerts</Text>
                  <Text style={styles.toggleDesc}>Get notified of high-risk foods</Text>
                </View>
                <Switch
                  value={notifications.risk}
                  onValueChange={(v) => setNotifications({ ...notifications, risk: v })}
                  trackColor={{ false: colors.border, true: colors.primary + '60' }}
                  thumbColor={notifications.risk ? colors.primary : '#f4f3f4'}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Food Warnings</Text>
                  <Text style={styles.toggleDesc}>Alert me about trigger ingredients</Text>
                </View>
                <Switch
                  value={notifications.food}
                  onValueChange={(v) => setNotifications({ ...notifications, food: v })}
                  trackColor={{ false: colors.border, true: colors.primary + '60' }}
                  thumbColor={notifications.food ? colors.primary : '#f4f3f4'}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Scan Reminders</Text>
                  <Text style={styles.toggleDesc}>Weekly skin scan reminders</Text>
                </View>
                <Switch
                  value={notifications.scan}
                  onValueChange={(v) => setNotifications({ ...notifications, scan: v })}
                  trackColor={{ false: colors.border, true: colors.primary + '60' }}
                  thumbColor={notifications.scan ? colors.primary : '#f4f3f4'}
                />
              </View>
            </View>
          )}
        </View>

        {/* Privacy Section */}
        <View style={[styles.categoryCard, { borderTopColor: '#10B981' }]}>
          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() => toggleSection('privacy')}
            activeOpacity={0.7}
          >
            <View style={styles.categoryLeft}>
              <View style={[styles.categoryIconCircle, { backgroundColor: '#D1FAE5' }]}>
                <Text style={styles.categoryEmoji}>🔒</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryTitle}>Privacy & Trust</Text>
                <Text style={styles.categorySubtitle}>Control your data</Text>
              </View>
            </View>
            <View style={[styles.expandCircle, expandedSections.privacy && styles.expandCircleActive]}>
              <Text style={styles.expandIcon}>
                {expandedSections.privacy ? '▲' : '▼'}
              </Text>
            </View>
          </TouchableOpacity>

          {expandedSections.privacy && (
            <View style={styles.categoryContent}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Show AI Confidence Scores</Text>
                  <Text style={styles.toggleDesc}>Display accuracy percentages</Text>
                </View>
                <Switch
                  value={showConfidence}
                  onValueChange={setShowConfidence}
                  trackColor={{ false: colors.border, true: colors.primary + '60' }}
                  thumbColor={showConfidence ? colors.primary : '#f4f3f4'}
                />
              </View>
            </View>
          )}
        </View>

        {/* Account Settings Section */}
        <View style={[styles.categoryCard, { borderTopColor: '#3B82F6' }]}>
          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() => toggleSection('account')}
            activeOpacity={0.7}
          >
            <View style={styles.categoryLeft}>
              <View style={[styles.categoryIconCircle, { backgroundColor: '#DBEAFE' }]}>
                <Text style={styles.categoryEmoji}>⚙️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryTitle}>Account & Settings</Text>
                <Text style={styles.categorySubtitle}>App preferences</Text>
              </View>
            </View>
            <View style={[styles.expandCircle, expandedSections.account && styles.expandCircleActive]}>
              <Text style={styles.expandIcon}>
                {expandedSections.account ? '▲' : '▼'}
              </Text>
            </View>
          </TouchableOpacity>

          {expandedSections.account && (
            <View style={styles.categoryContent}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Dark Mode 🌙</Text>
                  <Text style={styles.toggleDesc}>Easier on the eyes at night</Text>
                </View>
                <Switch
                  value={isDarkMode}
                  onValueChange={(v) => {
                    toggleTheme();
                    setDarkMode(v);
                  }}
                  trackColor={{ false: colors.border, true: colors.primary + '60' }}
                  thumbColor={isDarkMode ? colors.primary : '#f4f3f4'}
                />
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Avatar Customization Modal */}
      <Modal visible={isAvatarModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Customize Avatar</Text>
              <Text style={styles.modalSubtitle}>Make it yours</Text>
            </View>

            {/* Color Selection */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionLabel}>Background Color</Text>
              <View style={styles.colorGrid}>
                {PRESET_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => setThemeColor(color)}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: color },
                      themeColor === color && styles.colorCircleSelected,
                    ]}
                    activeOpacity={0.7}
                  />
                ))}
              </View>
            </View>

            {/* Icon Selection */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionLabel}>Choose Icon</Text>
              <FlatList
                data={AVAILABLE_AVATARS}
                numColumns={4}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => setAvatarIcon(item)}
                    style={[
                      styles.avatarOption,
                      avatarIcon === item && { backgroundColor: themeColor },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={item as any}
                      size={24}
                      color={avatarIcon === item ? 'white' : colors.text}
                    />
                  </TouchableOpacity>
                )}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalDoneButton, { backgroundColor: themeColor }]}
              onPress={() => setAvatarModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? colors.background : '#F8FAFC',
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

  // Enhanced Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  headerTextContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '500',
  },

  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  // Profile Header Card
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 26,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: colors.text,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.card,
  },
  profileNameInput: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    padding: 8,
    minWidth: 200,
  },
  profileSubtext: {
    fontSize: 12,
    color: colors.subtext,
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Category Card
  categoryCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    marginBottom: 15,
    overflow: 'hidden',
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  categoryIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 26,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  categorySubtitle: {
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '500',
  },
  expandCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandCircleActive: {
    backgroundColor: colors.primary + '20',
  },
  expandIcon: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
  },
  categoryContent: {
    padding: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 20,
  },

  // Field Block
  fieldBlock: {
    gap: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    width: '48%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  optionTextActive: {
    color: '#FFFFFF',
  },

  // AI Detection Card
  aiDetectionCard: {
    backgroundColor: isDarkMode ? '#450a0a' : '#FFF1F2',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: isDarkMode ? '#7f1d1d' : '#FECACA',
  },
  aiDetectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#7f1d1d' : '#FED7D7',
  },
  aiIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDarkMode ? '#7f1d1d' : '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiIcon: {
    fontSize: 22,
  },
  aiDetectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: isDarkMode ? '#fca5a5' : '#991B1B',
  },
  aiDataBlock: {
    marginBottom: 16,
  },
  aiDataLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: isDarkMode ? '#f87171' : '#B91C1C',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aiChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FB7185',
  },
  aiChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fallbackChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: isDarkMode ? '#7f1d1d' : '#FEE2E2',
  },
  fallbackText: {
    fontSize: 13,
    color: isDarkMode ? '#fca5a5' : '#991B1B',
    fontStyle: 'italic',
  },
  aiFooterNote: {
    fontSize: 11,
    color: isDarkMode ? '#f87171' : '#B91C1C',
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Trigger Chips
  triggerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    gap: 6,
  },
  triggerChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  triggerCheckmark: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  triggerChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  triggerChipTextActive: {
    color: '#FFFFFF',
  },

  // Slider Block
  sliderBlock: {
    backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  sliderBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sliderBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sliderValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderHelper: {
    fontSize: 12,
    color: colors.subtext,
    fontStyle: 'italic',
    marginTop: 8,
  },

  // Toggle Row
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  toggleDesc: {
    fontSize: 12,
    color: colors.subtext,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 28,
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    fontStyle: 'italic',
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 14,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
  },
  colorCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderColor: colors.text,
    transform: [{ scale: 1.1 }],
  },
  avatarOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    margin: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

