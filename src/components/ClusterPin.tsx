import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { colors } from '@/theme/colors';
import type { EventCluster } from '@/utils/clustering';

interface ClusterPinProps {
  cluster: EventCluster;
  onPress: (cluster: EventCluster) => void;
}

/**
 * Count bubble for a dense patch of the map ("12", "99+" events nearby).
 *
 * Brand-blue disc with a white ring. Tapping zooms into the bubble's
 * footprint, where the grid re-runs and it splits into smaller bubbles /
 * individual venue pins — matching the client's "10+ events that expands to
 * the exact locations as you zoom" description.
 *
 * Text paints synchronously, so a short tracksViewChanges window on mount is
 * enough to rasterise before freezing (no flicker). The parent keys this
 * marker by cluster id (which encodes the count), so a membership change
 * remounts the marker and re-rasterises the new number.
 */
function ClusterPinBase({ cluster, onPress }: ClusterPinProps) {
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setTracks(false), 350);
    return () => clearTimeout(id);
  }, []);

  const n = cluster.count;
  const label = n > 99 ? '99+' : String(n);
  // Grow the bubble a touch for bigger piles so density reads at a glance.
  const size = n >= 50 ? 52 : n >= 20 ? 48 : 44;

  return (
    <Marker
      coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
      onPress={() => onPress(cluster)}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracks}
      // BELOW every pin type (events 10, featured 18, airports 20): at far
      // zoom the bubble must fall to the background rather than cover
      // surrounding pins (client, 7 July 2026). It pops forward implicitly as
      // you zoom in because the pins around it spread out.
      zIndex={5}
    >
      <View
        style={[
          styles.bubble,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Text style={styles.count}>{label}</Text>
      </View>
    </Marker>
  );
}

export const ClusterPin = React.memo(
  ClusterPinBase,
  (prev, next) => prev.cluster.id === next.cluster.id && prev.onPress === next.onPress,
);

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  count: {
    color: colors.textOnPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
});
