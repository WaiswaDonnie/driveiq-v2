import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

interface EventMarkerProps {
  /** Glyph (emoji) shown inside the pin — e.g. ⚽ 🏏 🎵 🎭. */
  icon: string;
  /** Accent colour for the pin's border + tail. */
  color: string;
  selected?: boolean;
}

/**
 * Custom map pin. White circular bubble holding a category-specific glyph,
 * with a coloured border + downward-pointing tail. The accent colour and
 * glyph are computed per-event by `pinDescriptorFor` so a football match,
 * cricket test, music concert, and theatre show all look distinct on the
 * map. Selected pins grow + thicken their border.
 */
export function EventMarker({ icon, color, selected = false }: EventMarkerProps) {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.bubble,
          { borderColor: color },
          selected && styles.bubbleSelected,
        ]}
      >
        <Text style={[styles.glyph, selected && styles.glyphSelected]}>
          {icon}
        </Text>
      </View>
      <View style={[styles.tail, { borderTopColor: color }]} />
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
