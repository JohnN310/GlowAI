import { useRouter } from 'expo-router';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ChevronLeft, Plus, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Animated,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../app/theme/ThemeContext';
import { auth, db } from '../FirebaseConfig';

type AvatarMood = 'glowing' | 'calm' | 'irritated';
type ProductType = 'cleanser' | 'toner' | 'treatment' | 'moisturizer' | 'sunscreen';

interface Product {
  id: string;
  type: ProductType;
  name: string;
  emoji: string;
  color: string;
}

interface RoutineSlot {
  id: string;
  position: number;
  product: Product | null;
}

const AVATAR_MOODS: Record<AvatarMood, { emoji: string; text: string; color: string }> = {
  glowing: { emoji: '✨', text: 'Perfect routine!', color: '#10B981' },
  calm: { emoji: '😊', text: 'Build your ritual', color: '#60A5FA' },
  irritated: { emoji: '😖', text: 'Conflict detected!', color: '#F87171' },
};

const AVAILABLE_PRODUCTS: Product[] = [
  { id: 'p1', type: 'cleanser', name: 'Cleanser', emoji: '🧼', color: '#DBEAFE' },
  { id: 'p2', type: 'treatment', name: 'Serum', emoji: '💧', color: '#E0E7FF' },
  { id: 'p3', type: 'treatment', name: 'Niacinamide', emoji: '💊', color: '#FCE7F3' },
  { id: 'p4', type: 'treatment', name: 'Retinol', emoji: '⚗️', color: '#FEF3C7' },
  { id: 'p5', type: 'moisturizer', name: 'Moisturizer', emoji: '🧴', color: '#D1FAE5' },
  { id: 'p6', type: 'sunscreen', name: 'Sunscreen', emoji: '☀️', color: '#FED7AA' },
];

