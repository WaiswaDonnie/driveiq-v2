import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

// Real DriveIQ brand mark, shown on a white disc so the blue logo reads on the
// blue splash background.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BRAND_LOGO = require('../../assets/driveiq-logo.png');

interface Props {
  /** How long to hold the splash before it fades out (ms). */
  duration?: number;
  /** Called once the fade-out completes so the parent can unmount it. */
  onDone: () => void;
}

/**
 * DriveIQ launch / loading screen (the approved "hybrid" concept).
 *
 * Brand-blue full-screen overlay: the logo drops in with a spring, a soft pulse
 * radiates from behind it, the wordmark + tagline fade up, and three dots loop
 * underneath. After `duration` it fades the whole screen out and calls onDone.
 *
 * Note: the animated route line from the mockup needs react-native-svg (not yet
 * a dependency). This is the clean core; the route flourish can be layered on
 * once that package is added.
 */
export function SplashLoading({ duration = 2200, onDone }: Props) {
  const drop = useRef(new Animated.Value(0)).current; // logo drop-in
  const pulse = useRef(new Animated.Value(0)).current; // radiating ring
  const word = useRef(new Animated.Value(0)).current; // wordmark fade
  const fade = useRef(new Animated.Value(1)).current; // whole-screen fade-out
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    Animated.spring(drop, {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();

    Animated.timing(word, {
      toValue: 1,
      duration: 600,
      delay: 500,
      useNativeDriver: true,
    }).start();

    const pulseLoop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    pulseLoop.start();

    const dotLoops = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(d, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.3, duration: 350, useNativeDriver: true }),
          Animated.delay((2 - i) * 180),
        ]),
      ),
    );
    dotLoops.forEach((l) => l.start());

    const timer = setTimeout(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }).start(() => onDone());
    }, duration);

    return () => {
      clearTimeout(timer);
      pulseLoop.stop();
      dotLoops.forEach((l) => l.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = drop.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.6] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <Animated.View style={[styles.root, { opacity: fade }]} pointerEvents="none">
      <View style={styles.center}>
        <View style={styles.logoArea}>
          <Animated.View
            style={[
              styles.pulse,
              { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
            ]}
          />
          <Animated.View
            style={[styles.logoDisc, { opacity: drop, transform: [{ translateY }] }]}
          >
            <Image source={BRAND_LOGO} resizeMode="contain" style={styles.logo} />
          </Animated.View>
        </View>

        <Animated.Text style={[styles.wordmark, { opacity: word }]}>DriveIQ</Animated.Text>
        <Animated.Text style={[styles.tagline, { opacity: word }]}>
          Know what’s moving in London
        </Animated.Text>

        <View style={styles.dotsRow}>
          {dots.map((d, i) => (
            <Animated.View key={i} style={[styles.dot, { opacity: d }]} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  logoArea: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  logoDisc: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  logo: { width: 46, height: 54 },
  wordmark: {
    color: colors.textOnPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 16,
  },
  tagline: {
    color: '#E5F0FF',
    fontSize: 13,
    marginTop: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 26,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textOnPrimary,
  },
});
