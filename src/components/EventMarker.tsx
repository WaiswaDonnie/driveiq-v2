import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import type { PinDescriptor } from '@/utils/eventIcons';

interface EventMarkerProps {
  /** Descriptor that decides whether the pin shows a sport glyph or the
   *  DriveIQ brand mark, plus the accent colour for the bubble. */
  descriptor: PinDescriptor;
  selected?: boolean;
}

/**
 * Custom map pin.
 *
 * - Sport events: a coloured-bubble pin with a sport-specific glyph
 *   (⚽ 🏉 🏈 🏏 🏀 🎾 etc.) so the kind of fixture reads at a glance.
 * - Everything else: the DriveIQ brand mark on a category-accent bubble.
 *   The mark is a compact "DQ" monogram rendered in the brand blue, which
 *   keeps the pin instantly recognisable as a DriveIQ event without
 *   shipping an additional PNG asset.
 */
export function EventMarker({ descriptor, selected = false }: EventMarkerProps) {
  const accent = descriptor.color;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.bubble,
          { borderColor: accent },
          selected && styles.bubbleSelected,
        ]}
      >
        {descriptor.kind === 'glyph' ? (
          <Text style={[styles.glyph, selected && styles.glyphSelected]}>
            {descriptor.icon}
          </Text>
        ) : (
          <DriveIQMark selected={selected} />
        )}
      </View>
      <View style={[styles.tail, { borderTopColor: accent }]} />
    </View>
  );
}

/**
 * Compact DriveIQ brand mark. A blue pill with a white "DQ" monogram —
 * a miniature of the brand pill that sits at the top of the map screen,
 * so users immediately associate the pin with the DriveIQ identity.
 */
function DriveIQMark({ selected }: { selected: boolean }) {
  return (
    <View
      style={[
        markStyles.pill,
        selected && markStyles.pillSelected,
      ]}
    >
      <Text
        style={[
          markStyles.text,
          selected && markStyles.textSelected,
        ]}
        numberOfLines={1}
      >
        DQ
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  bubbleSelected: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 4,
  },
  glyph: {
    fontSize: 20,
    textAlign: 'center',
  },
  glyphSelected: {
    fontSize: 24,
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

const markStyles = StyleSheet.create({
  pill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSelected: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    minWidth: 26,
  },
  text: {
    color: colors.textOnPrimary,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.6,
  },
  textSelected: {
    fontSize: 13,
  },
});
