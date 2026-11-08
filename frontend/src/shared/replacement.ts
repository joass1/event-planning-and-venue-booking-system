/**
 * L5 (CR-02) and S3: why a confirmed booking is being replaced. It decides the search window (a
 * booking an approved change moved is replaced for the event's new period; any other for its own)
 * and what the venue search and the request form say about the booking being replaced.
 */
export type ReplacementReason = "unavailable" | "overlap" | "moved" | "unsuitable";

const REASONS: readonly ReplacementReason[] = ["unavailable", "overlap", "moved", "unsuitable"];

/** The reason a link carries (`why=`); links made before S3's reasons say nothing, and meant "unavailable". */
export function replacementReasonFrom(value: string | null): ReplacementReason {
  return REASONS.find((reason) => reason === value) ?? "unavailable";
}

/** Follows "<booking> at <venue>, ": why that booking is being replaced. */
export function replacedBecause(reason: ReplacementReason): string {
  switch (reason) {
    case "overlap":
      return "which now overlaps another booking with the venue's new setup and turnaround time";
    case "moved":
      return "which is for the event's old date and time";
    case "unsuitable":
      return "which is too small for the event's expected attendance";
    default:
      return "which is unavailable";
  }
}

/** The period the replacement is searched for: the event's new one for a moved booking, else the booking's. */
export function replacementWindowLabel(reason: ReplacementReason): string {
  return reason === "moved" ? "the event's new period" : "the booking's period";
}
