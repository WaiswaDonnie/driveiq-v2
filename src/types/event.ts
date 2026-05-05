/**
 * Unified event shape used throughout the UI.
 * Both SportMonks fixtures and Ticketmaster events are normalised to this.
 */
export type EventCategory = 'sports' | 'other';

export interface AppEvent {
  /** Globally-unique id, prefixed with the source for safety. */
  id: string;
  /** Provider name. */
  source: 'sportmonks' | 'ticketmaster' | 'sample';
  category: EventCategory;
  title: string;
  /** ISO-8601 string. */
  startsAt: string;
  /** Human-readable venue name. */
  venue: string;
  /** Map coordinates. */
  latitude: number;
  longitude: number;
  /** Optional short description / summary. */
  description?: string;
  /** Sub-classification: e.g. "Football", "Music", "Theatre". */
  subCategory?: string;
  /** External URL (used internally — not rendered as a Get Tickets button per requirements). */
  url?: string;
}