const AvatarReaction = ({ mood }: { mood: AvatarMood }) => {
  const moodData = AVATAR_MOODS[mood];
  const pulseAnim = useRef(new Animated.Value(1)).current;

const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.avatarContainer}>
      <Animated.View style={[styles.avatarCircle, { borderColor: moodData.color, backgroundColor: moodData.color + '15', transform: [{ scale: pulseAnim }] }]}>
        <Text style={styles.avatarEmoji}>{moodData.emoji}</Text>
      </Animated.View>
      <View style={[styles.avatarBubble, { backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF' }]}>
        <Text style={[styles.avatarText, { color: moodData.color }]}>{moodData.text}</Text>
      </View>
    </View>
  );
};

export default function RoutineLabBuilder() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);
  
  const [timeOfDay, setTimeOfDay] = useState<'AM' | 'PM'>('AM');
  const [advancedMode, setAdvancedMode] = useState(false);

  const [amSlots, setAmSlots] = useState<RoutineSlot[]>(Array.from({ length: 5 }, (_, i) => ({ id: `am-${i}`, position: i + 1, product: null })));
  const [pmSlots, setPmSlots] = useState<RoutineSlot[]>(Array.from({ length: 5 }, (_, i) => ({ id: `pm-${i}`, position: i + 1, product: null })));

  const currentSlots = timeOfDay === 'AM' ? amSlots : pmSlots;
  const setSlots = timeOfDay === 'AM' ? setAmSlots : setPmSlots;
  const [isModalVisible, setIsModalVisible] = useState(false);
    
  const [customName, setCustomName] = useState('');
    
  const [customEmoji, setCustomEmoji] = useState('🧪');

    
  const [availableProducts, setAvailableProducts] = useState<Product[]>(AVAILABLE_PRODUCTS);

  const [hasChanges, setHasChanges] = useState(false);

  const initialDataRef = useRef<{ am: any[]; pm: any[] }>({ am: [], pm: [] });

  const handleDeleteSlot = (slotId: string) => {
  setSlots(prev => {
    const filtered = prev.filter(s => s.id !== slotId);
    return filtered.map((s, index) => ({ ...s, position: index + 1 }));
  });
};

  const handleAddSlot = () => {
    setSlots(prev => {
      if (prev.length >= 10) { 
        Alert.alert("Limit Reached", "You can have up to 10 steps per routine.");
        return prev;
      }
      const newId = `${timeOfDay.toLowerCase()}-${Date.now()}`;
      return [...prev, { id: newId, position: prev.length + 1, product: null }];
    });
  };

  useEffect(() => {
  const fetchSavedRoutine = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        if (userData.builtRoutine) {
          const { am, pm } = userData.builtRoutine;
          initialDataRef.current = { am: am || [], pm: pm || [] };

          const rebuildSlots = (savedSlots: any[], type: 'am' | 'pm') => {
            let base = Array.from({ length: 5 }, (_, i) => ({ 
              id: `${type}-${i}`, 
              position: i + 1, 
              product: null 
            }));

            if (savedSlots && savedSlots.length > 0) {
              const maxPosition = Math.max(...savedSlots.map(s => s.position), 5);
              
              base = Array.from({ length: maxPosition }, (_, i) => {
                const saved = savedSlots.find(s => s.position === i + 1);
                return saved ? saved : { id: `${type}-${i}`, position: i + 1, product: null };
              });
            }
            return base;
          };

          setAmSlots(rebuildSlots(am, 'am'));
          setPmSlots(rebuildSlots(pm, 'pm'));
        }

        if (userData.allIngredients) {
          setAvailableProducts(userData.allIngredients);
        }
      }

    } catch (error) {
      console.error("Error fetching saved routine:", error);
    }
  };

  fetchSavedRoutine();
}, []);

  // useEffect(() => {
  //   const getActiveProductIds = (slots: RoutineSlot[]) => 
  //     slots.filter(s => s.product !== null).map(s => s.product!.id);

  //   const currentAmIds = getActiveProductIds(amSlots);
  //   const currentPmIds = getActiveProductIds(pmSlots);

  //   const initialAmIds = initialDataRef.current.am.map((p: any) => p.id);
  //   const initialPmIds = initialDataRef.current.pm.map((p: any) => p.id);

  //   const isDifferent = 
  //     JSON.stringify(currentAmIds) !== JSON.stringify(initialAmIds) ||
  //     JSON.stringify(currentPmIds) !== JSON.stringify(initialPmIds);

  //   setHasChanges(isDifferent);
  // }, [amSlots, pmSlots]);

  useEffect(() => {
  const getComparisonString = (slots: RoutineSlot[]) => {
    return JSON.stringify(
      slots
        .filter(s => s.product !== null)
        .map(s => ({
          productId: s.product?.id,
          pos: s.position
        }))
        .sort((a, b) => a.pos - b.pos) 
    );
  };

  const currentAmString = getComparisonString(amSlots);
  const currentPmString = getComparisonString(pmSlots);

  const initialAmString = JSON.stringify(
    initialDataRef.current.am.map((s: any) => ({
      productId: s.product?.id,
      pos: s.position
    })).sort((a: any, b: any) => a.pos - b.pos)
  );

  const initialPmString = JSON.stringify(
    initialDataRef.current.pm.map((s: any) => ({
      productId: s.product?.id,
      pos: s.position
    })).sort((a: any, b: any) => a.pos - b.pos)
  );

  const isDifferent = 
    currentAmString !== initialAmString || 
    currentPmString !== initialPmString;

  setHasChanges(isDifferent);
}, [amSlots, pmSlots]);

  const handleToggleProduct = (product: Product) => {
    const existingIndex = currentSlots.findIndex(s => s.product?.id === product.id);
    
    if (existingIndex !== -1) {
      setSlots(prev => prev.map((s, i) => i === existingIndex ? { ...s, product: null } : s));
    } else {
      const emptyIndex = currentSlots.findIndex(s => s.product === null);
      if (emptyIndex !== -1) {
        setSlots(prev => prev.map((s, i) => i === emptyIndex ? { ...s, product } : s));
      }
    }
  };

  const avatarMood: AvatarMood = useMemo(() => {
    const products = currentSlots.filter(s => s.product).map(s => s.product?.name);
    if (products.some(p => p?.includes('Retinol')) && products.some(p => p?.includes('Benzoyl'))) return 'irritated';
    if (products.length >= 3) return 'glowing';
    return 'calm';
  }, [currentSlots]);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be logged in to save your routine.");
      return;
    }

      const formatSlotsForStorage = (slots: RoutineSlot[]) => 
      slots
      .filter(slot => slot.product !== null) 
      .map(slot => ({
        id: slot.id,
        position: slot.position, 
        product: slot.product, 
      }));

      const builtRoutine = {
        am: formatSlotsForStorage(amSlots),
        pm: formatSlotsForStorage(pmSlots),
      };

    try {
      await setDoc(doc(db, "users", user.uid), {
        builtRoutine: builtRoutine
      }, { merge: true });

      initialDataRef.current = JSON.parse(JSON.stringify(builtRoutine));      
      setHasChanges(false);

      Alert.alert("Success", "Routine saved to your profile! ✨", [
        { text: "OK", onPress: () => router.push("/SkinHub") }
      ]);
    } catch (error) {
      console.error("Error saving routine:", error);
      Alert.alert("Error", "Failed to save routine. Please try again.");
    }
  };

