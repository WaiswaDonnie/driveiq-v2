import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '@/theme/colors';
import {
  formatDuration,
  formatEta,
  formatRouteDistance,
  trafficColor,
  type RouteOption,
} from '@/services/routing';

interface Props {
  visible: boolean;
  loading: boolean;
  error: string | null;
  routes: RouteOption[];
  selectedIndex: number;
  destinationLabel: string | null;
  onSelect: (index: number) => void;
  onClose: () => void;
  onStart: () => void;
}

/**
 * Bottom-anchored panel that surfaces the calculated routes once the user
 * picks a destination. The fastest route appears first, marked "Fastest".
 * Tapping any alternative swaps the highlighted polyline on the map.
 *
 * Renders nothing when not visible, so it can sit unconditionally in the
 * map screen tree.
 */
export function RouteInfoPanel({
  visible,
  loading,
  error,
  routes,
  selectedIndex,
  destinationLabel,
  onSelect,
  onClose,
  onStart,
}: Props) {
  if (!visible) return null;

  const selected = routes[selectedIndex];
  const fastest = routes[0];

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.handle} />

        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="navigate" size={20} color={colors.textOnPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {destinationLabel ?? 'Directions'}
            </Text>
            {selected ? (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {formatDuration(selected.durationInTrafficSeconds)} ·{' '}
                {formatRouteDistance(selected.distanceMeters)} · arrive{' '}
                {formatEta(selected.durationInTrafficSeconds)}
              </Text>
            ) : loading ? (
              <Text style={styles.headerSubtitle}>Calculating routes…</Text>
            ) : (
              <Text style={styles.headerSubtitle}>
                {error ?? 'No route available'}
              </Text>
            )}
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close directions"
          >
            <Ionicons name="close" size={26} color={colors.textSecondary} />
          </Pressable>
        </View>

        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Finding best routes…</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.errorBox}>
            <Ionicons name="warning" size={18} color={colors.accent} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!loading && !error && routes.length > 0 && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.routesRow}
            >
              {routes.map((route, idx) => {
                const isSelected = idx === selectedIndex;
                const isFastest = idx === 0;
                const delaySeconds =
                  route.durationInTrafficSeconds -
                  (fastest?.durationInTrafficSeconds ?? route.durationInTrafficSeconds);
                const delayMins = Math.max(0, Math.round(delaySeconds / 60));

                return (
                  <Pressable
                    key={route.id}
                    onPress={() => onSelect(idx)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={[
                      styles.routeChip,
                      isSelected && styles.routeChipSelected,
                    ]}
                  >
                    <View style={styles.chipHeader}>
                      <View
                        style={[
                          styles.trafficDot,
                          { backgroundColor: trafficColor(route.trafficLevel) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.chipBadge,
                          isSelected && styles.chipBadgeSelected,
                        ]}
                      >
                        {isFastest ? 'Fastest' : `+${delayMins} min`}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.chipDuration,
                        isSelected && styles.chipDurationSelected,
                      ]}
                    >
                      {formatDuration(route.durationInTrafficSeconds)}
                    </Text>
                    <Text
                      style={[
                        styles.chipMeta,
                        isSelected && styles.chipMetaSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {formatRouteDistance(route.distanceMeters)}
                      {route.summary ? ` · ${route.summary}` : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={onStart}
              style={styles.startBtn}
              accessibilityRole="button"
              accessibilityLabel="Start turn-by-turn navigation"
            >
              <Ionicons name="navigate" size={18} color={colors.textOnPrimary} />
              <Text style={styles.startText}>Start navigation</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingTop: 8,
    paddingBottom: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingText: { color: colors.textSecondary, fontSize: 13 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: { color: colors.textPrimary, fontSize: 13, flex: 1 },
  routesRow: {
    paddingHorizontal: 12,
    paddingTop: 4,
    gap: 10,
  },
  routeChip: {
    minWidth: 150,
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  routeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  chipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  trafficDot: { width: 8, height: 8, borderRadius: 4 },
  chipBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  chipBadgeSelected: { color: colors.textOnPrimary },
  chipDuration: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  chipDurationSelected: { color: colors.textOnPrimary },
  chipMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chipMetaSelected: { color: colors.textOnPrimary, opacity: 0.92 },
  startBtn: {
    marginTop: 12,
    marginHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
