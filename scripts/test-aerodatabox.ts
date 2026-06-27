/**
 * Offline unit test for the AeroDataBox FIDS parser (normalizeFids).
 *
 * Runs without network or an API key — it feeds a realistic AeroDataBox
 * response fixture through the parser and asserts the normalised output.
 *
 * Run:  bun scripts/test-aerodatabox.ts   (or: npx tsx scripts/test-aerodatabox.ts)
 */
import { normalizeFids, type AdbFidsResponse } from '../src/services/aerodatabox';

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    console.error(`  ✗ ${msg}`);
    failures++;
  }
}

// Realistic FIDS shape (trimmed to the fields the parser reads).
const fixture: AdbFidsResponse = {
  arrivals: [
    {
      number: 'EI 152',
      status: 'Expected',
      airline: { name: 'Aer Lingus' },
      movement: {
        airport: { iata: 'DUB', name: 'Dublin' },
        scheduledTime: { utc: '2026-06-26 07:05Z', local: '2026-06-26 08:05+01:00' },
        terminal: '2',
      },
    },
    {
      number: 'BA 831',
      status: 'Delayed',
      airline: { name: 'British Airways' },
      movement: {
        airport: { iata: 'AMS', name: 'Amsterdam' },
        scheduledTime: { utc: '2026-06-26 06:30Z', local: '2026-06-26 07:30+01:00' },
        revisedTime: { utc: '2026-06-26 07:00Z', local: '2026-06-26 08:00+01:00' },
        terminal: '5',
      },
    },
  ],
  departures: [
    {
      number: 'U2 8001',
      status: 'Canceled',
      airline: { name: 'easyJet' },
      movement: {
        airport: { iata: 'CDG', name: 'Paris' },
        scheduledTime: { utc: '2026-06-26 09:00Z', local: '2026-06-26 10:00+01:00' },
      },
    },
    {
      number: 'QR 8123',
      status: 'Scheduled',
      airline: { name: 'Qatar Airways Cargo' },
      isCargo: true, // must be dropped
      movement: {
        airport: { iata: 'DOH', name: 'Doha' },
        scheduledTime: { utc: '2026-06-26 05:00Z', local: '2026-06-26 06:00+01:00' },
      },
    },
    {
      number: 'BA 902',
      status: 'Boarding',
      airline: { name: 'British Airways' },
      movement: {
        airport: { iata: 'FRA', name: 'Frankfurt' },
        scheduledTime: { utc: '2026-06-26 08:15Z', local: '2026-06-26 09:15+01:00' },
      },
    },
  ],
};

const out = normalizeFids(fixture);

console.log('AeroDataBox normalizeFids');
assert(out.length === 4, 'drops the cargo flight (4 of 5 kept)');
assert(out.every((f) => f.flightNumber !== 'QR 8123'), 'cargo flight is excluded');

const delayed = out.find((f) => f.flightNumber === 'BA 831');
assert(!!delayed && delayed.delayed === true, 'BA 831 flagged delayed');
assert(!!delayed && delayed.delayMinutes === 30, 'BA 831 delay computed as 30 min');
assert(!!delayed && delayed.direction === 'arrival', 'BA 831 direction = arrival');

const cancelled = out.find((f) => f.flightNumber === 'U2 8001');
assert(!!cancelled && cancelled.cancelled === true, 'U2 8001 flagged cancelled');
assert(!!cancelled && cancelled.delayed === false, 'cancelled flight is not also delayed');

const onTime = out.find((f) => f.flightNumber === 'EI 152');
assert(!!onTime && onTime.delayed === false && onTime.delayMinutes === undefined, 'EI 152 on time');
assert(!!onTime && onTime.counterpart === 'Dublin' && onTime.terminal === '2', 'EI 152 origin + terminal parsed');

// Sorted ascending by scheduled time: BA831(06:30) < EI152(07:05) < BA902(08:15) < U28001(09:00)
const order = out.map((f) => f.flightNumber);
assert(
  JSON.stringify(order) === JSON.stringify(['BA 831', 'EI 152', 'BA 902', 'U2 8001']),
  `sorted by scheduled time (got ${order.join(', ')})`,
);

if (failures > 0) {
  console.error(`\n${failures} assertion(s) FAILED`);
  process.exit(1);
} else {
  console.log('\nAll assertions passed ✅');
}
