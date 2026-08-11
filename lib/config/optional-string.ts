import { z } from "zod";

// An unset-but-present env var (`X=` in .env.local, or a blank field in a
// host's env UI) is an empty string, not undefined — normalize that to
// undefined so `.optional()` fields behave as expected.
export const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);
