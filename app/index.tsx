import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AirportsPanel } from '@/components/AirportsPanel';
import { CategoryFilterBar } from '@/components/CategoryFilterBar';
import { ConnectionsPanel } from '@/components/ConnectionsPanel';
import { EventDetailsSheet } from '@/components/EventDetailsSheet';
import { EventMarker } from '@/components/EventMarker';
import { FilterBar } from '@/components/FilterBar';
import {
  LayerControlPanel,
  type LayerKey,
  type LayerVisibility,
} from '@/components/LayerControlPanel';
import { MapActionStack } from '@/components/MapActionStack';
import { NavigationAppPicker, type NavDestination } from '@/components/NavigationAppPicker';
import { NavigationOverlay } from '@/components/NavigationOverlay';
import { RouteInfoPanel } from '@/components/RouteInfoPanel';
import { TrafficIncidentSheet } from '@/components/TrafficIncidentSheet';
import { TrafficMarker } from '@/components/TrafficMarker';
import { fetchAllEvents } from '@/services/events';
import {
  fetchRoutes,
  trafficColor,
  type RouteOption,
  type RouteStep,
} from '@/services/routing';
import {
  fetchTrafficIncidents,
  incidentColor,
  incidentIconName,
  isMajorIncident,
  type TrafficIncident,
} from '@/services/tflTraffic';
import { fetchHighwaysIncidents } from '@/services/highwaysTraffic';
import { fetchLineStatuses, type LineStatus } from '@/services/tflLines';
import {
  diffAndNotifyIncidents,
  diffAndNotifyLines,
  ensurePermission,
  loadPrefs,
  type NotificationPrefs,
} from '@/services/notifications';
import { NotificationSettingsPanel } from '@/components/NotificationSettingsPanel';
import { colors } from '@/theme/colors';
import type { AppEvent } from '@/types/event';
import { isInRange, rangeFor, type FilterKey } from '@/utils/dateFilters';
import { distanceMeters, type LatLng } from '@/utils/distance';
import {
  categoryFilterFor,
  pinDescriptorFor,
  type CategoryFilterKey,
} from '@/utils/eventIcons';

