import { colors } from '@/theme/colors';
import type { AppEvent } from '@/types/event';

/**
 * Maps an event onto the icon glyph + accent colour shown on its map pin
 * and on filter chips. SportMonks fixtures (always sports) are split by
 * sport sub-category so a football match looks different from a cricket
 * test or a tennis tie. Ticketmaster events fall through into the
 * non-sports buckets (Music, Theatre, Comedy, Film, Family, Other).
 */

export type CategoryFilterKey =
  | 'sports'
  | 'music'
  | 'theatre'
  | 'comedy'
  | 'film'
  | 'family'
  | 'other';

export interface CategoryDescriptor {
  key: CategoryFilterKey;
  label: string;
  icon: string;
  color: string;
}

export const CATEGORY_FILTERS: CategoryDescriptor[] = [
  { key: 'sports', label: 'Sports', icon: '🏆', color: colors.sports },
  { key: 'music', label: 'Music', icon: '🎵', color: colors.music },
  { key: 'theatre', label: 'Theatre', icon: '🎭', color: colors.theatre },
  { key: 'comedy', label: 'Comedy', icon: '😄', color: colors.comedy },
  { key: 'film', label: 'Film', icon: '🎬', color: colors.film },
  { key: 'family', label: 'Family', icon: '🎈', color: colors.family },
  { key: 'other', label: 'Other', icon: '✨', color: colors.other },
];

/** Bucket an event into one of the category filter keys. */
export function categoryFilterFor(event: AppEvent): CategoryFilterKey {
  if (event.category === 'sports') return 'sports';
  const sub = (event.subCategory ?? '').toLowerCase();
  if (sub.includes('music') || sub.includes('concert')) return 'music';
  if (sub.includes('theatre') || sub.includes('arts')) return 'theatre';
  if (sub.includes('comedy')) return 'comedy';
  if (sub.includes('film')) return 'film';
  if (sub.includes('family')) return 'family';
  return 'other';
}

/** Glyph + accent colour for a single event's pin. */
export function pinDescriptorFor(event: AppEvent): {
  icon: string;
  color: string;
} {
  const sub = (event.subCategory ?? '').toLowerCase();

  // Sports: differentiate per sub-category so a football match, cricket test,
  // tennis tie, rugby fixture etc. each show a sport-specific glyph.
  if (event.category === 'sports') {
    if (sub.includes('cricket'))
      return { icon: '🏏', color: colors.sports };
    if (sub.includes('tennis'))
      return { icon: '🎾', color: colors.sports };
    if (sub.includes('rugby'))
      return { icon: '🏉', color: colors.sports };
    if (sub.includes('basketball'))
      return { icon: '🏀', color: colors.sports };
    if (sub.includes('box'))
      return { icon: '🥊', color: colors.sports };
    if (sub.includes('run') || sub.includes('marathon'))
      return { icon: '🏃', color: colors.sports };
    if (sub.includes('hockey'))
      return { icon: '🏒', color: colors.sports };
    if (sub.includes('golf'))
      return { icon: '⛳', color: colors.sports };
    return { icon: '⚽', color: colors.sports };
  }

  // Non-sports: keep the original simple star pin — single icon, single accent.
  return { icon: '★', color: colors.accent };
}
