/**
 * TfL Line Status — current status for tube, overground, DLR, Elizabeth, tram
 * and national rail lines into London.
 *
 * Docs: https://api.tfl.gov.uk/swagger/ui/index.html#!/Line/Line_StatusByMode
 *
 * Severity scale (TfL): 0/1=closure, 2=suspended, 3=part-suspended, 4=planned,
 * 5=part-closure, 6=severe-delays, 7=reduced, 8=bus-replacement, 9=minor,
 * 10=good service. We collapse this into UI-friendly buckets.
 */

const APP_KEY = process.env.EXPO_PUBLIC_TFL_APP_KEY ?? '';
const MODES = 'tube,overground,dlr,elizabeth-line,tram,national-rail';
const ENDPOINT = `https://api.tfl.gov.uk/Line/Mode/${MODES}/Status`;

export type LineSeverityBucket = 'good' | 'minor' | 'severe' | 'closed';

export interface LineStatus {
  id: string;
  name: string;
  modeName: string;
  severityBucket: LineSeverityBucket;
  statusDescription: string;
  reason?: string;
}

interface RawLineStatus {
  statusSeverity: number;
  statusSeverityDescription: string;
  reason?: string;
}

interface RawLine {
  id: string;
  name: string;
  modeName: string;
  lineStatuses: RawLineStatus[];
}

const bucket = (sev: number): LineSeverityBucket => {
  if (sev >= 10) return 'good';
  if (sev <= 2) return 'closed';
  if (sev <= 6) return 'severe';
  return 'minor';
};

export const SEVERITY_RANK: Record<LineSeverityBucket, number> = {
  closed: 0,
  severe: 1,
  minor: 2,
  good: 3,
};

export const SEVERITY_COLOR: Record<LineSeverityBucket, string> = {
  good: '#26C281',
  minor: '#FACC15',
  severe: '#F97316',
  closed: '#DC2626',
};

export const SEVERITY_LABEL: Record<LineSeverityBucket, string> = {
  good: 'Good service',
  minor: 'Minor disruption',
  severe: 'Severe disruption',
  closed: 'Closed / suspended',
};

export async function fetchLineStatuses(): Promise<LineStatus[]> {
  const url = APP_KEY ? `${ENDPOINT}?app_key=${encodeURIComponent(APP_KEY)}` : ENDPOINT;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    console.warn('[tfl-lines] network error', e);
    return [];
  }
  if (!res.ok) {
    console.warn('[tfl-lines] non-OK', res.status);
    return [];
  }

  const raw = (await res.json()) as RawLine[];
  const out: LineStatus[] = raw.map((l) => {
    // TfL returns one entry per concurrent status. Use the worst.
    const worst = (l.lineStatuses ?? []).reduce<RawLineStatus | null>(
      (acc, s) => (acc == null || s.statusSeverity < acc.statusSeverity ? s : acc),
      null,
    );
    const sev = worst?.statusSeverity ?? 10;
    return {
      id: l.id,
      name: l.name,
      modeName: l.modeName,
      severityBucket: bucket(sev),
      statusDescription: worst?.statusSeverityDescription ?? 'Good service',
      reason: worst?.reason?.trim(),
    };
  });

  // Sort: worst-first so problems surface at the top of the panel.
  out.sort((a, b) => SEVERITY_RANK[a.severityBucket] - SEVERITY_RANK[b.severityBucket]);
  console.log(`[tfl-lines] ${out.length} lines (${out.filter((l) => l.severityBucket !== 'good').length} disrupted)`);
  return out;
}
