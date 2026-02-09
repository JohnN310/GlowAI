import { useRouter } from "expo-router";
import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ChevronLeft } from "lucide-react-native";
import { useTheme } from '../app/theme/ThemeContext';

interface SafetyWarningsProps {
    
  onBack?: () => void;
}

type WarningCategory = 'dont' | 'conflicts' | 'broken-skin';

export default function SafetyWarnings({
  onBack = () => console.log('Back'),
}: SafetyWarningsProps) {

  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);

  const router = useRouter();
  const [expandedCategory, setExpandedCategory] = useState<WarningCategory | null>('dont');

  const toggleCategory = (category: WarningCategory) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="dark-content" />
      
//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
//           <Text style={styles.backText}>← Back </Text>
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Safety Guide</Text>
//         <View style={styles.backButton} />
//       </View>

//       <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
//         {/* Alert Banner */}
//         <View style={styles.alertBanner}>
//           <Text style={styles.alertIcon}>⚠️</Text>
//           <View style={styles.alertContent}>
//             <Text style={styles.alertTitle}>Important Safety Information</Text>
//             <Text style={styles.alertText}>
//               Following these guidelines can prevent skin damage and scarring
//             </Text>
//           </View>
//         </View>

//         {/* What NOT to Do */}
//         <View style={styles.categoryCard}>
//           <TouchableOpacity
//             style={styles.categoryHeader}
//             onPress={() => toggleCategory('dont')}
//             activeOpacity={0.7}
//           >
//             <View style={styles.categoryTitleRow}>
//               <Text style={styles.categoryEmoji}>🚫</Text>
//               <Text style={styles.categoryTitle}>What NOT to Do</Text>
//             </View>
//             <Text style={styles.expandIcon}>
//               {expandedCategory === 'dont' ? '▲' : '▼'}
//             </Text>
//           </TouchableOpacity>

//           {expandedCategory === 'dont' && (
//             <View style={styles.categoryContent}>
//               <View style={styles.warningItem}>
//                 <View style={styles.warningHeader}>
//                   <Text style={styles.warningIcon}>❌</Text>
//                   <Text style={styles.warningTitle}>Don't Pop or Pick</Text>
//                 </View>
//                 <Text style={styles.warningDescription}>
//                   Popping pimples pushes bacteria deeper, causing more inflammation, potential scarring, and spreading infection to nearby areas.
//                 </Text>
//                 <View style={styles.consequenceBox}>
//                   <Text style={styles.consequenceLabel}>Consequences:</Text>
//                   <Text style={styles.consequenceText}>
//                     • Permanent scarring{'\n'}
//                     • Hyperpigmentation{'\n'}
//                     • Increased infection risk{'\n'}
//                     • Longer healing time
//                   </Text>
//                 </View>
//               </View>

//               <View style={styles.warningItem}>
//                 <View style={styles.warningHeader}>
//                   <Text style={styles.warningIcon}>❌</Text>
//                   <Text style={styles.warningTitle}>Avoid Harsh Scrubbing</Text>
//                 </View>
//                 <Text style={styles.warningDescription}>
//                   Aggressive scrubbing or rough exfoliation damages your skin barrier and worsens inflammation.
//                 </Text>
//                 <View style={styles.doInsteadBox}>
//                   <Text style={styles.doInsteadLabel}>Do Instead:</Text>
//                   <Text style={styles.doInsteadText}>
//                     Use gentle chemical exfoliants (BHA/AHA) and soft cleansing motions
//                   </Text>
//                 </View>
//               </View>

//               <View style={styles.warningItem}>
//                 <View style={styles.warningHeader}>
//                   <Text style={styles.warningIcon}>❌</Text>
//                   <Text style={styles.warningTitle}>Don't Over-Apply Products</Text>
//                 </View>
//                 <Text style={styles.warningDescription}>
//                   More product doesn't mean faster results. Over-application causes irritation, peeling, and can make acne worse.
//                 </Text>
//                 <View style={styles.doInsteadBox}>
//                   <Text style={styles.doInsteadLabel}>Do Instead:</Text>
//                   <Text style={styles.doInsteadText}>
//                     Start with pea-sized amounts and follow product instructions
//                   </Text>
//                 </View>
//               </View>

//               <View style={styles.warningItem}>
//                 <View style={styles.warningHeader}>
//                   <Text style={styles.warningIcon}>❌</Text>
//                   <Text style={styles.warningTitle}>Avoid Touching Your Face</Text>
//                 </View>
//                 <Text style={styles.warningDescription}>
//                   Your hands carry bacteria and oil that transfer to your face, clogging pores and spreading acne.
//                 </Text>
//               </View>

//               <View style={styles.warningItem}>
//                 <View style={styles.warningHeader}>
//                   <Text style={styles.warningIcon}>❌</Text>
//                   <Text style={styles.warningTitle}>Don't Skip Moisturizer</Text>
//                 </View>
//                 <Text style={styles.warningDescription}>
//                   Acne treatments can be drying. Skipping moisturizer causes overproduction of oil, making acne worse.
//                 </Text>
//                 <View style={styles.doInsteadBox}>
//                   <Text style={styles.doInsteadLabel}>Do Instead:</Text>
//                   <Text style={styles.doInsteadText}>
//                     Use oil-free, non-comedogenic moisturizer after treatments
//                   </Text>
//                 </View>
//               </View>
//             </View>
//           )}
//         </View>

//         {/* Product Conflicts */}
//         <View style={styles.categoryCard}>
//           <TouchableOpacity
//             style={styles.categoryHeader}
//             onPress={() => toggleCategory('conflicts')}
//             activeOpacity={0.7}
//           >
//             <View style={styles.categoryTitleRow}>
//               <Text style={styles.categoryEmoji}>⚡</Text>
//               <Text style={styles.categoryTitle}>Ingredient Conflicts</Text>
//             </View>
//             <Text style={styles.expandIcon}>
//               {expandedCategory === 'conflicts' ? '▲' : '▼'}
//             </Text>
//           </TouchableOpacity>

