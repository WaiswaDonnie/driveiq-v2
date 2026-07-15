import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

// High-res DriveIQ brand mark (crisp edges, transparent background).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BRAND_LOGO = require('../../assets/driveiq-logo@hd.png');
// Pre-rendered smooth radial glow (avoids banding / rectangular shadows).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const GLOW = require('../../assets/splash-glow.png');

const BG = '#060B14'; // near-black navy from the Radar Pulse concept
const RING = 'rgba(85, 140, 220, 0.32)'; // faint radar-ring blue
const WORD_LETTERS = ['D', 'r', 'i', 'v', 'e', 'I', 'Q'];
const WHITE_CHARS = 5; // "Drive" white, "IQ" brand blue
const TAGLINE = 'KNOW YOUR CITY BEFORE IT MOVES';
const TYPE_START = 400; // ms before first letter appears
const TYPE_STEP = 90; // ms between letters

interface Props {
  /** How long to hold the splash before it fades out (ms). */
  duration?: number;
  /** Called once the fade-out completes so the parent can unmount it. */
  onDone: () => void;
}

/** One expanding + fading radar ring, staggered by `delay`. */
function RadarRing({ delay }: { delay: number }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, {
          toValue: 1,
          duration: 2600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [0.55, 2.4] });
  const opacity = t.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 0.6, 0],
  });

  return (
    <Animated.View style={[styles.radarRing, { opacity, transform: [{ scale }] }]} />
  );
}

/**
 * DriveIQ launch / loading screen — "Radar Pulse" concept.
 *
 * Near-black navy screen with a soft blue glow: the brand pin scales in at the
 * centre while thin radar rings ripple outward behind it. The wordmark types
 * itself out ("Drive" in white, "IQ" in brand blue), the spaced-out tagline
 * fades up beneath it, and three dots loop at the bottom. After `duration` the
 * whole screen fades out and calls onDone.
 *
 * All animation runs on the native driver — no JS timers for the visuals — so
 * nothing stalls while the app is busy loading behind the splash.
 */
export function SplashLoading({ duration = 5200, onDone }: Props) {
  const logo = useRef(new Animated.Value(0)).current; // logo scale/fade-in
  const glow = useRef(new Animated.Value(0)).current; // breathing glow
  const tag = useRef(new Animated.Value(0)).current; // tagline fade
  const fade = useRef(new Animated.Value(1)).current; // whole-screen fade-out
  const letters = useRef(WORD_LETTERS.map(() => new Animated.Value(0))).current;
  const dots = [
    useRef(new Animated.Value(0.25)).current,
    useRef(new Animated.Value(0.25)).current,
    useRef(new Animated.Value(0.25)).current,
  ];

  useEffect(() => {
    Animated.timing(logo, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    glowLoop.start();

    // Typewriter wordmark: per-letter staggered reveal on the native driver
    // (a setInterval here starves while the JS thread loads the app).
    const typing = Animated.stagger(
      TYPE_STEP,
      letters.map((l) =>
        Animated.timing(l, { toValue: 1, duration: 40, useNativeDriver: true }),
      ),
    );
    const wordSeq = Animated.sequence([
      Animated.delay(TYPE_START),
      typing,
      Animated.timing(tag, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]);
    wordSeq.start();

    const dotLoops = dots.map((d, idx) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(idx * 180),
          Animated.timing(d, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.25, duration: 350, useNativeDriver: true }),
          Animated.delay((2 - idx) * 180),
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
      glowLoop.stop();
      wordSeq.stop();
      dotLoops.forEach((l) => l.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoScale = logo.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <Animated.View style={[styles.root, { opacity: fade }]} pointerEvents="none">
      <View style={styles.center}>
        <View style={styles.logoArea}>
          {/* pre-rendered radial glow: perfectly smooth, no banding */}
          <Animated.Image
            source={GLOW}
            style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
          />
          {/* static faint circle + rippling radar rings */}
          <View style={styles.staticRing} />
          <RadarRing delay={0} />
          <RadarRing delay={870} />
          <RadarRing delay={1740} />
          <Animated.View style={{ opacity: logo, transform: [{ scale: logoScale }] }}>
            <Image source={BRAND_LOGO} resizeMode="contain" style={styles.logo} />
          </Animated.View>
        </View>

        <View style={styles.wordRow}>
          {WORD_LETTERS.map((ch, i) => (
            <Animated.Text
              key={i}
              style={[
                styles.wordLetter,
                i < WHITE_CHARS ? styles.wordWhite : styles.wordBlue,
                { opacity: letters[i] },
              ]}
            >
              {ch}
            </Animated.Text>
          ))}
        </View>

        <Animated.Text style={[styles.tagline, { opacity: tag }]}>{TAGLINE}</Animated.Text>

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
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  logoArea: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 340,
    height: 340,
  },
  staticRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: RING,
  },
  radarRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: RING,
  },
  logo: {
    width: 96,
    height: 118,
  },
  wordRow: {
    flexDirection: 'row',
    marginTop: 24,
    minHeight: 42,
  },
  wordLetter: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  wordWhite: { color: '#F4F7FB' },
  wordBlue: { color: colors.primary },
  tagline: {
    color: 'rgba(150, 175, 210, 0.75)',
    fontSize: 11,
    letterSpacing: 3.2,
    marginTop: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 34,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
});
