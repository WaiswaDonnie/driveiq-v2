import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  /** Secondary actions that live behind the collapsible toggle. */
  actions: ActionButton[];
  /** Always-visible primary action (re-centre) anchored at the bottom. */
  primaryAction?: ActionButton;
  /** Distance from the bottom edge in px. Defaults to 90. */
  bottomOffset?: number;
}

/**
 * Floating map controls as a collapsible "speed dial" (bottom-right).
 *
 * Collapsed: just the re-centre button + a single toggle FAB, so the map
 * stays uncluttered. Tapping the toggle fans the secondary actions out above
 * it (each with a label chip). Tapping the toggle again — or anywhere off the
 * menu — collapses it back to the single button.
 *
 * While collapsed, a small dot rides the toggle if any hidden action is
 * currently active (e.g. Traffic on) so that state isn't lost from view.
 */
export function MapActionStack({ actions, primaryAction, bottomOffset = 90 }: Props) {
  const [open, setOpen] = useState(false);

  const anyActiveHidden = actions.some((a) => a.active || (a.badge ?? 0) > 0);

  const runAction = (a: ActionButton) => {
    setOpen(false);
    a.onPress();
  };

  return (
    <>
      {/* Full-screen catcher so a tap anywhere off the menu collapses it. */}
      {open ? (
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityLabel="Close map tools"
        />
      ) : null}

      <View style={[styles.stack, { bottom: bottomOffset }]} pointerEvents="box-none">
        {open
          ? actions.map((a) => (
              <View key={a.key} style={styles.expandedRow}>
                <View style={styles.labelChip} pointerEvents="none">
                  <Text style={styles.labelChipText}>{a.label}</Text>
                </View>
                <Pressable
                  onPress={() => runAction(a)}
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
              </View>
            ))
          : null}

        {/* Toggle FAB. */}
        <Pressable
          onPress={() => setOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityLabel={open ? 'Hide map tools' : 'Show map tools'}
          accessibilityState={{ expanded: open }}
          style={[styles.btn, open && styles.btnActive]}
        >
          <Ionicons
            name={open ? 'close' : 'apps'}
            size={22}
            color={open ? colors.textOnPrimary : colors.primaryDark}
          />
          {!open && anyActiveHidden ? (
            <View style={styles.badge} pointerEvents="none">
              <View style={styles.badgeDot} />
            </View>
          ) : null}
        </Pressable>

        {/* Always-visible primary action (re-centre). */}
        {primaryAction ? (
          <Pressable
            onPress={primaryAction.onPress}
            accessibilityRole="button"
            accessibilityLabel={primaryAction.label}
            style={[styles.btn, primaryAction.active && styles.btnActive]}
          >
            <Ionicons
              name={primaryAction.icon}
              size={22}
              color={primaryAction.active ? colors.textOnPrimary : colors.primaryDark}
            />
          </Pressable>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  stack: {
    position: 'absolute',
    right: 16,
    gap: 12,
    alignItems: 'flex-end',
  },
  // A secondary action when expanded: label chip + circular button.
  expandedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  labelChipText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
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