//           {expandedCategory === 'conflicts' && (
//             <View style={styles.categoryContent}>
//               <View style={styles.conflictItem}>
//                 <View style={styles.conflictHeader}>
//                   <View style={styles.conflictBadge}>
//                     <Text style={styles.conflictBadgeText}>HIGH RISK</Text>
//                   </View>
//                 </View>
//                 <Text style={styles.conflictTitle}>
//                   Benzoyl Peroxide + Retinoids/Vitamin C
//                 </Text>
//                 <Text style={styles.conflictDescription}>
//                   These combinations can cause severe irritation, redness, and neutralize effectiveness.
//                 </Text>
//                 <View style={styles.solutionBox}>
//                   <Text style={styles.solutionLabel}>✓ Solution:</Text>
//                   <Text style={styles.solutionText}>
//                     Use Benzoyl Peroxide in AM, Retinoids in PM, or alternate nights
//                   </Text>
//                 </View>
//               </View>

//               <View style={styles.conflictItem}>
//                 <View style={styles.conflictHeader}>
//                   <View style={styles.conflictBadge}>
//                     <Text style={styles.conflictBadgeText}>HIGH RISK</Text>
//                   </View>
//                 </View>
//                 <Text style={styles.conflictTitle}>
//                   Multiple Exfoliants (AHA + BHA + Retinoids)
//                 </Text>
//                 <Text style={styles.conflictDescription}>
//                   Combining multiple exfoliating acids causes over-exfoliation, damaging your skin barrier.
//                 </Text>
//                 <View style={styles.solutionBox}>
//                   <Text style={styles.solutionLabel}>✓ Solution:</Text>
//                   <Text style={styles.solutionText}>
//                     Use only one exfoliant per routine, or alternate different acids on different days
//                   </Text>
//                 </View>
//               </View>

//               <View style={styles.conflictItem}>
//                 <View style={styles.conflictHeader}>
//                   <View style={[styles.conflictBadge, styles.mediumRiskBadge]}>
//                     <Text style={styles.conflictBadgeText}>MEDIUM RISK</Text>
//                   </View>
//                 </View>
//                 <Text style={styles.conflictTitle}>
//                   Niacinamide + Vitamin C (at high concentrations)
//                 </Text>
//                 <Text style={styles.conflictDescription}>
//                   While generally safe, high concentrations together may reduce effectiveness and cause flushing.
//                 </Text>
//                 <View style={styles.solutionBox}>
//                   <Text style={styles.solutionLabel}>✓ Solution:</Text>
//                   <Text style={styles.solutionText}>
//                     Use Vitamin C in AM, Niacinamide in PM, or choose lower concentrations
//                   </Text>
//                 </View>
//               </View>

//               <View style={styles.conflictItem}>
//                 <View style={styles.conflictHeader}>
//                   <View style={[styles.conflictBadge, styles.mediumRiskBadge]}>
//                     <Text style={styles.conflictBadgeText}>MEDIUM RISK</Text>
//                   </View>
//                 </View>
//                 <Text style={styles.conflictTitle}>
//                   Sulfur + Benzoyl Peroxide
//                 </Text>
//                 <Text style={styles.conflictDescription}>
//                   Using together can cause excessive dryness and irritation.
//                 </Text>
//                 <View style={styles.solutionBox}>
//                   <Text style={styles.solutionLabel}>✓ Solution:</Text>
//                   <Text style={styles.solutionText}>
//                     Choose one or alternate nights
//                   </Text>
//                 </View>
//               </View>

//               {/* General Guidelines */}
//               <View style={styles.guidelinesBox}>
//                 <Text style={styles.guidelinesTitle}>General Guidelines:</Text>
//                 <Text style={styles.guidelinesText}>
//                   • Introduce one new product at a time (wait 2 weeks){'\n'}
//                   • Start with lowest concentrations{'\n'}
//                   • When in doubt, separate actives by 30 minutes{'\n'}
//                   • Always patch test new combinations
//                 </Text>
//               </View>
//             </View>
//           )}
//         </View>

//         {/* Broken Skin Alerts */}
//         <View style={styles.categoryCard}>
//           <TouchableOpacity
//             style={styles.categoryHeader}
//             onPress={() => toggleCategory('broken-skin')}
//             activeOpacity={0.7}
//           >
//             <View style={styles.categoryTitleRow}>
//               <Text style={styles.categoryEmoji}>🩹</Text>
//               <Text style={styles.categoryTitle}>Broken Skin Precautions</Text>
//             </View>
//             <Text style={styles.expandIcon}>
//               {expandedCategory === 'broken-skin' ? '▲' : '▼'}
//             </Text>
//           </TouchableOpacity>

//           {expandedCategory === 'broken-skin' && (
//             <View style={styles.categoryContent}>
//               <View style={styles.brokenSkinAlert}>
//                 <Text style={styles.brokenSkinIcon}>🚨</Text>
//                 <Text style={styles.brokenSkinTitle}>Stop Treatment If:</Text>
//                 <View style={styles.stopSignsList}>
//                   <Text style={styles.stopSignText}>• Skin is bleeding or oozing</Text>
//                   <Text style={styles.stopSignText}>• You see open wounds or raw skin</Text>
//                   <Text style={styles.stopSignText}>• Severe burning or stinging occurs</Text>
//                   <Text style={styles.stopSignText}>• You popped a pimple recently</Text>
//                 </View>
//               </View>

