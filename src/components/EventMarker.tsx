import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import type { PinDescriptor } from '@/utils/eventIcons';

// Resolved at bundle time. The asset is a 90x110 transparent PNG — the
// DriveIQ pin-shaped brand mark with the brain glyph inside.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../assets/driveiq-logo.png');

interface EventMarkerProps {
  /** Descriptor that decides whether the pin shows a sport glyph or the
   *  DriveIQ brand mark, plus the accent colour for the bubble. */
  descriptor: PinDescriptor;
  selected?: boolean;
}

/** Scale the pin grows to when selected. */
const SELECTED_SCALE = 1.28;

/**
 * Custom map pin.
 *
 * Both variants are now a coloured-ring "bubble" so the category colour reads
 * as an OUTLINE around the mark (per design feedback — the old loose dot is
 * gone):
 *   - Sport events: the ring holds a sport-specific glyph (⚽ 🏉 🏈 🏏 🏀 🎾 🏇…).
 *   - Everything else: the ring holds the DriveIQ brand logo.
 * Featured (curated) events get a gold ring plus a small star badge so big
 * one-offs like Royal Ascot stand out from API events.
 *
 * Selecting a pin springs it up to {@link SELECTED_SCALE} and eases back down
 * when deselected — a clear "pop" so the tapped event is obvious. The scale
 * lives on a single Animated.View so the base raster never changes size while
 * frozen (EventPin re-enables tracking only for the animation window).
 */
export function EventMarker({ descriptor, selected = false }: EventMarkerProps) {
  const scale = useRef(new Animated.Value(selected ? SELECTED_SCALE : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? SELECTED_SCALE : 1,
      useNativeDriver: true,
      friction: 7,
      tension: 120,
    }).start();
  }, [selected, scale]);

  const accent = descriptor.color;
  const featured = descriptor.featured ?? false;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View style={styles.container}>
        <View style={[styles.bubble, { borderColor: accent }]}>
          {descriptor.kind === 'glyph' ? (
            <Text style={styles.glyph}>{descriptor.icon}</Text>
          ) : (
            <Image
              source={LOGO}
              resizeMode="contain"
              style={styles.logo}
              accessibilityIgnoresInvertColors
            />
          )}
          {featured ? (
            <View style={[styles.star, { backgroundColor: accent }]}>
              <Ionicons name="star" size={9} color={colors.textOnPrimary} />
            </View>
          ) : null}
        </View>
        <View style={[styles.tail, { borderTopColor: accent }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    // Single soft shadow on the bubble only. Keeping shadow off the inner
    // image/glyph avoids the per-frame shadow recompute that makes map
    // markers shimmer.
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  glyph: {
    fontSize: 20,
    textAlign: 'center',
  },
  // The brand mark sits inside the ring, slightly inset.
  logo: {
    width: 24,
    height: 29,
  },
  star: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  tail: {
    width: 0,
    height: 0,
    marginTop: -2,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
