export interface SrpeInput {
  rpe: number; // Borg CR10 scale, 0-10
  durationMinutes: number;
}

export function computeSrpe(input: SrpeInput): number {
  return input.rpe * input.durationMinutes;
}
