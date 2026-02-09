import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { auth, db } from '../../FirebaseConfig';

type Theme = 'light' | 'dark';

export type ThemeColors = {
  background: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
  primary: string;
  surface: string;
};

type ThemeContextType = {
  theme: Theme;
  colors: ThemeColors; 
  isDarkMode: boolean; 
  toggleTheme: () => void;
};

const lightColors: ThemeColors = {
  background: '#F9FAFB', 
  card: '#FFFFFF',       
  text: '#111827',      
  subtext: '#6B7280',    
  border: '#E5E7EB',     
  primary: '#4F46E5',    
  surface: '#F3F4F6',
  //@ts-ignore
  cardAccentBlue: '#F0F9FF',
  cardAccentPink: '#FDF2F8',
  cardAccentGreen: '#F0FDF4',
  bannerBackground: '#EEF2FF',
  bannerText: '#4338CA',
  borderBottomColor: '#F3F4F6',
  // Added colors 
  background2: '#FDFCFB',
  headerBackground: '#ffffff',
  cardBackground: '#f3fcffff',
  cardPhotoBackground: '#f1f1f1ff',
  statValue: '#111827',
  statLabel: '#4B5563',
  filterTabActive: '#F43F5E',
  filterTabText: '#6B7280',
  filterTabTextActive:'#FFF',
  shadowColor: '#000',
  textPrimary: '#111827',  
  textMuted: '#6B7280',     

  accent: '#F43F5E',        
  onAccent: '#FFFFFF',
  onAccentMuted: 'rgba(255,255,255,0.8)',

  alertBackground: '#FFF1F2', 
  alertBorder: '#FECDD3',     
  alertTitle: '#9F1239',      
  alertText: '#881337',      

  safeBackground: '#F0FDF4',  
  safeBorder: '#DCFCE7',      
  safeText: '#166534',        

  // emptyIconBg: '#FFF1F2',     

  riskBadgeBorder: 'rgba(255,255,255,0.3)',

  cardBorder: '#E5E7EB',

  backgroundAlt: '#F9FAFB',

  textSecondary: '#374151',

  headerBorder: '#F3F4F6',

  accentSoft: '#EEF2FF',
  accentBorder: '#FA9DA8',

  dangerBg: '#FEE2E2',
  dangerBorder: '#FECACA',
  dangerText: '#991B1B',

  warningBg: '#FEF3C7',

  // safeBackground: '#D1FAE5',
  // safeBorder: '#6EE7B7',
  // safeText: '#065F46',

  shadow: '#000',

  meterInactive: '#E5E7EB',

  badgeBorderColor: '#C7D2FE',

  label: '#6366F1',

  // Added colors 2
  errorTitle: '#DC2626',

  retry: '#FA9DA8',

  emptyIconBg: '#FEE2E8',

  chipBackground: '#F5F3FF',

  chipBorder: '#DDD6FE',

  regionTextColor: '#6B21A8',

  saveColor: '#10B981',

  inputBorder: 'transparent',

  // Added colors 3
  buttonPrimaryShadow: '#6366F1',
  scoreMax: '#9CA3AF',
  routineBg: '#F9FAFB',
  routineLabel: '#4B5563',
  insightBorder: '#FEF3C7',
  insightText: '#92400E',
  treatmentIconBg: '#EEF2FF',
  safetyIconBg: '#FFFBEB',
  safetyButtonShadow: '#F59E0B',
  buttonTitle: '#1F2937',

};

const darkColors: ThemeColors = {
  background: '#0F172A', 
  card: '#1E293B',       
  text: '#F8FAFC',       
  subtext: '#94A3B8',    
  border: '#334155',     
  primary: '#818CF8',    
  surface: '#0F172A',
  //@ts-ignore
  cardAccentBlue: '#0C4A6E', 
  cardAccentPink: '#831843', 
  cardAccentGreen: '#064E3B', 
  bannerBackground: '#312E81',
  bannerText: '#E0E7FF',
  borderBottomColor: '#374151',
  // Added colors
  background2: '#0F172A',       
  headerBackground: '#1E293B',
  cardBackground: '#1E293B',

  cardPhotoBackground: '#273449',
  
  statValue: '#333435ff',
  statLabel: '#9CA3AF',
  filterTabActive: '#FB7185',   
  filterTabText: '#9CA3AF',      
  filterTabTextActive: '#020617',
  shadowColor: '#00000000',
  textPrimary: '#F9FAFB',     
  textMuted: '#9CA3AF',       

  accent: '#FB7185',          
  onAccent: '#020617',
  onAccentMuted: 'rgba(2,6,23,0.7)',

  alertBackground: 'rgba(251,113,133,0.12)',
  alertBorder: 'rgba(251,113,133,0.35)',
  alertTitle: '#FB7185',
  alertText: '#FDA4AF',

  safeBackground: '#D1FAE5',
  safeBorder: '#6EE7B7',
  safeText: '#065F46',

  riskBadgeBorder: 'rgba(255,255,255,0.18)',


  cardBorder: '#374151',         
  backgroundAlt: '#1E293B',       
  textSecondary: '#CBD5E1',       
  headerBorder: '#334155',        
  accentSoft: 'rgba(99,102,241,0.15)',  
  accentBorder: 'rgba(251,113,133,0.4)',

  dangerBg: 'rgba(239,68,68,0.15)',     
  dangerBorder: 'rgba(239,68,68,0.4)',   
  dangerText: '#FCA5A5',                
  warningBg: 'rgba(251,191,36,0.18)',    

  // // Safe (uncomment when ready)
  // safeBackground: 'rgba(34,197,94,0.15)',
  // safeBorder: 'rgba(34,197,94,0.4)',
  // safeText: '#4ADE80',

  shadow: '#00000000',            
  meterInactive: '#334155',       
  badgeBorderColor: 'rgba(255,255,255,0.18)',
  label: '#A5B4FC',        
  
  // Added colors 2
  errorTitle: '#F87171',          
  retry: '#FB7185',              
  emptyIconBg: 'rgba(251,113,133,0.15)',

  chipBackground: 'rgba(139,92,246,0.18)', 
  chipBorder: 'rgba(139,92,246,0.4)',

  regionTextColor: '#C4B5FD',     
  saveColor: '#22C55E',          

  inputBorder: '#334155',
  
  // Added colors 3
  buttonPrimaryShadow: '#00000000',
  scoreMax: '#94A3B8',
  routineBg: '#1E293B',
  routineLabel: '#CBD5E1',
  insightBorder: 'rgba(251,191,36,0.3)',
  insightText: '#FDE68A',
  treatmentIconBg: 'rgba(99,102,241,0.15)',
  safetyIconBg: 'rgba(251,191,36,0.15)',
  safetyButtonShadow: '#B45309', 
  buttonTitle: '#F9FAFB', 

};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        
        const unsubSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Map the boolean to theme string
            setTheme(data.darkMode === true ? 'dark' : 'light');
          }
        });

        // Clean up snapshot listener if user logs out
        return () => unsubSnapshot();
      } else {
        // Fallback to light theme if logged out
        setTheme('light');
      }
    });

    return () => unsubAuth();
  }, []);

  // Logic to update Firestore when toggle
  const toggleTheme = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';

    setTheme(nextTheme);

    try {
      await updateDoc(doc(db, "users", user.uid), {
        darkMode: nextTheme === 'dark'
      });
    } catch (error) {
      console.error("Error updating theme preference:", error);
    }
  };


  const colors = theme === 'light' ? lightColors : darkColors;
  const isDarkMode = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, colors, isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};