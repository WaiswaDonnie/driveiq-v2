import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/theme/colors';

interface ActionButton {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  active?: boolean;
  badge?: number;
}

interface Props {
  actions: ActionButton[];
  /** Distance from the bottom edge in px. Defaults to 90. */
  bottomOffset?: number;
}

/**
 * Vertical stack of circular floating action buttons rendered above the
 * map (bottom-right). The first item in `actions` sits at the bottom of the
 * stack — the closest to the user's thumb.
 */
export function MapActionStack({ actions, bottomOffset = 90 }: Props) {
  return (
    <View style={[styles.stack, { bottom: bottomOffset }]} pointerEvents="box-none">
      {actions.map((a) => (
        <Pressable
          key={a.key}
          onPress={a.onPress}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          accessibilityState={{ selected: !!a.active }}
          style={[styles.btn, a.active && styles.btnActive]}
        >
          <Ionicons
            name={a.icon}
            size={22}
            color={a.active ? colors.textOnPrimary : colors.primaryDark}
          />
          {a.badge && a.badge > 0 ? (
            <View style={styles.badge} pointerEvents="none">
              <View style={styles.badgeDot} />
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    right: 16,
    gap: 12,
    alignItems: 'center',
  },
  btn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  btnActive: {
    backgroundColor: colors.primary,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
});
