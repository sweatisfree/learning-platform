import type { Activity } from "@/lib/types/activity";
import { parseGpx } from "./parseGpx";
import { parseTcx } from "./parseTcx";

export async function parseWorkoutFile(file: File): Promise<Activity> {
  const text = await file.text();
  const extension = file.name.split(".").pop()?.toLowerCase();

  const parsed =
    extension === "gpx"
      ? parseGpx(text)
      : extension === "tcx"
        ? parseTcx(text)
        : null;

  if (!parsed) {
    throw new Error(`Unsupported file type: .${extension ?? "unknown"} — upload a .gpx or .tcx file.`);
  }

  return {
    id: crypto.randomUUID(),
    source: "file",
    ...parsed,
  };
}
