import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/colors';

interface TrafficMarkerProps {
  color: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  selected?: boolean;
}

export function TrafficMarker({ color, iconName, selected = false }: TrafficMarkerProps) {
  return (
    <View style={[styles.outer, { borderColor: color }, selected && styles.outerSelected]}>
      <View style={[styles.inner, { backgroundColor: color }]}>
        <Ionicons name={iconName} size={14} color={colors.textOnPrimary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  outerSelected: {
    transform: [{ scale: 1.15 }],
  },
  inner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
