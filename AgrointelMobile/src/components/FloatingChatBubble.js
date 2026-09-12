import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUBBLE_SIZE = 56;
const EDGE_MARGIN = 16;
const LEFT_SNAP = EDGE_MARGIN;
const RIGHT_SNAP = SCREEN_WIDTH - BUBBLE_SIZE - EDGE_MARGIN;
const TOP_BOUND = Platform.OS === 'ios' ? 70 : 50;
const BOTTOM_BOUND = SCREEN_HEIGHT - (Platform.OS === 'ios' ? 160 : 140);
const INITIAL_Y = SCREEN_HEIGHT - (Platform.OS === 'ios' ? 170 : 150);

export default function FloatingChatBubble({ onPress }) {
  const pan = useRef(new Animated.ValueXY({ x: RIGHT_SNAP, y: INITIAL_Y })).current;
  const currentPos = useRef({ x: RIGHT_SNAP, y: INITIAL_Y });
  const dragStartTime = useRef(0);

  useEffect(() => {
    const id = pan.addListener((value) => {
      currentPos.current = value;
    });
    return () => pan.removeListener(id);
  }, [pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only consider it a drag if moved more than 4 pixels
        return Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
      },
      onPanResponderGrant: () => {
        dragStartTime.current = Date.now();
        pan.setOffset({
          x: currentPos.current.x,
          y: currentPos.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        const elapsed = Date.now() - dragStartTime.current;
        const distance = Math.hypot(gestureState.dx, gestureState.dy);

        // Tap detection: minimal movement and short duration
        if (distance < 7 && elapsed < 350) {
          if (onPress) onPress();
          return;
        }

        // Clamp Y within screen bounds
        let targetY = currentPos.current.y;
        if (targetY < TOP_BOUND) targetY = TOP_BOUND;
        if (targetY > BOTTOM_BOUND) targetY = BOTTOM_BOUND;

        // Snap horizontally to nearest edge (left or right)
        const centerX = currentPos.current.x + BUBBLE_SIZE / 2;
        const targetX = centerX < SCREEN_WIDTH / 2 ? LEFT_SNAP : RIGHT_SNAP;

        Animated.spring(pan, {
          toValue: { x: targetX, y: targetY },
          friction: 6,
          tension: 40,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: pan.getTranslateTransform(),
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.glowRing}>
        {/* Core Emerald Bubble */}
        <View style={styles.bubble}>
          <Ionicons name="sparkles" size={24} color="#FFFFFF" />
        </View>

        {/* Floating Mini AI Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>AI</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  glowRing: {
    position: 'relative',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: '#10B981', // Vibrant emerald
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#34D399',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
