import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { CATEGORY_FILTERS, type CategoryFilterKey } from '@/utils/eventIcons';

interface CategoryFilterBarProps {
  /** Set of category keys currently selected. Empty set = show all. */
  selected: Set<CategoryFilterKey>;
  onToggle: (key: CategoryFilterKey) => void;
  onReset: () => void;
}

/**
 * Multi-select chip row for event categories. The first chip is an "All"
 * sentinel that clears every active filter; the remaining chips toggle a
 * single category each. When zero category chips are active, the map shows
 * everything (so "All" is the implicit / default state).
 */
export function CategoryFilterBar({
  selected,
  onToggle,
  onReset,
}: CategoryFilterBarProps) {
  const allActive = selected.size === 0;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <Pressable
          onPress={onReset}
          style={[styles.chip, allActive && styles.chipActiveAll]}
          accessibilityRole="button"
          accessibilityState={{ selected: allActive }}
        >
          <Text
            style={[styles.chipText, allActive && styles.chipTextActiveAll]}
          >
            All
          </Text>
        </Pressable>

        {CATEGORY_FILTERS.map(({ key, label, icon, color }) => {
          const isActive = selected.has(key);
          return (
            <Pressable
              key={key}
              onPress={() => onToggle(key)}
              style={[
                styles.chip,
                isActive && { backgroundColor: color, borderColor: color },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={styles.chipIcon}>{icon}</Text>
              <Text
                style={[styles.chipText, isActive && styles.chipTextActive]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
  },
  row: {
    gap: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 2,
  },
  chipActiveAll: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  chipIcon: {
    fontSize: 14,
  },
  chipText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.textOnPrimary,
  },
  chipTextActiveAll: {
    color: colors.textOnPrimary,
  },
});
