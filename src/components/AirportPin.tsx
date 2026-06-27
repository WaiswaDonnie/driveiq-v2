import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import type { Airport } from '@/services/airports';
import { colors } from '@/theme/colors';

interface AirportPinProps {
  airport: Airport;
  onPress: (airport: Airport) => void;
}

/**
 * Map pin for a London airport (LHR/LGW/LTN/STN/LCY): a navy bubble with a
 * plane glyph, plus a small "PRO" badge to flag the paywalled flights board.
 *
 * Uses the same tracksViewChanges freeze trick as EventPin — render once on
 * mount, then freeze to a bitmap so the marker never flickers on map pans.
 */
function AirportPinBase({ airport, onPress }: AirportPinProps) {
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setTracks(false), 400);
    return () => clearTimeout(id);
  }, []);

  return (
    <Marker
      coordinate={{ latitude: airport.latitude, longitude: airport.longitude }}
      onPress={() => onPress(airport)}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracks}
    >
      <View style={styles.container}>
        <View style={styles.bubble}>
          <Ionicons name="airplane" size={20} color={colors.textOnPrimary} />
          <View style={styles.proBadge}>
            <Ionicons name="star" size={8} color={colors.primaryDark} />
          </View>
        </View>
        <View style={styles.tail} />
      </View>
    </Marker>
  );
}

export const AirportPin = React.memo(
  AirportPinBase,
  (prev, next) =>
    prev.airport.id === next.airport.id && prev.onPress === next.onPress,
);

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  bubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.surface,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  proBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.featured,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  tail: {
    width: 0,
    height: 0,
    marginTop: -2,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.primaryDark,
  },
});
