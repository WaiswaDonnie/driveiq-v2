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

// ---------- Line detail (affected stations + raw disruptions) ----------

export interface AffectedStop {
  id: string;
  name: string;
  /** Optional zone / interchange hint shown beside the stop name. */
  meta?: string;
}

export interface LineDisruption {
  category?: string;
  description: string;
  /** First URL pulled out of the description body, if any. */
  link?: string;
  affectedRoutes?: string[];
  closureText?: string;
}

export interface LineDetail {
  id: string;
  name: string;
  modeName: string;
  severityBucket: LineSeverityBucket;
  statusDescription: string;
  /** Long-form reason text from the worst current status, untrimmed. */
  reason?: string;
  disruptions: LineDisruption[];
  affectedStops: AffectedStop[];
  fetchedAt: number;
}

interface RawDisruption {
  category?: string;
  description?: string;
  affectedRoutes?: { name?: string; routeCode?: string }[];
  closureText?: string;
}

interface RawAffectedStop {
  id?: string;
  naptanId?: string;
  commonName?: string;
  name?: string;
  zone?: string;
  modes?: string[];
}

interface RawLineDetail extends RawLine {
  disruptions?: RawDisruption[];
}

/**
 * Pull the first http(s) URL out of a free-text disruption body so we can
 * surface it as a tappable link in the popup. TfL stuffs full nationalrail.co.uk
 * service-disruption URLs inside `reason` for National Rail operators.
 */
const URL_RE = /https?:\/\/[^\s)]+/i;
export const extractLink = (text: string | undefined): string | undefined => {
  if (!text) return undefined;
  const m = text.match(URL_RE);
  return m ? m[0].replace(/[.,;]+$/, '') : undefined;
};

/**
 * Fetch a single line's full status (worst-status + every disruption row +
 * affected stop list). Endpoint: `/Line/{id}/Status?detail=true`.
 *
 * The TfL response nests `affectedStops` inside each `lineStatuses` entry.
 * We flatten + dedupe by NaPTAN id so the UI can render a simple list.
 */
export async function fetchLineDetail(lineId: string): Promise<LineDetail | null> {
  const url = `https://api.tfl.gov.uk/Line/${encodeURIComponent(
    lineId,
  )}/Status?detail=true${APP_KEY ? `&app_key=${encodeURIComponent(APP_KEY)}` : ''}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    console.warn('[tfl-lines] detail network error', e);
    return null;
  }
  if (!res.ok) {
    console.warn('[tfl-lines] detail non-OK', res.status);
    return null;
  }

  const arr = (await res.json()) as RawLineDetail[];
  const raw = arr[0];
  if (!raw) return null;

  const worst = (raw.lineStatuses ?? []).reduce<RawLineStatus | null>(
    (acc, s) => (acc == null || s.statusSeverity < acc.statusSeverity ? s : acc),
    null,
  );
  const sev = worst?.statusSeverity ?? 10;

  // Dedupe affected stops across all status entries.
  const stopMap = new Map<string, AffectedStop>();
  for (const ls of raw.lineStatuses ?? []) {
    const stops = (ls as unknown as { affectedStops?: RawAffectedStop[] })
      .affectedStops ?? [];
    for (const s of stops) {
      const id = s.id ?? s.naptanId ?? s.commonName ?? s.name ?? '';
      if (!id) continue;
      if (stopMap.has(id)) continue;
      const name = s.commonName ?? s.name ?? id;
      const meta = s.zone ? `Zone ${s.zone}` : undefined;
      stopMap.set(id, { id, name, meta });
    }
  }

  const disruptions: LineDisruption[] = (raw.disruptions ?? []).map((d) => ({
    category: d.category,
    description: (d.description ?? '').trim(),
    link: extractLink(d.description),
    affectedRoutes: (d.affectedRoutes ?? [])
      .map((r) => r.name ?? r.routeCode)
      .filter((v): v is string => !!v),
    closureText: d.closureText,
  }));

  // If TfL returned no top-level disruptions, synthesise one from the worst
  // line-status entry so the popup always has something concrete to show.
  if (disruptions.length === 0 && worst?.reason) {
    disruptions.push({
      description: worst.reason.trim(),
      link: extractLink(worst.reason),
    });
  }

  return {
    id: raw.id,
    name: raw.name,
    modeName: raw.modeName,
    severityBucket: bucket(sev),
    statusDescription: worst?.statusSeverityDescription ?? 'Good service',
    reason: worst?.reason?.trim(),
    disruptions,
    affectedStops: Array.from(stopMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
    fetchedAt: Date.now(),
  };
}
