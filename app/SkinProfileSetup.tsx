import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../FirebaseConfig';

import { Ionicons } from '@expo/vector-icons';

export interface SkinProfileData {
  displayName: string;
  avatarIcon: string;
  themeColor: string;
  skinType: string | null;
  acneTypes: string[];
  triggers: string[];
  currentProducts: string[];
}

const SKIN_TYPES = ["Oily", "Dry", "Combination", "Sensitive"];
const ACNE_TYPES = [
  "Whiteheads",
  "Blackheads",
  "Papules",
  "Pustules",
  "Nodules",
  "Cystic",
  "Hormonal",
];
const TRIGGERS = ["Dairy", "Sugar", "Stress", "Lack of sleep", "Menstrual cycle"];

const AVAILABLE_AVATARS = ['person', 'sunny', 'moon', 'leaf', 'water', 'flower', 'star', 'heart', 'flash', 'rose', 'paw', 'planet'];
const PRESET_COLORS = ['#4F46E5', '#EC4899', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#64748B'];

export default function SkinProfileSetup() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [avatarIcon, setAvatarIcon] = useState('person');
  const [themeColor, setThemeColor] = useState('#4F46E5');
  const [isAvatarModalVisible, setAvatarModalVisible] = useState(false);

  const [skinType, setSkinType] = useState<string | null>(null);
  const [selectedAcneTypes, setSelectedAcneTypes] = useState<string[]>([]);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [currentProduct, setCurrentProduct] = useState("");
  const [productsList, setProductsList] = useState<string[]>([]);
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        setIsInitialLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as SkinProfileData;
          setSkinType(data.skinType);
          setSelectedAcneTypes(data.acneTypes || []);
          setSelectedTriggers(data.triggers || []);
          setProductsList(data.currentProducts || []);

          setDisplayName(data.displayName || "");
          setAvatarIcon(data.avatarIcon || 'person');
          setThemeColor(data.themeColor || '#4F46E5');

        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const toggleAcneType = (type: string) => {
    setSelectedAcneTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(trigger) ? prev.filter((t) => t !== trigger) : [...prev, trigger]
    );
  };

  const addProduct = () => {
    if (currentProduct.trim()) {
      setProductsList([...productsList, currentProduct.trim()]);
      setCurrentProduct("");
    }
  };

  const removeProduct = (index: number) => {
    setProductsList(productsList.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to save your profile.");
        return;
    }

    if (!displayName.trim()) {
      alert("Please enter your name.");
      return;
    }

    const profileData: SkinProfileData = {
      displayName: displayName.trim(),
      avatarIcon,
      themeColor,
      skinType,
      acneTypes: selectedAcneTypes,
      triggers: selectedTriggers,
      currentProducts: productsList,
    };

    setIsSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), profileData, { merge: true });
      
      console.log("Profile saved to Firestore!");
      router.replace("/Home"); 
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = () => {
    router.back(); 
  };

  const isValid = skinType !== null && selectedAcneTypes.length > 0;

  if (isInitialLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ textAlign: 'center', marginTop: 10, color: '#6B7280' }}>Loading your profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </Pressable>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Your Skin Profile</Text>
            <Text style={styles.headerSubtitle}>
              Help us understand your skin better
            </Text>
          </View>
        </View>

        {/* 1. Profile Header Card */}
        <View style={styles.profileCard}>
          <Pressable
            onPress={() => setAvatarModalVisible(true)}
            style={[styles.avatar, { backgroundColor: themeColor }]}
          >
            <Ionicons name={avatarIcon as any} size={36} color="white" />
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={12} color="white" />
            </View>
          </Pressable>

          <TextInput
            style={styles.profileNameInput}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your name..."
            placeholderTextColor="#94a3b8"
            maxLength={20}
          />
          <Text style={styles.profileSubtext}>Tap avatar to customize</Text>
        </View>

        {/* Skin Type Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skin Type</Text>
          <Text style={styles.sectionDescription}>Select your skin type</Text>
          <View style={styles.gridContainer}>
            {SKIN_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => setSkinType(type)}
                style={[
                  styles.skinTypeCard,
                  skinType === type && styles.skinTypeCardSelected,
                ]}
              >
                <Text
                  style={[
                    styles.skinTypeText,
                    skinType === type && styles.skinTypeTextSelected,
                  ]}
                >
                  {type}
                </Text>
                {skinType === type && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Acne Types Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acne Types</Text>
          <Text style={styles.sectionDescription}>
            Select all that apply (required)
          </Text>
          <View style={styles.chipsContainer}>
            {ACNE_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => toggleAcneType(type)}
                style={[
                  styles.chip,
                  selectedAcneTypes.includes(type) && styles.chipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedAcneTypes.includes(type) && styles.chipTextSelected,
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Triggers Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Known Triggers</Text>
          <Text style={styles.sectionDescription}>
            Select what you think affects your skin
          </Text>
          <View style={styles.triggersContainer}>
            {TRIGGERS.map((trigger) => (
              <Pressable
                key={trigger}
                onPress={() => toggleTrigger(trigger)}
                style={styles.triggerItem}
              >
                <View
                  style={[
                    styles.checkbox,
                    selectedTriggers.includes(trigger) && styles.checkboxChecked,
                  ]}
                >
                  {selectedTriggers.includes(trigger) && (
                    <Text style={styles.checkboxCheck}>✓</Text>
                  )}
                </View>
                <Text style={styles.triggerText}>{trigger}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Current Products Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Products (Optional)</Text>
          <Text style={styles.sectionDescription}>
            Add products you're currently using
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={currentProduct}
              onChangeText={setCurrentProduct}
              placeholder="Enter product name"
              placeholderTextColor="#9CA3AF"
              onSubmitEditing={addProduct}
              returnKeyType="done"
            />
            <Pressable onPress={addProduct} style={styles.addButton}>
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>
          </View>

          {productsList.length > 0 && (
            <View style={styles.productsList}>
              {productsList.map((product, index) => (
                <View key={index} style={styles.productItem}>
                  <Text style={styles.productText}>{product}</Text>
                  <Pressable onPress={() => removeProduct(index)}>
                    <Text style={styles.removeButton}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Continue Button */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleComplete}
            disabled={!isValid || isSaving}
            style={[styles.continueButton, (!isValid || isSaving) && styles.continueButtonDisabled]}
          >
            {isSaving ? (
                <ActivityIndicator color="#FFF" />
            ) : (
                <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </Pressable>
          {!isValid && (
            <Text style={styles.validationText}>
              Please select your skin type and at least one acne type
            </Text>
          )}
        </View>

        <Modal visible={isAvatarModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Customize Avatar</Text>
              <Text style={styles.modalSubtitle}>Make it yours</Text>
            </View>

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
                  />
                ))}
              </View>
            </View>

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
                  >
                    <Ionicons
                      name={item as any}
                      size={24}
                      color={avatarIcon === item ? 'white' : '#1e293b'}
                    />
                  </TouchableOpacity>
                )}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalDoneButton, { backgroundColor: themeColor }]}
              onPress={() => setAvatarModalVisible(false)}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </SafeAreaView>
  );
  
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 24,
    color: '#3B82F6',
    fontWeight: '700',
  },
  headerTextContainer: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  section: {
    marginBottom: 32,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 30,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  skinTypeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    borderWidth: 3,
    borderColor: '#F1F5F9',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    position: 'relative',
  },
  skinTypeCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    transform: [{ scale: 1.02 }],
  },
  skinTypeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  skinTypeTextSelected: {
    color: '#3B82F6',
  },
  checkmark: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  chipSelected: {
    backgroundColor: '#3B82F6',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  triggersContainer: {
    gap: 10,
  },
  triggerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 20,
    gap: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  triggerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  addButton: {
    backgroundColor: '#6366F1',
    width: 48,
    height: 48,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  productsList: {
    gap: 10,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    padding: 14,
    borderRadius: 15,
  },
  productText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
  },
  removeButton: {
    fontSize: 18,
    color: '#F43F5E',
    fontWeight: '900',
    paddingLeft: 12,
  },
  footer: {
    marginTop: 20,
  },
  continueButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  continueButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  validationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F43F5E',
    textAlign: 'center',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    padding: 30,
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontStyle: 'italic',
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 14,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
  },
  colorCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    borderColor: '#F1F5F9',
  },
  colorCircleSelected: {
    borderColor: '#3B82F6',
    transform: [{ scale: 1.1 }],
  },
  avatarOption: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F8FAFC',
    margin: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  modalDoneButton: {
    backgroundColor: '#1E293B',
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: 'center',
  },
  modalDoneText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 35,
    padding: 30,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 6,
    borderColor: '#F1F5F9',
  },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 5,
    backgroundColor: '#1E293B',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  profileNameInput: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1E293B',
    textAlign: 'center',
    padding: 10,
  },
  profileSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 4,
  },
});