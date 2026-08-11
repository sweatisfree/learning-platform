// EWMA seeds on the first sample (rather than 0) so short series don't ramp
// up from an artificially low baseline.
export function computeEwma(
  values: readonly number[],
  timeConstantDays: number,
): number[] {
  if (values.length === 0) return [];
  const lambda = 2 / (timeConstantDays + 1);
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(values[i] * lambda + result[i - 1] * (1 - lambda));
  }
  return result;
}