interface Destination {
  /** What kind of pin spawned this route. */
  kind: 'event' | 'incident' | 'airport';
  label: string;
  latitude: number;
  longitude: number;
}

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

  // Traffic incidents (TfL).
  const [incidents, setIncidents] = useState<TrafficIncident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<TrafficIncident | null>(null);

  // Map-overlay panels.
  const [layersOpen, setLayersOpen] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [airportsOpen, setAirportsOpen] = useState(false);
  const [notifSettingsOpen, setNotifSettingsOpen] = useState(false);

  // Notification preferences — read once on mount, kept in state so the
  // poll loop sees the latest opt-ins/outs.
  const prefsRef = useRef<NotificationPrefs | null>(null);
  const [layers, setLayers] = useState<LayerVisibility>({
    events: true,
    traffic: false,
    transit: true,
  });

  // Routing state. `destination` drives the polylines + RouteInfoPanel.
  const [destination, setDestination] = useState<Destination | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Picker (DriveIQ / Google / Waze / Apple Maps).
  const [pickerDestination, setPickerDestination] = useState<NavDestination | null>(null);

  // Turn-by-turn navigation mode.
  const [isNavigating, setIsNavigating] = useState(false);
  const [userHeading, setUserHeading] = useState(0);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [cameraDetached, setCameraDetached] = useState(false);
  const [offRoute, setOffRoute] = useState(false);
  // The latest user position used for live nav metrics. Decoupled from
  // `userLocation` so the watcher can update at high frequency without
  // making everything else re-render.
  const [navUserPos, setNavUserPos] = useState<LatLng | null>(null);

  // Filter incidents to major-only — Severe/Serious, closures, or collisions.
  const majorIncidents = useMemo(
    () => incidents.filter(isMajorIncident),
    [incidents],
  );

  const toggleLayer = useCallback((key: LayerKey) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

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

  // Pull live road incidents on mount, then refresh every 5 minutes.
  // We merge TfL (London proper) with National Highways (surrounding motorways
  // and major A-roads) so users see the full picture from their location into
  // and out of the city. Each poll also diffs against the previous snapshot
  // and fires local notifications if the user has opted in.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [tfl, nh, lines] = await Promise.all([
        fetchTrafficIncidents(),
        fetchHighwaysIncidents(),
        fetchLineStatuses(),
      ]);
      if (cancelled) return;
      const merged = new Map<string, TrafficIncident>();
      for (const i of [...tfl, ...nh]) merged.set(i.id, i);
      const incidentList = Array.from(merged.values());
      setIncidents(incidentList);

      // Fire notifications once user prefs are loaded. We snapshot prefs
      // through prefsRef so the loop sees changes from the settings panel.
      const prefs = prefsRef.current;
      if (prefs) {
        diffAndNotifyIncidents(incidentList, prefs).catch(() => undefined);
        diffAndNotifyLines(lines as LineStatus[], prefs).catch(() => undefined);
      }
    };
    // Bootstrap prefs + permission once, then start the poll loop.
    (async () => {
      prefsRef.current = await loadPrefs();
      await ensurePermission();
      load();
    })();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
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

  // Pull a fresh location read in case the cached one is stale (the user
  // may have moved between mount and tapping "Get directions").
  const ensureLocation = useCallback(async (): Promise<LatLng | null> => {
    if (userLocation) return userLocation;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const fresh: LatLng = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setUserLocation(fresh);
      return fresh;
    } catch (e) {
      console.warn('[location] re-read failed', e);
      return null;
    }
  }, [userLocation]);

  const startRouting = useCallback(
    async (dest: Destination) => {
      const origin = await ensureLocation();
      if (!origin) {
        Alert.alert(
          'Location required',
          'We need your location to plan a route. Enable location access in Settings and try again.',
        );
        return;
      }

      setSelected(null);
      setSelectedIncident(null);
      setAirportsOpen(false);
      setDestination(dest);
      setRoutes([]);
      setSelectedRouteIdx(0);
      setRouteError(null);
      setRouteLoading(true);

      const result = await fetchRoutes(origin, {
        latitude: dest.latitude,
        longitude: dest.longitude,
      });

      setRouteLoading(false);
      if (result.error) {
        setRouteError(result.error);
        setRoutes([]);
        // Still centre on the destination so it's visible.
        mapRef.current?.animateToRegion(
          {
            latitude: dest.latitude,
            longitude: dest.longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          },
          400,
        );
        return;
      }

      setRoutes(result.routes);
      setSelectedRouteIdx(0);

      // Fit both endpoints + the fastest route's polyline into view.
      const fastest = result.routes[0];
      const fitCoords: LatLng[] = [
        origin,
        { latitude: dest.latitude, longitude: dest.longitude },
        ...(fastest?.polyline ?? []),
      ];
      if (fitCoords.length > 0) {
        mapRef.current?.fitToCoordinates(fitCoords, {
          edgePadding: { top: 120, right: 60, bottom: 240, left: 60 },
          animated: true,
        });
      }
    },
    [ensureLocation],
  );

  const handleSelectRoute = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= routes.length) return;
      setSelectedRouteIdx(idx);
      const route = routes[idx];
      if (route?.polyline?.length && userLocation && destination) {
        mapRef.current?.fitToCoordinates(
          [
            userLocation,
            { latitude: destination.latitude, longitude: destination.longitude },
            ...route.polyline,
          ],
          {
            edgePadding: { top: 120, right: 60, bottom: 240, left: 60 },
            animated: true,
          },
        );
      }
    },
    [routes, userLocation, destination],
  );

  const clearRoute = useCallback(() => {
    setDestination(null);
    setRoutes([]);
    setSelectedRouteIdx(0);
    setRouteLoading(false);
    setRouteError(null);
    setIsNavigating(false);
    setNavUserPos(null);
    setCurrentStepIdx(0);
    setCameraDetached(false);
    setOffRoute(false);
  }, []);

  // Currently-active route + step for the navigation overlay.
  const activeRoute = routes[selectedRouteIdx] ?? null;
  const steps = activeRoute?.steps ?? [];
  const currentStep: RouteStep | null = steps[currentStepIdx] ?? null;
  const nextStep: RouteStep | null = steps[currentStepIdx + 1] ?? null;

  /**
   * Distance from the user to the end of the current step. Falls back to
   * the step's full length until we have a live nav position fix.
   */
  const distanceToTurnMeters = useMemo(() => {
    if (!currentStep) return 0;
    const ref = navUserPos ?? userLocation;
    if (!ref) return currentStep.distanceMeters;
    return distanceMeters(ref, currentStep.endLocation);
  }, [currentStep, navUserPos, userLocation]);

  /** Sum of remaining step distances from currentStepIdx onward. */
  const remainingDistanceMeters = useMemo(() => {
    if (!steps.length) return activeRoute?.distanceMeters ?? 0;
    let total = 0;
    for (let i = currentStepIdx; i < steps.length; i++) {
      total += steps[i].distanceMeters;
    }
    // Replace the current step's distance with the user's actual distance
    // to its end so the figure shrinks smoothly as they approach.
    if (currentStep) {
      total = total - currentStep.distanceMeters + distanceToTurnMeters;
    }
    return Math.max(0, total);
  }, [steps, currentStepIdx, currentStep, distanceToTurnMeters, activeRoute]);

  /** Same approach for remaining time, scaled by the route's avg pace. */
  const remainingSeconds = useMemo(() => {
    if (!activeRoute) return 0;
    const totalDist = activeRoute.distanceMeters || 1;
    const totalDur = activeRoute.durationInTrafficSeconds;
    const ratio = remainingDistanceMeters / totalDist;
    return Math.max(0, Math.round(totalDur * ratio));
  }, [activeRoute, remainingDistanceMeters]);

  /**
   * Live location + heading watcher. Only active during navigation.
   * Each location fix advances the current step (when within ~30 m of its
   * endpoint), nudges `setUserLocation` so the user dot stays accurate,
   * and — if the camera is still attached — re-centres the map with the
   * current heading and a ~17 zoom + 50° pitch (Google Maps style).
   */
  useEffect(() => {
    if (!isNavigating) return;

    let cancelled = false;
    let posSub: Location.LocationSubscription | null = null;
    let headSub: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) {
          setIsNavigating(false);
          return;
        }

        posSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 5,
            timeInterval: 1000,
          },
          (pos) => {
            if (cancelled) return;
            const here: LatLng = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
            setNavUserPos(here);
            setUserLocation(here);
            // GPS heading (course over ground) is more reliable than the
            // compass at speed; fall back to the compass watcher otherwise.
            const courseHeading = pos.coords.heading;
            if (courseHeading != null && courseHeading >= 0 && pos.coords.speed && pos.coords.speed > 1) {
              setUserHeading(courseHeading);
            }
          },
        );

        headSub = await Location.watchHeadingAsync((h) => {
          if (cancelled) return;
          // trueHeading is preferred; fall back to magHeading.
          const value = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          if (Number.isFinite(value)) setUserHeading(value);
        });
      } catch (e) {
        console.warn('[nav] watchers failed', e);
      }
    })();

    return () => {
      cancelled = true;
      posSub?.remove();
      headSub?.remove();
    };
  }, [isNavigating]);

  // Advance step, detect off-route, drive the camera. Runs whenever the
  // live nav position or heading changes.
  useEffect(() => {
    if (!isNavigating || !navUserPos || !activeRoute) return;

    // Step advancement: within 25 m of the current step's end, jump to next.
    if (currentStep) {
      const toEnd = distanceMeters(navUserPos, currentStep.endLocation);
      if (toEnd < 25 && currentStepIdx < steps.length - 1) {
        setCurrentStepIdx((i) => Math.min(i + 1, steps.length - 1));
      }
    }

    // Off-route detection: if user is > 80 m from any point on the route
    // polyline, flag it. Cheap O(N) check — fine for typical routes.
    const points = activeRoute.polyline;
    if (points.length > 0) {
      let minDist = Infinity;
      for (const p of points) {
        const d = distanceMeters(navUserPos, p);
        if (d < minDist) minDist = d;
        if (minDist < 30) break;
      }
      setOffRoute(minDist > 80);
    }

    // Drive the camera while attached.
    if (!cameraDetached && mapRef.current) {
      mapRef.current.animateCamera(
        {
          center: navUserPos,
          heading: userHeading,
          pitch: 50,
          zoom: 17,
        },
        { duration: 600 },
      );
    }
  }, [
    isNavigating,
    navUserPos,
    userHeading,
    activeRoute,
    currentStep,
    currentStepIdx,
    steps.length,
    cameraDetached,
  ]);

  const startNavigation = useCallback(() => {
    if (!activeRoute) return;
    setCurrentStepIdx(0);
    setCameraDetached(false);
    setOffRoute(false);
    setIsNavigating(true);
    if (userLocation && mapRef.current) {
      mapRef.current.animateCamera(
        {
          center: userLocation,
          heading: userHeading,
          pitch: 50,
          zoom: 17,
        },
        { duration: 600 },
      );
    }
  }, [activeRoute, userLocation, userHeading]);

  const recenterNav = useCallback(() => {
    setCameraDetached(false);
    const ref = navUserPos ?? userLocation;
    if (ref && mapRef.current) {
      mapRef.current.animateCamera(
        { center: ref, heading: userHeading, pitch: 50, zoom: 17 },
        { duration: 500 },
      );
    }
  }, [navUserPos, userLocation, userHeading]);

  const exitNavigation = useCallback(() => {
    setIsNavigating(false);
    clearRoute();
    if (userLocation && mapRef.current) {
      // Reset camera back to flat London view.
      mapRef.current.animateCamera(
        { center: userLocation, heading: 0, pitch: 0, zoom: 14 },
        { duration: 500 },
      );
    }
  }, [clearRoute, userLocation]);

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
        showsCompass={!isNavigating}
        rotateEnabled
        pitchEnabled
        // While navigating we want the user's pan to detach the camera so
        // they can peek without the auto-recentre fighting them.
        onPanDrag={() => {
          if (isNavigating) setCameraDetached(true);
        }}
      >
        {/*
         * While a destination is active (preview or live nav), suppress all
         * other markers so the from / to points are the only things visible
         * besides the route polyline.
         */}
        {!destination && layers.events &&
          visibleEvents.map((event) => {
            const descriptor = pinDescriptorFor(event);
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
                  descriptor={descriptor}
                  selected={selected?.id === event.id}
                />
              </Marker>
            );
          })}

        {!destination && layers.traffic &&
          majorIncidents.map((inc) => (
            <Marker
              key={`traffic-${inc.id}`}
              coordinate={{ latitude: inc.latitude, longitude: inc.longitude }}
              onPress={() => setSelectedIncident(inc)}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <TrafficMarker
                color={incidentColor(inc.severity)}
                iconName={incidentIconName(inc.category, inc.hasClosures)}
                selected={selectedIncident?.id === inc.id}
              />
            </Marker>
          ))}

        {/*
         * Route polylines. Render unselected alternatives first (gray) so
         * the selected route paints on top — and the selected route is drawn
         * as traffic-coloured per-step segments to match the live conditions.
         */}
        {routes.map((route, index) => {
          if (index === selectedRouteIdx) return null;
          return (
            <Polyline
              key={`alt-${route.id}`}
              coordinates={route.polyline}
              strokeColor="#9CA3AF"
              strokeWidth={5}
              tappable
              onPress={() => handleSelectRoute(index)}
              lineCap="round"
              lineJoin="round"
              zIndex={50}
            />
          );
        })}
        {routes[selectedRouteIdx]?.stepSegments.length ? (
          <>
            {routes[selectedRouteIdx].stepSegments.map((seg) => (
              <Polyline
                key={`seg-${seg.id}`}
                coordinates={seg.coords}
                strokeColor={trafficColor(seg.trafficLevel)}
                strokeWidth={7}
                lineCap="round"
                lineJoin="round"
                zIndex={100}
              />
            ))}
          </>
        ) : routes[selectedRouteIdx]?.polyline.length ? (
          <Polyline
            coordinates={routes[selectedRouteIdx].polyline}
            strokeColor={colors.primary}
            strokeWidth={7}
            lineCap="round"
            lineJoin="round"
            zIndex={100}
          />
        ) : null}

        {destination ? (
          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <View style={styles.destinationPin}>
              <View style={styles.destinationPinInner} />
            </View>
          </Marker>
        ) : null}
      </MapView>

      {/* Top filter chrome — hidden once a destination is locked in. */}
      {!destination ? (
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
      ) : null}

      {!destination ? (
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
        </SafeAreaView>
      ) : null}

      {!destination && (
      <MapActionStack
        bottomOffset={90}
        actions={[
          {
            key: 'recenter',
            label: 'Re-centre map',
            icon: 'locate',
            onPress: recenter,
          },
          {
            key: 'connections',
            label: 'Live transit connections',
            icon: 'train',
            onPress: () => setConnectionsOpen(true),
            active: connectionsOpen,
          },
          {
            key: 'airports',
            label: 'London airports',
            icon: 'airplane',
            onPress: () => setAirportsOpen(true),
            active: airportsOpen,
          },
          {
            key: 'traffic',
            label: 'Toggle major traffic incidents',
            icon: layers.traffic ? 'car' : 'car-outline',
            onPress: () => toggleLayer('traffic'),
            active: layers.traffic,
            badge: layers.traffic ? majorIncidents.length : 0,
          },
          {
            key: 'layers',
            label: 'Map layers',
            icon: 'layers',
            onPress: () => setLayersOpen(true),
            active: layersOpen,
          },
          {
            key: 'notifications',
            label: 'Notifications',
            icon: 'notifications',
            onPress: () => setNotifSettingsOpen(true),
            active: notifSettingsOpen,
          },
        ]}
      />
      )}

      <EventDetailsSheet
        event={selected}
        userLocation={userLocation}
        onClose={() => setSelected(null)}
        onNavigate={(event) => {
          setSelected(null);
          setPickerDestination({
            label: event.title,
            latitude: event.latitude,
            longitude: event.longitude,
          });
        }}
      />

      <TrafficIncidentSheet
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onNavigate={(inc) => {
          setSelectedIncident(null);
          setPickerDestination({
            label: inc.location ?? `${inc.severity} incident`,
            latitude: inc.latitude,
            longitude: inc.longitude,
          });
        }}
      />

      <LayerControlPanel
        visible={layersOpen}
        onClose={() => setLayersOpen(false)}
        layers={layers}
        onToggle={toggleLayer}
      />

      <ConnectionsPanel
        visible={connectionsOpen}
        onClose={() => setConnectionsOpen(false)}
      />

      <NotificationSettingsPanel
        visible={notifSettingsOpen}
        onClose={async () => {
          setNotifSettingsOpen(false);
          // Re-read prefs so the next poll picks up the user's changes.
          prefsRef.current = await loadPrefs();
        }}
      />

      <AirportsPanel
        visible={airportsOpen}
        onClose={() => setAirportsOpen(false)}
        onPickAirport={(latitude, longitude) => {
          mapRef.current?.animateToRegion(
            { latitude, longitude, latitudeDelta: 0.06, longitudeDelta: 0.06 },
            450,
          );
        }}
        onNavigate={(airport) => {
          setAirportsOpen(false);
          setPickerDestination({
            label: airport.name,
            latitude: airport.latitude,
            longitude: airport.longitude,
          });
        }}
      />

      {/* Route preview card (fastest + alternatives, then "Start") */}
      {!isNavigating ? (
        <RouteInfoPanel
          visible={destination != null}
          loading={routeLoading}
          error={routeError}
          routes={routes}
          selectedIndex={selectedRouteIdx}
          destinationLabel={destination?.label ?? null}
          onSelect={handleSelectRoute}
          onClose={clearRoute}
          onStart={startNavigation}
        />
      ) : null}

      {/* Turn-by-turn HUD once the user hits "Start" */}
      {isNavigating ? (
        <NavigationOverlay
          currentStep={currentStep}
          nextStep={nextStep}
          distanceToTurnMeters={distanceToTurnMeters}
          remainingDistanceMeters={remainingDistanceMeters}
          remainingSeconds={remainingSeconds}
          cameraDetached={cameraDetached}
          offRoute={offRoute}
          onRecenter={recenterNav}
          onExit={exitNavigation}
        />
      ) : null}

      {/* App picker — DriveIQ / Google Maps / Waze / Apple Maps */}
      <NavigationAppPicker
        destination={pickerDestination}
        onClose={() => setPickerDestination(null)}
        onPickDriveIQ={(dest) => {
          startRouting({
            kind: 'event',
            label: dest.label,
            latitude: dest.latitude,
            longitude: dest.longitude,
          });
        }}
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
  destinationPin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 4,
    borderColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  destinationPinInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});
