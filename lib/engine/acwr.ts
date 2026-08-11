import { computeEwma } from "./ewma";

const ACUTE_WINDOW_DAYS = 7;
const CHRONIC_WINDOW_DAYS = 28;

export interface AcwrResult {
  acute: number;
  chronic: number;
  ratio: number;
}

// EWMA-based ACWR (Williams et al., 2016) — smoother than bucketed
// weekly-sum ACWR and avoids its artificial week-boundary spikes.
export function computeAcwr(dailyLoad: readonly number[]): AcwrResult {
  if (dailyLoad.length === 0) return { acute: 0, chronic: 0, ratio: 0 };
  const acuteSeries = computeEwma(dailyLoad, ACUTE_WINDOW_DAYS);
  const chronicSeries = computeEwma(dailyLoad, CHRONIC_WINDOW_DAYS);
  const acute = acuteSeries[acuteSeries.length - 1];
  const chronic = chronicSeries[chronicSeries.length - 1];
  return { acute, chronic, ratio: chronic === 0 ? 0 : acute / chronic };
}

export function computeAcwrSeries(dailyLoad: readonly number[]): AcwrResult[] {
  const acuteSeries = computeEwma(dailyLoad, ACUTE_WINDOW_DAYS);
  const chronicSeries = computeEwma(dailyLoad, CHRONIC_WINDOW_DAYS);
  return dailyLoad.map((_, i) => ({
    acute: acuteSeries[i],
    chronic: chronicSeries[i],
    ratio: chronicSeries[i] === 0 ? 0 : acuteSeries[i] / chronicSeries[i],
  }));
}
