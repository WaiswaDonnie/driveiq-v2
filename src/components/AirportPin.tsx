import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import type { Airport } from '@/services/airports';
import { colors } from '@/theme/colors';

interface AirportPinProps {
  airport: Airport;
  onPress: (airport: Airport) => void;
  /** Bumped after each map gesture — re-rasterises a pin whose frozen bitmap
   *  came out blank or clipped (seen stacked/broken at Luton). */
  rasterEpoch?: number;
}

/**
 * Map pin for a London airport (LHR/LGW/LTN/STN/LCY): a navy bubble with a
 * plane, plus a small gold star flagging the paywalled flights board.
 *
 * The plane and star are emoji/text (not icon-font glyphs) so they paint
 * instantly — an icon font may not be loaded when the marker first rasterises,
 * which left some airport pins blank before. We track view changes briefly on
 * mount so the emoji rasterises, then freeze to a static bitmap so the pin
 * never flickers on map pans.
 */
function AirportPinBase({ airport, onPress, rasterEpoch = 0 }: AirportPinProps) {
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setTracks(false), 700);
    return () => clearTimeout(id);
  }, []);

  // Self-heal pass after each completed map gesture (see EventPin).
  const firstEpoch = useRef(true);
  useEffect(() => {
    if (firstEpoch.current) {
      firstEpoch.current = false;
      return;
    }
    setTracks(true);
    const id = setTimeout(() => setTracks(false), 350);
    return () => clearTimeout(id);
  }, [rasterEpoch]);

  return (
    <Marker
      coordinate={{ latitude: airport.latitude, longitude: airport.longitude }}
      onPress={() => onPress(airport)}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracks}
      // Airports must never be buried under a pile of event pins (London City
      // sits inside the densest part of the map) — keep them on top.
      zIndex={20}
    >
      <View style={styles.container}>
        <View style={styles.bubble}>
          <Text style={styles.plane}>✈️</Text>
          <View style={styles.star}>
            <Text style={styles.starText}>★</Text>
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
    prev.airport.id === next.airport.id &&
    prev.onPress === next.onPress &&
    prev.rasterEpoch === next.rasterEpoch,
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
  plane: { fontSize: 18, textAlign: 'center' },
  star: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.featured,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  starText: { fontSize: 9, color: colors.surface, fontWeight: '900', lineHeight: 12 },
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