//               <View style={styles.warningItem}>
//                 <View style={styles.warningHeader}>
//                   <Text style={styles.warningIcon}>⚠️</Text>
//                   <Text style={styles.warningTitle}>Avoid Active Ingredients</Text>
//                 </View>
//                 <Text style={styles.warningDescription}>
//                   Do NOT apply acids, retinoids, or benzoyl peroxide to broken skin. This can cause:
//                 </Text>
//                 <View style={styles.riskList}>
//                   <Text style={styles.riskText}>• Severe pain and burning</Text>
//                   <Text style={styles.riskText}>• Chemical burns</Text>
//                   <Text style={styles.riskText}>• Delayed healing</Text>
//                   <Text style={styles.riskText}>• Increased scarring risk</Text>
//                 </View>
//               </View>

//               <View style={styles.healingProtocol}>
//                 <Text style={styles.healingTitle}>Healing Protocol:</Text>
//                 <View style={styles.healingStep}>
//                   <Text style={styles.stepNumber}>1</Text>
//                   <View style={styles.stepContent}>
//                     <Text style={styles.stepTitle}>Cleanse Gently</Text>
//                     <Text style={styles.stepText}>Use lukewarm water and gentle cleanser</Text>
//                   </View>
//                 </View>
//                 <View style={styles.healingStep}>
//                   <Text style={styles.stepNumber}>2</Text>
//                   <View style={styles.stepContent}>
//                     <Text style={styles.stepTitle}>Apply Healing Ointment</Text>
//                     <Text style={styles.stepText}>Use petroleum jelly or Aquaphor on broken areas</Text>
//                   </View>
//                 </View>
//                 <View style={styles.healingStep}>
//                   <Text style={styles.stepNumber}>3</Text>
//                   <View style={styles.stepContent}>
//                     <Text style={styles.stepTitle}>Protect & Wait</Text>
//                     <Text style={styles.stepText}>Cover with bandage if needed, wait until fully healed (3-7 days)</Text>
//                   </View>
//                 </View>
//                 <View style={styles.healingStep}>
//                   <Text style={styles.stepNumber}>4</Text>
//                   <View style={styles.stepContent}>
//                     <Text style={styles.stepTitle}>Resume Treatment Slowly</Text>
//                     <Text style={styles.stepText}>Start with gentler products, gradually reintroduce actives</Text>
//                   </View>
//                 </View>
//               </View>
//             </View>
//           )}
//         </View>

//         {/* Emergency Contact */}
//         <View style={styles.emergencyCard}>
//           <Text style={styles.emergencyIcon}>🏥</Text>
//           <Text style={styles.emergencyTitle}>When to See a Doctor</Text>
//           <Text style={styles.emergencyText}>
//             Consult a dermatologist if you experience:
//           </Text>
//           <View style={styles.emergencyList}>
//             <Text style={styles.emergencyItem}>• Severe cystic or nodular acne</Text>
//             <Text style={styles.emergencyItem}>• Signs of infection (fever, warmth, pus)</Text>
//             <Text style={styles.emergencyItem}>• Allergic reaction (swelling, hives)</Text>
//             <Text style={styles.emergencyItem}>• No improvement after 8-12 weeks</Text>
//             <Text style={styles.emergencyItem}>• Worsening condition despite treatment</Text>
//           </View>
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const getStyles = (colors: any) => StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: colors.background, 
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 20,
//     paddingVertical: 16,
//     backgroundColor: colors.card, 
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border, 
//   },
//   backButton: {
//     width: 70,
//   },
//   backText: {
//     fontSize: 16,
//     color: colors.primary, 
//     fontWeight: '500',
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: colors.text, 
//   },
//   content: {
//     flex: 1,
//   },
//   contentContainer: {
//     padding: 20,
//     paddingBottom: 40,
//   },

//   // Alert Banner
//   alertBanner: {
//     backgroundColor: colors.isDarkMode ? '#450a0a' : '#FEF2F2', 
//     borderRadius: 16,
//     padding: 20,
//     flexDirection: 'row',
//     gap: 12,
//     marginBottom: 24,
//     borderWidth: 2,
//     borderColor: colors.isDarkMode ? '#7f1d1d' : '#FEE2E2',
//   },
//   alertIcon: {
//     fontSize: 32,
//   },
//   alertContent: {
//     flex: 1,
//   },
//   alertTitle: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: colors.isDarkMode ? '#fca5a5' : '#991B1B', 
//     marginBottom: 4,
//   },
//   alertText: {
//     fontSize: 14,
//     color: colors.isDarkMode ? '#f87171' : '#B91C1C',
//     lineHeight: 20,
//   },

//   // Category Card
//   categoryCard: {
//     backgroundColor: colors.card, 
//     borderRadius: 16,
//     marginBottom: 16,
//     overflow: 'hidden',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.05,
//     shadowRadius: 8,
//     elevation: 2,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   categoryHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 20,
//     backgroundColor: colors.card, 
//   },
//   categoryTitleRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//   },
//   categoryEmoji: {
//     fontSize: 24,
//   },
//   categoryTitle: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: colors.text, 
//   },
//   expandIcon: {
//     fontSize: 14,
//     color: colors.subtext, 
//   },
//   categoryContent: {
//     backgroundColor: colors.surface, 
//     padding: 20,
//     borderTopWidth: 1,
//     borderTopColor: colors.border, 
//   },

