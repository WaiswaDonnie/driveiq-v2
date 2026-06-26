import { getItem, setItem } from './storage';

/**
 * First-launch product tour flag. Separate from the notification-permission
 * popup (services/notifications.ts) so the two can be sequenced: tour first,
 * then the notifications ask.
 */

const KEY_TOUR_SEEN = 'driveiq.tour.seen.v1';

export async function hasSeenTour(): Promise<boolean> {
  return (await getItem(KEY_TOUR_SEEN)) === '1';
}

export async function markTourSeen(): Promise<void> {
  await setItem(KEY_TOUR_SEEN, '1');
}
