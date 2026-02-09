import { Camera, ListChecks, Scan, X } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const RADIUS = 120;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: string) => void;
};

const actions = [
  { id: 'scan-food', label: 'Scan Food', icon: Camera, angle: -60, color: '#F97316' },
  { id: 'scan-acne', label: 'Scan Acne', icon: Scan, angle: 0, color: '#EC4899' },
  { id: 'log-routine', label: 'Skin Hub', icon: ListChecks, angle: 60, color: '#8b64cfff' },
];

export default function RadialMenu({ isOpen, onClose, onSelectAction }: Props) {
  const progress = useSharedValue(0);

  // Animate progress when open/close
  useEffect(() => {
    progress.value = isOpen
      ? withSpring(1, { damping: 75, stiffness: 600 })
      : withTiming(0, { duration: 150 });
  }, [isOpen]);

  // Compute animated styles at top level for each action
  const animatedStyles = actions.map((item) => {
    const angleRad = (item.angle * Math.PI) / 180;
    return useAnimatedStyle(() => ({
      transform: [
        { translateX: Math.sin(angleRad) * RADIUS * progress.value },
        { translateY: -Math.cos(angleRad) * RADIUS * progress.value },
        { scale: progress.value },
      ],
      opacity: progress.value,
    }));
  });

  const closeButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progress.value }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'none'}>
      {isOpen && (
        <>
          {/* Backdrop */}
          <Pressable style={styles.backdrop} onPress={onClose} />

          <View style={styles.centerContainer}>
            {/* Close Button */}
            <Animated.View style={[styles.closeButton, closeButtonStyle]}>
              <Pressable onPress={onClose}>
                <X size={28} color="white" />
              </Pressable>
            </Animated.View>

            {/* Radial Actions */}
            {actions.map((item, index) => {
              const Icon = item.icon;
              return (
                <Animated.View
                  key={item.id}
                  style={[styles.actionContainer, animatedStyles[index]]}
                >
                  <Pressable
                    style={ [styles.actionButton, { backgroundColor: item.color }]}
                    onPress={() => {
                      onSelectAction(item.id);
                      onClose();
                    }}
                  >
                    <Icon size={32} color="white" />
                  </Pressable>
                  <Text style={styles.label} >{item.label}</Text>
                </Animated.View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  centerContainer: {
    position: 'absolute',
    bottom: 90,
    left: width / 2,
    transform: [{ translateX: -32 }],
    alignItems: 'center',
  },
  closeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 28,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 6,
    color: 'white',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,   
    flexWrap: 'nowrap',
    textAlign: 'center',
  },
});
