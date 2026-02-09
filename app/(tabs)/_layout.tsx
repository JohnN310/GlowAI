import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import RadialMenu from '../components/RadialMenu';

import { useTheme } from '../theme/ThemeContext';


export default function TabLayout() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { colors, isDarkMode } = useTheme(); 
  
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(open ? 45 : 0, { duration: 200, easing: Easing.out(Easing.ease) });
  }, [open]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          headerShown: false,
          tabBarStyle: {
            height: 65, 
            paddingBottom: 16, 
            paddingTop: 14, 
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        }}
      >
        {/* Home */}
        <Tabs.Screen
          name="Home"
          options={{
            title: '',
            tabBarIcon: ({ color, focused }) => (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: 23 }] }}>
                <Ionicons
                  name={focused ? 'home' : 'home-outline'}
                  size={28}
                  color={color}
                />
                <Text style={{ fontSize: 10, color: color, marginTop: 2 }}>
                  Home
                </Text>
              </View>
            ),
          }}
        />

        {/* Center Quick Actions Button */}
        <Tabs.Screen
          name="quick-actions"
          options={{
            title: '',
            tabBarButton: () => (
              <View style={styles.centerTabContainer}>
              <Pressable
                onPress={() => setOpen(true)}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#4F46E5',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: -18,
                  shadowColor: '#000',
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: 6,
                }}
              >   
              <Animated.View style={animatedStyle}>
                    <Plus size={26} color="white" />
              </Animated.View>
                
              </Pressable>
              </View>
            ),
          }}
        />

        {/* Profile */}
        <Tabs.Screen
          name="UserSetting"
          options={{
            title: '',
            tabBarIcon: ({ color, focused }) => (
              <View style={{ width: 60, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: -23 }] }}>
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={28}
                color={color}
              />
                <Text style={{ fontSize: 10, color: color, marginTop: 2,}}>
                  Profile
                </Text>
            </View>
            ),
          }}
        />
      </Tabs>

      {/* Radial Quick Actions Overlay */}
      <RadialMenu
        isOpen={open}
        onClose={() => setOpen(false)}
        onSelectAction={(action) => {
          if (action === 'scan-food') router.push('/FoodPhotoCapture');
          if (action === 'scan-acne') router.push('/AcneCamera');
          if (action === 'log-routine') router.push('/SkinHub');
        }}
      />
    </>
  );
}


const styles = StyleSheet.create({
  centerTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  });