import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Marker } from 'react-native-maps';

import { EventMarker } from '@/components/EventMarker';
import type { AppEvent } from '@/types/event';
import { pinDescriptorFor } from '@/utils/eventIcons';

interface EventPinProps {
  event: AppEvent;
  selected: boolean;
  onPress: (event: AppEvent) => void;
}

/**
 * A single event map pin.
 *
 * ## Why this exists (the flicker fix)
 * react-native-maps re-rasterises a custom marker on EVERY render while
 * `tracksViewChanges` is true — and the parent map re-renders constantly
 * (location, polls, selection). Leaving tracking on = the constant flicker.
 *
 * So each pin manages its own `tracksViewChanges`:
 *   - true for a short beat on mount (so the custom view rasterises once),
 *     then false — the pin becomes a frozen bitmap that never flickers.
 *   - true again briefly whenever `selected` flips, so the grow/shrink
 *     spring animation is captured, then frozen again.
 *
 * Wrapped in React.memo so an unrelated parent re-render (e.g. a traffic
 * poll) doesn't touch any pin whose own props are unchanged.
 */
function EventPinBase({ event, selected, onPress }: EventPinProps) {
  const descriptor = useMemo(() => pinDescriptorFor(event), [event]);

  // Track view changes briefly on mount so the marker rasterises, then freeze.
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setTracks(false), 400);
    return () => clearTimeout(id);
  }, []);

  // Re-enable tracking ONLY for a real select/deselect after mount — skipping
  // the initial run avoids a second, overlapping track window on every pin as
  // it appears (a key source of the mass flicker). Once selection actually
  // flips we briefly re-rasterise to capture the grow/shrink spring, then
  // freeze the final frame again.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setTracks(true);
    const id = setTimeout(() => setTracks(false), 520);
    return () => clearTimeout(id);
  }, [selected]);

  return (
    <Marker
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      onPress={() => onPress(event)}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracks}
    >
      <EventMarker descriptor={descriptor} selected={selected} />
    </Marker>
  );
}

export const EventPin = React.memo(
  EventPinBase,
  (prev, next) =>
    prev.selected === next.selected &&
    prev.event.id === next.event.id &&
    prev.event.latitude === next.event.latitude &&
    prev.event.longitude === next.event.longitude &&
    prev.onPress === next.onPress,
);
