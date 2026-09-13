import { cn } from "@/lib/utils/cn";

export type Band = "low" | "moderate" | "high";

// Colour and word travel together, always. The word is not decoration: it is
// the accessible carrier of the state, so a reader who cannot distinguish the
// hue — colour blindness, greyscale, a dim screen — loses nothing. A band
// rendered as colour alone is the specific failure this component prevents,
// which is why there is no "icon only" or "dot only" variant.
const BAND: Record<Band, { label: string; text: string; dot: string; ring: string }> = {
  high: { label: "Ready", text: "text-success", dot: "bg-success", ring: "border-success/40" },
  moderate: { label: "Moderate", text: "text-warning", dot: "bg-warning", ring: "border-warning/40" },
  low: { label: "Low", text: "text-danger", dot: "bg-danger", ring: "border-danger/40" },
};

export function bandLabel(band: Band): string {
  return BAND[band].label;
}

export function bandTextClass(band: Band): string {
  return BAND[band].text;
}

export function BandBadge({ band, className }: { band: Band; className?: string }) {
  const { label, text, dot, ring } = BAND[band];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        text,
        ring,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden />
      {label}
    </span>
  );
}
