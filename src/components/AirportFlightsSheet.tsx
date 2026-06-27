import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Airport } from '@/services/airports';
import {
  fetchAirportFlights,
  type AirportFlight,
  type FlightDirection,
} from '@/services/aerodatabox';
import { colors } from '@/theme/colors';

interface Props {
  airport: Airport | null;
  onClose: () => void;
  onNavigate?: (airport: Airport) => void;
}

/** "2026-06-26 08:05+01:00" | "2026-06-26T08:05+01:00" → "08:05". */
function hhmm(local?: string): string {
  if (!local) return '--:--';
  const sep = local.includes('T') ? 'T' : ' ';
  const time = local.split(sep)[1] ?? '';
  return time.slice(0, 5) || '--:--';
}

function statusColor(f: AirportFlight): string {
  if (f.cancelled) return '#DC2626';
  if (f.delayed) return '#F97316';
  return '#26C281';
}

export function AirportFlightsSheet({ airport, onClose, onNavigate }: Props) {
  const [flights, setFlights] = useState<AirportFlight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<FlightDirection>('departure');

  useEffect(() => {
    if (!airport) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFlights([]);
    fetchAirportFlights(airport.id)
      .then((res) => {
        if (cancelled) return;
        setFlights(res.flights);
        if (res.error === 'no-key') {
          setError('Live flights need an AeroDataBox API key (set EXPO_PUBLIC_AERODATABOX_API_KEY).');
        } else if (res.error === 'rate-limited') {
          setError('Flight data is rate limited right now — try again shortly.');
        } else if (res.error === 'network' || res.error === 'http') {
          setError('Couldn’t load flights. Pull up again to retry.');
        }
      })
      .catch(() => {
        if (!cancelled) setError('Couldn’t load flights.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [airport]);

  const shown = useMemo(
    () => flights.filter((f) => f.direction === direction),
    [flights, direction],
  );

  if (!airport) return null;

  const upgrade = () =>
    Alert.alert(
      'DriveIQ Pro',
      'Live flight tracking will be part of DriveIQ Pro. Subscriptions aren’t live yet — this is a preview.',
    );

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="airplane" size={22} color={colors.textOnPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{airport.name}</Text>
            <Text style={styles.subtitle}>{airport.iata} · Live flights</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
            <Ionicons name="close" size={26} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Paywall placeholder — gating logic is a stub until billing is wired. */}
        <Pressable style={styles.proBanner} onPress={upgrade} accessibilityRole="button">
          <Ionicons name="star" size={16} color={colors.primaryDark} />
          <View style={{ flex: 1 }}>
            <Text style={styles.proTitle}>DriveIQ Pro — Live flights</Text>
            <Text style={styles.proBody}>Arrivals, departures, delays & cancellations</Text>
          </View>
          <View style={styles.proCta}>
            <Text style={styles.proCtaText}>Subscribe</Text>
          </View>
        </Pressable>

        {/* Arrivals / Departures toggle */}
        <View style={styles.segment}>
          {(['departure', 'arrival'] as FlightDirection[]).map((d) => {
            const active = direction === d;
            return (
              <Pressable
                key={d}
                onPress={() => setDirection(d)}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {d === 'departure' ? 'Departures' : 'Arrivals'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {onNavigate ? (
          <Pressable
            onPress={() => onNavigate(airport)}
            style={styles.directionsBtn}
            accessibilityRole="button"
            accessibilityLabel={`Get directions to ${airport.name}`}
          >
            <Ionicons name="navigate" size={15} color={colors.textOnPrimary} />
            <Text style={styles.directionsText}>Get directions</Text>
          </Pressable>
        ) : null}

        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 28 }}>
          {loading && (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>Loading flights…</Text>
            </View>
          )}

          {!loading && error && <Text style={styles.error}>{error}</Text>}

          {!loading && !error && shown.length === 0 && (
            <Text style={styles.empty}>No {direction === 'departure' ? 'departures' : 'arrivals'} in the next few hours.</Text>
          )}

          {!loading &&
            shown.map((f) => (
              <View key={f.id} style={styles.row}>
                <View style={styles.timeCol}>
                  <Text style={[styles.time, f.cancelled && styles.timeStruck]}>
                    {hhmm(f.scheduledLocal)}
                  </Text>
                  {f.delayed && f.revisedLocal ? (
                    <Text style={styles.revised}>{hhmm(f.revisedLocal)}</Text>
                  ) : null}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.route} numberOfLines={1}>
                    {direction === 'departure' ? 'To ' : 'From '}
                    {f.counterpart}
                    {f.counterpartIata ? ` (${f.counterpartIata})` : ''}
                  </Text>
                  <Text style={styles.flightMeta} numberOfLines={1}>
                    {f.flightNumber}
                    {f.airline ? ` · ${f.airline}` : ''}
                    {f.terminal ? ` · T${f.terminal}` : ''}
                  </Text>
                </View>

                <View style={styles.statusCol}>
                  <View style={[styles.statusPill, { backgroundColor: statusColor(f) }]}>
                    <Text style={styles.statusText}>
                      {f.cancelled
                        ? 'Cancelled'
                        : f.delayed
                          ? f.delayMinutes != null
                            ? `+${f.delayMinutes}m`
                            : 'Delayed'
                          : f.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '80%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2, letterSpacing: 0.5 },
  proBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.featured,
  },
  proTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  proBody: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  proCta: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  proCtaText: { color: colors.textOnPrimary, fontWeight: '800', fontSize: 12 },
  segment: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: 'center',
  },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentText: { fontWeight: '700', color: colors.textSecondary, fontSize: 13 },
  segmentTextActive: { color: colors.textOnPrimary },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  directionsText: { color: colors.textOnPrimary, fontSize: 13, fontWeight: '700' },
  body: { marginTop: 12 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  loadingText: { color: colors.textSecondary },
  error: { color: colors.accent, padding: 16, lineHeight: 20 },
  empty: { color: colors.textSecondary, padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timeCol: { width: 52 },
  time: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  timeStruck: { textDecorationLine: 'line-through', color: colors.textSecondary },
  revised: { fontSize: 12, fontWeight: '700', color: '#F97316', marginTop: 2 },
  route: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  flightMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statusCol: { alignItems: 'flex-end' },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: 110,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textOnPrimary,
    textAlign: 'center',
  },
});
