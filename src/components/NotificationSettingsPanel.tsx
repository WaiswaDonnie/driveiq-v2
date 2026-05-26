import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { colors } from '@/theme/colors';
import {
  ensurePermission,
  loadPrefs,
  savePrefs,
  type NotificationChannel,
  type NotificationPrefs,
} from '@/services/notifications';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface Row {
  key: NotificationChannel;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
}

const ROWS: Row[] = [
  {
    key: 'road-accidents',
    icon: 'warning',
    title: 'Road accidents',
    body:
      'Major accidents and closures on London roads and surrounding motorways — M1, M11, M20, M23, M25, M3, M4, M40 and connecting A-roads.',
  },
  {
    key: 'line-closures',
    icon: 'train',
    title: 'Train & tube disruptions',
    body:
      'Pings when a tube, Overground, Elizabeth line, DLR, tram or National Rail operator moves into Severe or Closed status.',
  },
  {
    key: 'saved-events',
    icon: 'calendar',
    title: 'Saved events',
    body:
      'A heads-up one hour before each event you’ve saved or followed — so you have time to plan a route.',
  },
];

export function NotificationSettingsPanel({ visible, onClose }: Props) {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  useEffect(() => {
    if (!visible) return;
    loadPrefs().then(setPrefs);
    ensurePermission();
  }, [visible]);

  if (!visible) return null;

  const toggle = (key: NotificationChannel) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    savePrefs(next);
  };

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="notifications" size={22} color={colors.textOnPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              Choose what DriveIQ should ping you about
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
            <Ionicons name="close" size={26} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 28 }}>
          {ROWS.map((row) => (
            <View key={row.key} style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name={row.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowBody}>{row.body}</Text>
              </View>
              <Switch
                value={!!prefs?.[row.key]}
                onValueChange={() => toggle(row.key)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
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
    height: '70%',
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
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  body: { marginTop: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    marginBottom: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  rowBody: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
});