//   // Warning Item
//   warningItem: {
//     backgroundColor: colors.card, 
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   warningHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     marginBottom: 8,
//   },
//   warningIcon: {
//     fontSize: 20,
//   },
//   warningTitle: {
//     fontSize: 16,
//     fontWeight: '700',
//     color: colors.isDarkMode ? '#f87171' : '#DC2626', 
//   },
//   warningDescription: {
//     fontSize: 14,
//     color: colors.text, 
//     lineHeight: 20,
//     marginBottom: 12,
//   },
//   consequenceBox: {
//     backgroundColor: colors.isDarkMode ? '#450a0a' : '#FEF2F2',
//     borderRadius: 8,
//     padding: 12,
//     borderLeftWidth: 3,
//     borderLeftColor: '#DC2626',
//   },
//   consequenceLabel: {
//     fontSize: 13,
//     fontWeight: '700',
//     color: colors.isDarkMode ? '#fca5a5' : '#991B1B',
//     marginBottom: 6,
//   },
//   consequenceText: {
//     fontSize: 13,
//     color: colors.isDarkMode ? '#f87171' : '#B91C1C',
//     lineHeight: 20,
//   },
//   doInsteadBox: {
//     backgroundColor: colors.isDarkMode ? '#064e3b' : '#ECFDF5', 
//     borderRadius: 8,
//     padding: 12,
//     borderLeftWidth: 3,
//     borderLeftColor: '#10B981',
//   },
//   doInsteadLabel: {
//     fontSize: 13,
//     fontWeight: '700',
//     color: colors.isDarkMode ? '#6ee7b7' : '#065F46',
//     marginBottom: 4,
//   },
//   doInsteadText: {
//     fontSize: 13,
//     color: colors.isDarkMode ? '#34d399' : '#047857',
//     lineHeight: 18,
//   },

//   // Conflict Item
//   conflictItem: {
//     backgroundColor: colors.card, 
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 12,
//   },
//   conflictHeader: {
//     marginBottom: 8,
//   },
//   conflictBadge: {
//     alignSelf: 'flex-start',
//     backgroundColor: '#DC2626',
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     borderRadius: 6,
//   },
//   mediumRiskBadge: {
//     backgroundColor: '#F59E0B',
//   },
//   conflictBadgeText: {
//     fontSize: 11,
//     fontWeight: '700',
//     color: '#FFFFFF',
//     letterSpacing: 0.5,
//   },
//   conflictTitle: {
//     fontSize: 15,
//     fontWeight: '700',
//     color: colors.text, 
//     marginBottom: 8,
//   },
//   conflictDescription: {
//     fontSize: 14,
//     color: colors.subtext, 
//     lineHeight: 20,
//     marginBottom: 12,
//   },
//   solutionBox: {
//     backgroundColor: colors.isDarkMode ? '#1e3a8a' : '#EFF6FF', 
//     borderRadius: 8,
//     padding: 12,
//     borderLeftWidth: 3,
//     borderLeftColor: '#3B82F6',
//   },
//   solutionLabel: {
//     fontSize: 13,
//     fontWeight: '700',
//     color: colors.isDarkMode ? '#93c5fd' : '#1E40AF',
//     marginBottom: 4,
//   },
//   solutionText: {
//     fontSize: 13,
//     color: colors.isDarkMode ? '#bfdbfe' : '#1E3A8A',
//     lineHeight: 18,
//   },
//   guidelinesBox: {
//     backgroundColor: colors.isDarkMode ? '#064e3b' : '#F0FDF4',
//     borderRadius: 12,
//     padding: 16,
//     marginTop: 12,
//   },
//   guidelinesTitle: {
//     fontSize: 14,
//     fontWeight: '700',
//     color: colors.isDarkMode ? '#6ee7b7' : '#166534',
//     marginBottom: 8,
//   },
//   guidelinesText: {
//     fontSize: 13,
//     color: colors.isDarkMode ? '#a7f3d0' : '#15803D',
//     lineHeight: 20,
//   },

//   // Broken Skin
//   brokenSkinAlert: {
//     backgroundColor: '#DC2626', 
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 16,
//     alignItems: 'center',
//   },
//   brokenSkinIcon: {
//     fontSize: 40,
//     marginBottom: 8,
//   },
//   brokenSkinTitle: {
//     fontSize: 16,
//     fontWeight: '700',
//     color: '#FFFFFF',
//     marginBottom: 12,
//     textAlign: 'center',
//   },
//   stopSignsList: {
//     width: '100%',
//   },
//   stopSignText: {
//     fontSize: 14,
//     color: '#FFFFFF',
//     marginBottom: 6,
//     lineHeight: 20,
//   },
//   riskList: {
//     marginLeft: 8,
//   },
//   riskText: {
//     fontSize: 13,
//     color: '#DC2626',
//     marginBottom: 4,
//   },
//   healingProtocol: {
//     backgroundColor: colors.card, 
//     borderRadius: 12,
//     padding: 16,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   healingTitle: {
//     fontSize: 16,
//     fontWeight: '700',
//     color: colors.text, 
//     marginBottom: 16,
//   },
//   healingStep: {
//     flexDirection: 'row',
//     gap: 12,
//     marginBottom: 16,
//   },
//   stepNumber: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     backgroundColor: colors.primary, 
//     color: '#FFFFFF',
//     fontSize: 16,
//     fontWeight: '700',
//     textAlign: 'center',
//     lineHeight: 32,
//   },
//   stepContent: {
//     flex: 1,
//   },
//   stepTitle: {
//     fontSize: 15,
//     fontWeight: '600',
//     color: colors.text, 
//     marginBottom: 4,
//   },
//   stepText: {
//     fontSize: 13,
//     color: colors.subtext, 
//     lineHeight: 18,
//   },

//   // Emergency Card
//   emergencyCard: {
//     backgroundColor: colors.isDarkMode ? '#451a03' : '#FEF3C7', 
//     borderRadius: 16,
//     padding: 20,
//     borderWidth: 2,
//     borderColor: colors.isDarkMode ? '#92400e' : '#FDE68A',
//   },
//   emergencyIcon: {
//     fontSize: 40,
//     textAlign: 'center',
//     marginBottom: 12,
//   },
//   emergencyTitle: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: colors.isDarkMode ? '#fcd34d' : '#92400E',
//     marginBottom: 8,
//     textAlign: 'center',
//   },
//   emergencyText: {
//     fontSize: 14,
//     color: colors.isDarkMode ? '#fbbf24' : '#78350F',
//     marginBottom: 12,
//     textAlign: 'center',
//   },
//   emergencyList: {
//     backgroundColor: colors.isDarkMode ? '#78350f' : '#FFFBEB',
//     borderRadius: 8,
//     padding: 12,
//   },
//   emergencyItem: {
//     fontSize: 13,
//     color: colors.isDarkMode ? '#fef3c7' : '#92400E',
//     marginBottom: 6,
//     lineHeight: 18,
//   },
// });