const handleAddCustom = async () => {
  if (!customName.trim() || !auth.currentUser) return;

  const newProduct: Product = {
    id: Date.now().toString(),
    type: 'treatment',
    name: customName.trim(),
    emoji: customEmoji,
    color: isDarkMode ? '#1E293B' : '#F1F5F9',
  };

  try {
    const userRef = doc(db, "users", auth.currentUser.uid);
    const updatedList = [newProduct, ...availableProducts];

    await updateDoc(userRef, {
      allIngredients: updatedList
    });

    setAvailableProducts(updatedList);
    setCustomName('');
    setIsModalVisible(false);
  } catch (error) {
    Alert.alert("Error", "Could not save product.");
  }
};

const handleDeleteIngredient = async (productId: string) => {
  const user = auth.currentUser;
  const productToDelete = availableProducts.find(p => p.id === productId);

  if (!productToDelete) return;

  Alert.alert(
    "Delete Ingredient",
    `Are you sure you want to remove ${productToDelete.name}?`,
    [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
      
          const updatedList = availableProducts.filter(p => p.id !== productId);
          
          setAvailableProducts(updatedList);
          setAmSlots(prev => prev.map(s => s.product?.id === productId ? { ...s, product: null } : s));
          setPmSlots(prev => prev.map(s => s.product?.id === productId ? { ...s, product: null } : s));

          if (user) {
            try {
              const userRef = doc(db, "users", user.uid);
              await updateDoc(userRef, {
                allIngredients: updatedList
              });
            } catch (e) {
              console.error("Error deleting from cloud:", e);
            }
          }
        } 
      }
    ]
  );
};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Centered Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backCircle}><ChevronLeft size={24} color={colors.primary} /></View>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Routine Lab</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AvatarReaction mood={avatarMood} />

        {/* AM/PM Toggle */}
        <View style={styles.toggleContainer}>
          {(['AM', 'PM'] as const).map(mode => (
            <TouchableOpacity key={mode} style={[styles.toggleBtn, timeOfDay === mode && styles.toggleActive]} onPress={() => setTimeOfDay(mode)}>
              <Text style={[styles.toggleLabel, timeOfDay === mode && styles.toggleLabelActive]}>{mode === 'AM' ? '☀️ MORNING' : '🌙 EVENING'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Builder Slots */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
            <Text style={styles.sectionTitle}>Step-by-Step Routine</Text>
            <Text style={styles.instructionText}>Hold a step to remove it</Text>
            </View>
            <TouchableOpacity style={styles.addBtnSmall} onPress={handleAddSlot}>
              <Plus size={16} color="#FFF" />
              <Text style={styles.addBtnText}>ADD STEP</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.slotsGrid}>
            {currentSlots.map((slot) => (
            <TouchableOpacity 
                  key={slot.id} 
                  onLongPress={() => handleDeleteSlot(slot.id)}
                  activeOpacity={0.7}
                  style={[styles.slotCard, slot.product && styles.slotCardActive]}
                >                
                <View style={[styles.slotIcon, { backgroundColor: slot.product ? slot.product.color : (isDarkMode ? '#0F172A' : '#F1F5F9') }]}>
                  {slot.product ? <Text style={styles.slotEmoji}>{slot.product.emoji}</Text> : <Plus size={20} color="#94A3B8" />}
                </View>
                <View style={styles.slotInfo}>
                  <Text style={styles.slotStepText}>STEP {slot.position}</Text>
                  <Text style={styles.slotNameText} numberOfLines={1}>{slot.product ? slot.product.name : 'Empty Slot'}</Text>
                </View>
                {slot.product && (
                  <TouchableOpacity onPress={() => handleToggleProduct(slot.product!)} style={styles.removeBtn}>
                    <X size={14} color="#F87171" />
                  </TouchableOpacity>
                )}

              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Product Selection Section */}
        <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Available Ingredients</Text>
            <Text style={styles.instructionText}>Hold an ingredient to remove it</Text>
          </View>
            <TouchableOpacity 
            style={styles.addBtnSmall} 
            onPress={() => setIsModalVisible(true)}
            >
            <Plus size={16} color="#FFF" />
            <Text style={styles.addBtnText}>ADD NEW</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.productsGrid}>
            {availableProducts.map((product) => {
            const isSelected = currentSlots.some(s => s.product?.id === product.id);
            return (
                <TouchableOpacity 
                key={product.id} 
                onLongPress={() => {
                    handleDeleteIngredient(product.id);
                }}
                onPress={() => handleToggleProduct(product)} 
                style={[styles.productItem, isSelected && styles.productItemActive]}
                >
                <View style={[styles.productEmojiBox, { backgroundColor: product.color }]}>
                    <Text style={{ fontSize: 24 }}>{product.emoji}</Text>
                </View>
                <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                {isSelected && <View style={styles.selectedDot} />}
                </TouchableOpacity>
            );
            })}
        </View>
        </View>

        {hasChanges ? (
        <TouchableOpacity style={styles.saveButton} onPress={() => handleSave()}>
            <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}

      </ScrollView>
        <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Product</Text>
            
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Product Name</Text>
                <TextInput
                style={styles.modalInput}
                placeholder="e.g., Vitamin C Serum"
                placeholderTextColor="#94A3B8"
                value={customName}
                onChangeText={setCustomName}
                autoFocus
                />
            </View>

            <View style={styles.emojiPickerRow}>
            {['🧪', '🧴', '✨', '💧', '🌿', '🧬', '🛡️', '🧊'].map(e => (
                <TouchableOpacity 
                key={e} 
                onPress={() => setCustomEmoji(e)}
                style={[
                    styles.emojiOption, 
                    customEmoji === e && styles.emojiSelected 
                ]}
                >
                <Text style={{ fontSize: 24 }}>{e}</Text>
                </TouchableOpacity>
            ))}
            </View>

            <View style={styles.modalActions}>
                <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setIsModalVisible(false)}
                >
                <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]} 
                onPress={handleAddCustom}
                >
                <Text style={styles.confirmBtnText}>Add to Lab</Text>
                </TouchableOpacity>
            </View>
            </View>
        </View>
        </Modal>
    </SafeAreaView>
    
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 70 },
  backCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center', elevation: 3 },
    backButton: {
    padding: 4,
  },
  headerTitleContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: isDarkMode ? '#FFF' : '#1E293B'},
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  avatarContainer: { alignItems: 'center', marginVertical: 20 },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
  avatarEmoji: { fontSize: 40 },
  avatarBubble: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, elevation: 4 },
  avatarText: { fontSize: 14, fontWeight: '900' },

  toggleContainer: { flexDirection: 'row', backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0', borderRadius: 16, padding: 4, marginBottom: 25 },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  toggleActive: { backgroundColor: colors.primary, elevation: 4 },
  toggleLabel: { fontSize: 12, fontWeight: '900', color: '#64748B' },
  toggleLabelActive: { color: '#FFF' },

  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: isDarkMode ? '#FFF' : '#1E293B', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  
  slotsGrid: { gap: 12 },
  slotCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 20, backgroundColor: isDarkMode ? '#1E293B' : '#FFF', borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0' },
  slotCardActive: { borderColor: colors.primary, borderWidth: 2 },
  slotIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  slotEmoji: { fontSize: 24 },
  slotInfo: { flex: 1, marginLeft: 15 },
  slotStepText: { fontSize: 11, fontWeight: '800', color: '#94A3B8' },
  slotNameText: { fontSize: 17, fontWeight: '700', color: isDarkMode ? '#FFF' : '#1E293B' },
  removeBtn: { padding: 8, backgroundColor: '#FEE2E2', borderRadius: 10 },

  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  productItem: { width: '30%', backgroundColor: isDarkMode ? '#1E293B' : '#FFF', padding: 12, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0' },
  productEmojiBox: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
//   productName: { fontSize: 10, fontWeight: '800', textAlign: 'center', color: isDarkMode ? '#94A3B8' : '#64748B' },
  selectedDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },

//   saveButton: { borderRadius: 22, overflow: 'hidden', marginTop: 10, elevation: 8 },
  saveGradient: { paddingVertical: 18, alignItems: 'center' },
//   saveText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  addBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  productItemActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: isDarkMode ? '#1E293B' : '#EFF6FF',
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    color: isDarkMode ? '#FFF' : '#1E293B',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)', // Deep navy overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: isDarkMode ? '#FFF' : '#1E293B',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: isDarkMode ? '#0F172A' : '#F1F5F9',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontWeight: '700',
    color: isDarkMode ? '#FFF' : '#1E293B',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
    marginVertical: 20,
  },
  emojiOption: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#0F172A' : '#F1F5F9',
    marginBottom: 8,
  },
  emojiSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: isDarkMode ? '#1E293B' : '#DBEAFE',
    transform: [{ scale: 1.05 }],
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontWeight: '800',
    color: '#94A3B8',
  },
  confirmBtn: {
    flex: 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 16,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 10, 
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94A3B8', 
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
      saveButton: {
      backgroundColor: '#10B981', 
      borderRadius: 24,
      padding: 18,
      alignItems: 'center',
      marginTop: 0,
    },
    saveText: {
      fontSize: 19,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    instructionText: {
      fontSize: 12,
      color: '#94A3B8', 
      marginTop: -10,   
      marginBottom: 10,
      fontWeight: '500',
    },
});