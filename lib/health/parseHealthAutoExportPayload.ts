export interface ParsedDailyReading {
  recordedDate: string; // YYYY-MM-DD
  restingHeartRate: number | null;
  hrv: number | null;
  sleepHours: number | null;
  respiratoryRate: number | null;
}

interface HealthAutoExportMetricSample {
  date: string; // e.g. "2026-08-20 00:00:00 -0500"
  qty: number;
}

// sleep_analysis has an entirely different per-sample shape from every
// other metric here — no `qty` field at all. `asleep` (actual sleep time)
// is used as the sleep-hours value, not `totalSleep` or `inBed`, but this
// is NOT verified against a real payload — the docs expose asleep and
// totalSleep as distinct fields, which likely means a real, non-obvious
// difference (e.g. one sums sleep stages differently than the other).
// Recheck against one real Health Auto Export sleep export before trusting.
interface HealthAutoExportSleepSample {
  date: string;
  asleep?: number;
  totalSleep?: number;
}

interface HealthAutoExportMetric {
  name: string;
  data: Array<HealthAutoExportMetricSample | HealthAutoExportSleepSample>;
}

interface HealthAutoExportPayload {
  data?: {
    metrics?: HealthAutoExportMetric[];
  };
}

const RESTING_HR_NAMES = new Set(["resting_heart_rate", "restingheartrate", "resting heart rate"]);
const HRV_NAMES = new Set(["heart_rate_variability", "heartratevariability", "hrv", "heart rate variability"]);
// Not verified against a real payload — Health Auto Export's docs list this
// name among "commonly exported metrics" but don't confirm the per-point
// shape, unlike resting_heart_rate. Presumed to follow the same {qty, date}
// shape until checked against real data.
const RESPIRATORY_RATE_NAMES = new Set(["respiratory_rate", "respiratoryrate", "respiratory rate"]);
const SLEEP_ANALYSIS_NAMES = new Set(["sleep_analysis", "sleepanalysis", "sleep analysis"]);

function normalizeMetricName(name: string): string {
  return name.trim().toLowerCase();
}

function extractDateKey(rawDate: string): string {
  // Health Auto Export timestamps look like "2026-08-20 00:00:00 -0500" —
  // the date portion is always the first 10 characters.
  return rawDate.slice(0, 10);
}

function average(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

interface DailyAccumulator {
  restingHeartRate: number[];
  hrv: number[];
  sleepHours: number[];
  respiratoryRate: number[];
}

function getOrCreateEntry(byDate: Map<string, DailyAccumulator>, dateKey: string): DailyAccumulator {
  const existing = byDate.get(dateKey);
  if (existing) return existing;
  const created: DailyAccumulator = { restingHeartRate: [], hrv: [], sleepHours: [], respiratoryRate: [] };
  byDate.set(dateKey, created);
  return created;
}

// Parses Health Auto Export's REST API export format. NOTE: based on the
// vendor's documented shape, not verified against a live payload — recheck
// field names once the app is actually configured and sending real data.
// Multiple same-day samples (HRV and respiratory rate especially can be
// intraday) are averaged into one reading per date, not last-write-wins.
export function parseHealthAutoExportPayload(payload: unknown): ParsedDailyReading[] {
  const body = payload as HealthAutoExportPayload;
  const metrics = body?.data?.metrics ?? [];

  const byDate = new Map<string, DailyAccumulator>();

  for (const metric of metrics) {
    const normalizedName = normalizeMetricName(metric.name ?? "");

    if (SLEEP_ANALYSIS_NAMES.has(normalizedName)) {
      for (const sample of metric.data ?? []) {
        const sleepSample = sample as HealthAutoExportSleepSample;
        if (typeof sleepSample.asleep !== "number" || !sleepSample.date) continue;
        const entry = getOrCreateEntry(byDate, extractDateKey(sleepSample.date));
        entry.sleepHours.push(sleepSample.asleep);
      }
      continue;
    }

    const isRestingHr = RESTING_HR_NAMES.has(normalizedName);
    const isHrv = HRV_NAMES.has(normalizedName);
    const isRespiratoryRate = RESPIRATORY_RATE_NAMES.has(normalizedName);
    if (!isRestingHr && !isHrv && !isRespiratoryRate) continue;

    for (const sample of metric.data ?? []) {
      const qtySample = sample as HealthAutoExportMetricSample;
      if (typeof qtySample.qty !== "number" || !qtySample.date) continue;
      const entry = getOrCreateEntry(byDate, extractDateKey(qtySample.date));
      if (isRestingHr) entry.restingHeartRate.push(qtySample.qty);
      if (isHrv) entry.hrv.push(qtySample.qty);
      if (isRespiratoryRate) entry.respiratoryRate.push(qtySample.qty);
    }
  }

  return Array.from(byDate.entries()).map(([recordedDate, entry]) => ({
    recordedDate,
    restingHeartRate: average(entry.restingHeartRate),
    hrv: average(entry.hrv),
    sleepHours: average(entry.sleepHours),
    respiratoryRate: average(entry.respiratoryRate),
  }));
}