/*New update 1/3/26*/ 
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backCircle}>
            <ChevronLeft size={24} color={colors.primary} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Safety Guide</Text>
          <Text style={styles.headerSubtitle}>Protect your skin</Text>
        </View>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        
        <View style={styles.alertBanner}>
          <View style={styles.alertIconContainer}>
            <Text style={styles.alertIcon}>⚠️</Text>
          </View>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Critical Information</Text>
            <Text style={styles.alertText}>
              Following these guidelines prevents permanent skin damage and scarring
            </Text>
          </View>
        </View>

        <View style={[styles.categoryCard, { borderTopColor: '#EF4444' }]}>
          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() => toggleCategory('dont')}
            activeOpacity={0.7}
          >
            <View style={styles.categoryLeft}>
              <View style={[styles.categoryIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Text style={styles.categoryEmoji}>🚫</Text>
              </View>
              <View>
                <Text style={styles.categoryTitle}>What NOT to Do</Text>
                <Text style={styles.categorySubtitle}>5 critical mistakes to avoid</Text>
              </View>
            </View>
            <View style={[styles.expandCircle, expandedCategory === 'dont' && styles.expandCircleActive]}>
              <Text style={styles.expandIcon}>
                {expandedCategory === 'dont' ? '▲' : '▼'}
              </Text>
            </View>
          </TouchableOpacity>

          {expandedCategory === 'dont' && (
            <View style={styles.categoryContent}>
              
              {/* Warning 1 */}
              <View style={styles.warningCard}>
                <View style={styles.warningHeader}>
                  <View style={[styles.warningIconBox, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={styles.warningIcon}>❌</Text>
                  </View>
                  <Text style={styles.warningTitle}>Don't Pop or Pick</Text>
                </View>
                <Text style={styles.warningDescription}>
                  Popping pimples pushes bacteria deeper, causing more inflammation, potential scarring, and spreading infection to nearby areas.
                </Text>
                <View style={styles.consequenceBox}>
                  <View style={styles.consequenceHeader}>
                    <Text style={styles.consequenceIcon}>⚡</Text>
                    <Text style={styles.consequenceLabel}>Consequences:</Text>
                  </View>
                  <View style={styles.consequenceList}>
                    <View style={styles.consequenceItem}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.consequenceText}>Permanent scarring</Text>
                    </View>
                    <View style={styles.consequenceItem}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.consequenceText}>Hyperpigmentation</Text>
                    </View>
                    <View style={styles.consequenceItem}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.consequenceText}>Increased infection risk</Text>
                    </View>
                    <View style={styles.consequenceItem}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.consequenceText}>Longer healing time</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Warning 2 */}
              <View style={styles.warningCard}>
                <View style={styles.warningHeader}>
                  <View style={[styles.warningIconBox, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={styles.warningIcon}>❌</Text>
                  </View>
                  <Text style={styles.warningTitle}>Avoid Harsh Scrubbing</Text>
                </View>
                <Text style={styles.warningDescription}>
                  Aggressive scrubbing or rough exfoliation damages your skin barrier and worsens inflammation.
                </Text>
                <View style={styles.doInsteadBox}>
                  <View style={styles.doInsteadHeader}>
                    <Text style={styles.doInsteadIcon}>✓</Text>
                    <Text style={styles.doInsteadLabel}>Do Instead:</Text>
                  </View>
                  <Text style={styles.doInsteadText}>
                    Use gentle chemical exfoliants (BHA/AHA) and soft cleansing motions
                  </Text>
                </View>
              </View>

              {/* Warning 3 */}
              <View style={styles.warningCard}>
                <View style={styles.warningHeader}>
                  <View style={[styles.warningIconBox, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={styles.warningIcon}>❌</Text>
                  </View>
                  <Text style={styles.warningTitle}>Don't Over-Apply Products</Text>
                </View>
                <Text style={styles.warningDescription}>
                  More product doesn't mean faster results. Over-application causes irritation, peeling, and can make acne worse.
                </Text>
                <View style={styles.doInsteadBox}>
                  <View style={styles.doInsteadHeader}>
                    <Text style={styles.doInsteadIcon}>✓</Text>
                    <Text style={styles.doInsteadLabel}>Do Instead:</Text>
                  </View>
                  <Text style={styles.doInsteadText}>
                    Start with pea-sized amounts and follow product instructions
                  </Text>
                </View>
              </View>

              {/* Warning 4 */}
              <View style={styles.warningCard}>
                <View style={styles.warningHeader}>
                  <View style={[styles.warningIconBox, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={styles.warningIcon}>❌</Text>
                  </View>
                  <Text style={styles.warningTitle}>Avoid Touching Your Face</Text>
                </View>
                <Text style={styles.warningDescription}>
                  Your hands carry bacteria and oil that transfer to your face, clogging pores and spreading acne.
                </Text>
              </View>

              {/* Warning 5 */}
              <View style={styles.warningCard}>
                <View style={styles.warningHeader}>
                  <View style={[styles.warningIconBox, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={styles.warningIcon}>❌</Text>
                  </View>
                  <Text style={styles.warningTitle}>Don't Skip Moisturizer</Text>
                </View>
                <Text style={styles.warningDescription}>
                  Acne treatments can be drying. Skipping moisturizer causes overproduction of oil, making acne worse.
                </Text>
                <View style={styles.doInsteadBox}>
                  <View style={styles.doInsteadHeader}>
                    <Text style={styles.doInsteadIcon}>✓</Text>
                    <Text style={styles.doInsteadLabel}>Do Instead:</Text>
                  </View>
                  <Text style={styles.doInsteadText}>
                    Use oil-free, non-comedogenic moisturizer after treatments
                  </Text>
                </View>
              </View>

            </View>
          )}
        </View>

        <View style={[styles.categoryCard, { borderTopColor: '#F59E0B' }]}>
          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() => toggleCategory('conflicts')}
            activeOpacity={0.7}
          >
            <View style={styles.categoryLeft}>
              <View style={[styles.categoryIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.categoryEmoji}>⚡</Text>
              </View>
              <View>
                <Text style={styles.categoryTitle}>Ingredient Conflicts</Text>
                <Text style={styles.categorySubtitle}>Dangerous combinations</Text>
              </View>
            </View>
            <View style={[styles.expandCircle, expandedCategory === 'conflicts' && styles.expandCircleActive]}>
              <Text style={styles.expandIcon}>
                {expandedCategory === 'conflicts' ? '▲' : '▼'}
              </Text>
            </View>
          </TouchableOpacity>

          {expandedCategory === 'conflicts' && (
            <View style={styles.categoryContent}>
              
              {/* Conflict 1 */}
              <View style={styles.conflictCard}>
                <View style={styles.riskBadgeContainer}>
                  <View style={styles.highRiskBadge}>
                    <Text style={styles.riskBadgeText}>HIGH RISK</Text>
                  </View>
                </View>
                <Text style={styles.conflictTitle}>
                  Benzoyl Peroxide + Retinoids/Vitamin C
                </Text>
                <Text style={styles.conflictDescription}>
                  These combinations can cause severe irritation, redness, and neutralize effectiveness.
                </Text>
                <View style={styles.solutionBox}>
                  <View style={styles.solutionHeader}>
                    <Text style={styles.solutionIcon}>💡</Text>
                    <Text style={styles.solutionLabel}>Solution:</Text>
                  </View>
                  <Text style={styles.solutionText}>
                    Use Benzoyl Peroxide in AM, Retinoids in PM, or alternate nights
                  </Text>
                </View>
              </View>

              {/* Conflict 2 */}
              <View style={styles.conflictCard}>
                <View style={styles.riskBadgeContainer}>
                  <View style={styles.highRiskBadge}>
                    <Text style={styles.riskBadgeText}>HIGH RISK</Text>
                  </View>
                </View>
                <Text style={styles.conflictTitle}>
                  Multiple Exfoliants (AHA + BHA + Retinoids)
                </Text>
                <Text style={styles.conflictDescription}>
                  Combining multiple exfoliating acids causes over-exfoliation, damaging your skin barrier.
                </Text>
                <View style={styles.solutionBox}>
                  <View style={styles.solutionHeader}>
                    <Text style={styles.solutionIcon}>💡</Text>
                    <Text style={styles.solutionLabel}>Solution:</Text>
                  </View>
                  <Text style={styles.solutionText}>
                    Use only one exfoliant per routine, or alternate different acids on different days
                  </Text>
                </View>
              </View>

              {/* Conflict 3 */}
              <View style={styles.conflictCard}>
                <View style={styles.riskBadgeContainer}>
                  <View style={styles.mediumRiskBadge}>
                    <Text style={styles.riskBadgeText}>MEDIUM RISK</Text>
                  </View>
                </View>
                <Text style={styles.conflictTitle}>
                  Niacinamide + Vitamin C (at high concentrations)
                </Text>
                <Text style={styles.conflictDescription}>
                  While generally safe, high concentrations together may reduce effectiveness and cause flushing.
                </Text>
                <View style={styles.solutionBox}>
                  <View style={styles.solutionHeader}>
                    <Text style={styles.solutionIcon}>💡</Text>
                    <Text style={styles.solutionLabel}>Solution:</Text>
                  </View>
                  <Text style={styles.solutionText}>
                    Use Vitamin C in AM, Niacinamide in PM, or choose lower concentrations
                  </Text>
                </View>
              </View>

              {/* Conflict 4 */}
              <View style={styles.conflictCard}>
                <View style={styles.riskBadgeContainer}>
                  <View style={styles.mediumRiskBadge}>
                    <Text style={styles.riskBadgeText}>MEDIUM RISK</Text>
                  </View>
                </View>
                <Text style={styles.conflictTitle}>
                  Sulfur + Benzoyl Peroxide
                </Text>
                <Text style={styles.conflictDescription}>
                  Using together can cause excessive dryness and irritation.
                </Text>
                <View style={styles.solutionBox}>
                  <View style={styles.solutionHeader}>
                    <Text style={styles.solutionIcon}>💡</Text>
                    <Text style={styles.solutionLabel}>Solution:</Text>
                  </View>
                  <Text style={styles.solutionText}>
                    Choose one or alternate nights
                  </Text>
                </View>
              </View>

              {/* General Guidelines */}
              <View style={styles.guidelinesBox}>
                <View style={styles.guidelinesHeader}>
                  <Text style={styles.guidelinesIcon}>📋</Text>
                  <Text style={styles.guidelinesTitle}>General Guidelines</Text>
                </View>
                <View style={styles.guidelinesList}>
                  <View style={styles.guidelineItem}>
                    <View style={styles.checkCircle}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                    <Text style={styles.guidelinesText}>Introduce one new product at a time (wait 2 weeks)</Text>
                  </View>
                  <View style={styles.guidelineItem}>
                    <View style={styles.checkCircle}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                    <Text style={styles.guidelinesText}>Start with lowest concentrations</Text>
                  </View>
                  <View style={styles.guidelineItem}>
                    <View style={styles.checkCircle}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                    <Text style={styles.guidelinesText}>When in doubt, separate actives by 30 minutes</Text>
                  </View>
                  <View style={styles.guidelineItem}>
                    <View style={styles.checkCircle}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                    <Text style={styles.guidelinesText}>Always patch test new combinations</Text>
                  </View>
                </View>
              </View>

            </View>
          )}
        </View>

        <View style={[styles.categoryCard, { borderTopColor: '#8B5CF6' }]}>
          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() => toggleCategory('broken-skin')}
            activeOpacity={0.7}
          >
            <View style={styles.categoryLeft}>
              <View style={[styles.categoryIconCircle, { backgroundColor: '#F3E8FF' }]}>
                <Text style={styles.categoryEmoji}>🩹</Text>
              </View>
              <View>
                <Text style={styles.categoryTitle}>Broken Skin Precautions</Text>
                <Text style={styles.categorySubtitle}>Emergency protocols</Text>
              </View>
            </View>
            <View style={[styles.expandCircle, expandedCategory === 'broken-skin' && styles.expandCircleActive]}>
              <Text style={styles.expandIcon}>
                {expandedCategory === 'broken-skin' ? '▲' : '▼'}
              </Text>
            </View>
          </TouchableOpacity>

          {expandedCategory === 'broken-skin' && (
            <View style={styles.categoryContent}>
              
              {/* Emergency Alert */}
              <View style={styles.brokenSkinAlert}>
                <View style={styles.emergencyIconCircle}>
                  <Text style={styles.brokenSkinIcon}>🚨</Text>
                </View>
                <Text style={styles.brokenSkinTitle}>Stop Treatment Immediately If:</Text>
                <View style={styles.stopSignsList}>
                  <View style={styles.stopSignItem}>
                    <View style={styles.stopBullet} />
                    <Text style={styles.stopSignText}>Skin is bleeding or oozing</Text>
                  </View>
                  <View style={styles.stopSignItem}>
                    <View style={styles.stopBullet} />
                    <Text style={styles.stopSignText}>You see open wounds or raw skin</Text>
                  </View>
                  <View style={styles.stopSignItem}>
                    <View style={styles.stopBullet} />
                    <Text style={styles.stopSignText}>Severe burning or stinging occurs</Text>
                  </View>
                  <View style={styles.stopSignItem}>
                    <View style={styles.stopBullet} />
                    <Text style={styles.stopSignText}>You popped a pimple recently</Text>
                  </View>
                </View>
              </View>

              {/* Warning Item */}
              <View style={styles.warningCard}>
                <View style={styles.warningHeader}>
                  <View style={[styles.warningIconBox, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={styles.warningIcon}>⚠️</Text>
                  </View>
                  <Text style={styles.warningTitle}>Avoid Active Ingredients</Text>
                </View>
                <Text style={styles.warningDescription}>
                  Do NOT apply acids, retinoids, or benzoyl peroxide to broken skin. This can cause:
                </Text>
                <View style={styles.riskListBox}>
                  <View style={styles.riskItem}>
                    <View style={styles.riskBullet} />
                    <Text style={styles.riskText}>Severe pain and burning</Text>
                  </View>
                  <View style={styles.riskItem}>
                    <View style={styles.riskBullet} />
                    <Text style={styles.riskText}>Chemical burns</Text>
                  </View>
                  <View style={styles.riskItem}>
                    <View style={styles.riskBullet} />
                    <Text style={styles.riskText}>Delayed healing</Text>
                  </View>
                  <View style={styles.riskItem}>
                    <View style={styles.riskBullet} />
                    <Text style={styles.riskText}>Increased scarring risk</Text>
                  </View>
                </View>
              </View>

              {/* Healing Protocol */}
              <View style={styles.healingProtocol}>
                <View style={styles.healingHeader}>
                  <Text style={styles.healingIcon}>🌱</Text>
                  <Text style={styles.healingTitle}>4-Step Healing Protocol</Text>
                </View>
                
                <View style={styles.healingStep}>
                  <View style={styles.stepNumberBox}>
                    <Text style={styles.stepNumber}>1</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Cleanse Gently</Text>
                    <Text style={styles.stepText}>Use lukewarm water and gentle cleanser</Text>
                  </View>
                </View>

                <View style={styles.stepDivider} />

                <View style={styles.healingStep}>
                  <View style={styles.stepNumberBox}>
                    <Text style={styles.stepNumber}>2</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Apply Healing Ointment</Text>
                    <Text style={styles.stepText}>Use petroleum jelly or Aquaphor on broken areas</Text>
                  </View>
                </View>

                <View style={styles.stepDivider} />

                <View style={styles.healingStep}>
                  <View style={styles.stepNumberBox}>
                    <Text style={styles.stepNumber}>3</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Protect & Wait</Text>
                    <Text style={styles.stepText}>Cover with bandage if needed, wait until fully healed (3-7 days)</Text>
                  </View>
                </View>

                <View style={styles.stepDivider} />

                <View style={styles.healingStep}>
                  <View style={styles.stepNumberBox}>
                    <Text style={styles.stepNumber}>4</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Resume Treatment Slowly</Text>
                    <Text style={styles.stepText}>Start with gentler products, gradually reintroduce actives</Text>
                  </View>
                </View>
              </View>

            </View>
          )}
        </View>

        <View style={styles.emergencyCard}>
          <View style={styles.emergencyCardHeader}>
            <View style={styles.emergencyIconBox}>
              <Text style={styles.emergencyIcon}>🏥</Text>
            </View>
            <Text style={styles.emergencyTitle}>When to See a Doctor</Text>
          </View>
          <Text style={styles.emergencyText}>
            Consult a dermatologist immediately if you experience:
          </Text>
          <View style={styles.emergencyList}>
            <View style={styles.emergencyListItem}>
              <View style={styles.emergencyBullet} />
              <Text style={styles.emergencyItem}>Severe cystic or nodular acne</Text>
            </View>
            <View style={styles.emergencyListItem}>
              <View style={styles.emergencyBullet} />
              <Text style={styles.emergencyItem}>Signs of infection (fever, warmth, pus)</Text>
            </View>
            <View style={styles.emergencyListItem}>
              <View style={styles.emergencyBullet} />
              <Text style={styles.emergencyItem}>Allergic reaction (swelling, hives)</Text>
            </View>
            <View style={styles.emergencyListItem}>
              <View style={styles.emergencyBullet} />
              <Text style={styles.emergencyItem}>No improvement after 8-12 weeks</Text>
            </View>
            <View style={styles.emergencyListItem}>
              <View style={styles.emergencyBullet} />
              <Text style={styles.emergencyItem}>Worsening condition despite treatment</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? colors.background : '#F8FAFC',
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.bacground
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  alertBanner: {
    backgroundColor: isDarkMode ? '#450a0a' : '#FEF2F2',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
    borderWidth: 2,
    borderColor: isDarkMode ? '#7f1d1d' : '#FECACA',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  alertIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: isDarkMode ? '#7f1d1d' : '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertIcon: {
    fontSize: 32,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: isDarkMode ? '#fca5a5' : '#991B1B',
    marginBottom: 6,
  },
  alertText: {
    fontSize: 14,
    color: isDarkMode ? '#f87171' : '#B91C1C',
    lineHeight: 20,
    fontWeight: '500',
  },

  categoryCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    marginBottom: 20,
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
    gap: 16,
  },

  warningCard: {
    backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: isDarkMode ? colors.border : '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  warningIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 22,
  },
  warningTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: isDarkMode ? '#fca5a5' : '#DC2626',
    flex: 1,
  },
  warningDescription: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
    marginBottom: 14,
  },
  consequenceBox: {
    backgroundColor: isDarkMode ? '#7f1d1d' : '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  consequenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  consequenceIcon: {
    fontSize: 16,
  },
  consequenceLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: isDarkMode ? '#fca5a5' : '#991B1B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  consequenceList: {
    gap: 8,
  },
  consequenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: isDarkMode ? '#f87171' : '#DC2626',
  },
  consequenceText: {
    fontSize: 13,
    color: isDarkMode ? '#f87171' : '#B91C1C',
    fontWeight: '500',
    flex: 1,
  },
  doInsteadBox: {
    backgroundColor: isDarkMode ? '#064e3b' : '#ECFDF5',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  doInsteadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  doInsteadIcon: {
    fontSize: 16,
    color: '#10B981',
  },
  doInsteadLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: isDarkMode ? '#6ee7b7' : '#065F46',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  doInsteadText: {
    fontSize: 13,
    color: isDarkMode ? '#34d399' : '#047857',
    lineHeight: 19,
    fontWeight: '500',
  },

  conflictCard: {
    backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  riskBadgeContainer: {
    marginBottom: 12,
  },
  highRiskBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  mediumRiskBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  conflictTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
    lineHeight: 22,
  },
  conflictDescription: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 21,
    marginBottom: 14,
  },
  solutionBox: {
    backgroundColor: isDarkMode ? '#1e3a8a' : '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  solutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  solutionIcon: {
    fontSize: 16,
  },
  solutionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: isDarkMode ? '#93c5fd' : '#1E40AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  solutionText: {
    fontSize: 13,
    color: isDarkMode ? '#bfdbfe' : '#1E3A8A',
    lineHeight: 19,
    fontWeight: '500',
  },
  guidelinesBox: {
    backgroundColor: isDarkMode ? '#064e3b' : '#F0FDF4',
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? '#065f46' : '#BBF7D0',
  },
  guidelinesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  guidelinesIcon: {
    fontSize: 20,
  },
  guidelinesTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: isDarkMode ? '#6ee7b7' : '#166534',
  },
  guidelinesList: {
    gap: 12,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  guidelinesText: {
    fontSize: 13,
    color: isDarkMode ? '#a7f3d0' : '#15803D',
    lineHeight: 20,
    fontWeight: '500',
    flex: 1,
  },

  brokenSkinAlert: {
    backgroundColor: '#DC2626',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  emergencyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  brokenSkinIcon: {
    fontSize: 40,
  },
  brokenSkinTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  stopSignsList: {
    width: '100%',
    gap: 10,
  },
  stopSignItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stopBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  stopSignText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    fontWeight: '600',
    flex: 1,
  },
  riskListBox: {
    backgroundColor: isDarkMode ? '#450a0a' : '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  riskBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  riskText: {
    fontSize: 13,
    color: isDarkMode ? '#f87171' : '#DC2626',
    fontWeight: '500',
    flex: 1,
  },
  healingProtocol: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  healingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary + '30',
  },
  healingIcon: {
    fontSize: 28,
  },
  healingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  healingStep: {
    flexDirection: 'row',
    gap: 16,
  },
  stepNumberBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
    paddingTop: 2,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  stepText: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 19,
  },
  stepDivider: {
    height: 16,
    marginLeft: 22,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    borderStyle: 'dashed',
  },

  emergencyCard: {
    backgroundColor: isDarkMode ? '#451a03' : '#FFFBEB',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: isDarkMode ? '#92400e' : '#FDE68A',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  emergencyCardHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  emergencyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: isDarkMode ? '#78350f' : '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyIcon: {
    fontSize: 40,
  },
  emergencyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: isDarkMode ? '#fcd34d' : '#92400E',
    textAlign: 'center',
    marginBottom: 8,
  },
  emergencyText: {
    fontSize: 14,
    color: isDarkMode ? '#fbbf24' : '#78350F',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  emergencyList: {
    backgroundColor: isDarkMode ? '#78350f' : '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  emergencyListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  emergencyBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: isDarkMode ? '#fcd34d' : '#92400E',
    marginTop: 6,
  },
  emergencyItem: {
    fontSize: 13,
    color: isDarkMode ? '#fef3c7' : '#92400E',
    lineHeight: 20,
    fontWeight: '600',
    flex: 1,
  },
});