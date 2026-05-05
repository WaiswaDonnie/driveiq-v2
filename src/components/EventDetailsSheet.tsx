import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '@/theme/colors';
import type { AppEvent } from '@/types/event';
import { formatEventDate } from '@/utils/dateFilters';
import { distanceKm, formatDistance, type LatLng } from '@/utils/distance';
import { pinDescriptorFor } from '@/utils/eventIcons';

interface EventDetailsSheetProps {
  event: AppEvent | null;
  userLocation: LatLng | null;
  onClose: () => void;
}

export function EventDetailsSheet({
  event,
  userLocation,
  onClose,
}: EventDetailsSheetProps) {
  const visible = event != null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {event && <SheetBody event={event} userLocation={userLocation} />}
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close event details"
          >
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SheetBody({
  event,
  userLocation,
}: {
  event: AppEvent;
  userLocation: LatLng | null;
}) {
  const km = userLocation
    ? distanceKm(userLocation, {
        latitude: event.latitude,
        longitude: event.longitude,
      })
    : null;

  const { color: accent, icon } = pinDescriptorFor(event);
  const categoryLabel =
    event.subCategory ?? (event.category === 'sports' ? 'Sports' : 'Event');

  return (
    <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
      <View style={styles.handle} />
      <View style={[styles.tagRow]}>
        <View style={[styles.tag, { backgroundColor: accent }]}>
          <Text style={styles.tagIcon}>{icon}</Text>
          <Text style={styles.tagText}>{categoryLabel}</Text>
        </View>
        {km != null && (
          <Text style={styles.distance}>{formatDistance(km)} away</Text>
        )}
      </View>

      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.date}>{formatEventDate(event.startsAt)}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Venue</Text>
        <Text style={styles.metaValue}>{event.venue}</Text>
      </View>

      {event.description ? (
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>About</Text>
          <Text style={styles.metaValue}>{event.description}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(14, 42, 58, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
    maxHeight: '70%',
  },
  body: {
    paddingHorizontal: 20,
  },
  bodyContent: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tagIcon: {
    fontSize: 13,
  },
  tagText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  distance: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  date: {
    fontSize: 15,
    color: colors.primaryDark,
    fontWeight: '600',
    marginBottom: 16,
  },
  metaRow: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  closeBtn: {
    marginTop: 8,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  closeText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
