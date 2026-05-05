import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryFilterBar } from '@/components/CategoryFilterBar';
import { EventDetailsSheet } from '@/components/EventDetailsSheet';
import { EventMarker } from '@/components/EventMarker';
import { FilterBar } from '@/components/FilterBar';
import { fetchAllEvents } from '@/services/events';
import { colors } from '@/theme/colors';
import type { AppEvent } from '@/types/event';
import { isInRange, rangeFor, type FilterKey } from '@/utils/dateFilters';
import type { LatLng } from '@/utils/distance';
import {
  categoryFilterFor,
  pinDescriptorFor,
  type CategoryFilterKey,
} from '@/utils/eventIcons';

const LONDON_REGION: Region = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

/**
 * Pick the right map provider for the current runtime.
 *
 * Expo Go on iOS doesn't bundle the AirGoogleMaps native module, so asking for
 * `PROVIDER_GOOGLE` there throws "AirGoogleMaps dir must be added…". Detect
 * Expo Go and fall back to Apple Maps in that case. In a custom dev build /
 * standalone app, `PROVIDER_GOOGLE` works on both platforms.
 */
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const MAP_PROVIDER =
  Platform.OS === 'ios' && isExpoGo ? PROVIDER_DEFAULT : PROVIDER_GOOGLE;

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [categories, setCategories] = useState<Set<CategoryFilterKey>>(
    () => new Set(),
  );
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [selected, setSelected] = useState<AppEvent | null>(null);

  // Ask for location permission once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled || status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      } catch (e) {
        console.warn('[location] failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch the full week's events once on mount; date-filter chips then narrow
  // the in-memory list rather than re-querying the providers.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);
    fetchAllEvents(rangeFor('all'))
      .then((list) => {
        if (cancelled) return;
        setEvents(list);
      })
      .catch((e) => {
        if (cancelled) return;
        console.warn('[events] fetch failed', e);
        setErrorMsg('Could not load events. Pull to retry.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Apply both filters client-side over the cached week of events.
  const visibleEvents = useMemo(() => {
    const range = rangeFor(filter);
    return events.filter((e) => {
      if (!isInRange(e.startsAt, range)) return false;
      if (categories.size === 0) return true;
      return categories.has(categoryFilterFor(e));
    });
  }, [events, filter, categories]);

  const initialRegion = useMemo<Region>(() => {
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.18,
        longitudeDelta: 0.18,
      };
    }
    return LONDON_REGION;
  }, [userLocation]);

  const toggleCategory = useCallback((key: CategoryFilterKey) => {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const resetCategories = useCallback(() => {
    setCategories(new Set());
  }, []);

  const handlePinPress = (event: AppEvent) => {
    setSelected(event);
    mapRef.current?.animateToRegion(
      {
        latitude: event.latitude,
        longitude: event.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      350,
    );
  };

  const recenter = () => {
    const target = userLocation ?? {
      latitude: LONDON_REGION.latitude,
      longitude: LONDON_REGION.longitude,
    };
    mapRef.current?.animateToRegion(
      {
        ...target,
        latitudeDelta: 0.18,
        longitudeDelta: 0.18,
      },
      400,
    );
  };

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        provider={MAP_PROVIDER}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation={userLocation != null}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {visibleEvents.map((event) => {
          const { icon, color } = pinDescriptorFor(event);
          return (
            <Marker
              key={event.id}
              coordinate={{
                latitude: event.latitude,
                longitude: event.longitude,
              }}
              onPress={() => handlePinPress(event)}
              anchor={{ x: 0.5, y: 1 }}
            >
              <EventMarker
                icon={icon}
                color={color}
                selected={selected?.id === event.id}
              />
            </Marker>
          );
        })}
      </MapView>

      <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.brandRow}>
          <View style={styles.brandPill}>
            <Text style={styles.brandText}>DriveIQ</Text>
          </View>
        </View>
        <FilterBar active={filter} onChange={setFilter} />
        <CategoryFilterBar
          selected={categories}
          onToggle={toggleCategory}
          onReset={resetCategories}
        />
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.bottomOverlay} pointerEvents="box-none">
        {loading && (
          <View style={styles.loadingPill}>
            <ActivityIndicator color={colors.textOnPrimary} />
            <Text style={styles.loadingText}>Loading events…</Text>
          </View>
        )}
        {errorMsg && !loading && (
          <View style={styles.errorPill}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}
        <Pressable
          onPress={recenter}
          style={styles.recenterBtn}
          accessibilityRole="button"
          accessibilityLabel="Re-centre map"
        >
          <Text style={styles.recenterIcon}>◎</Text>
        </Pressable>
      </SafeAreaView>

      <EventDetailsSheet
        event={selected}
        userLocation={userLocation}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 8,
    gap: 6,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  brandPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  brandText: {
    color: colors.textOnPrimary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 16,
  },
  loadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
    marginBottom: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  loadingText: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
  errorPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.accent,
    marginBottom: 10,
  },
  errorText: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
  recenterBtn: {
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
    marginRight: 16,
    alignSelf: 'flex-end',
  },
  recenterIcon: {
    fontSize: 22,
    color: colors.primaryDark,
    fontWeight: '700',
  },
});
