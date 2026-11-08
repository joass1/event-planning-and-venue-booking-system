# The coordinator can re-arrange a booking an approved change flagged

**Timestamp:** 2026-11-08T21:10+08:00 (SGT)
**Author:** Joash
**Reason:** S3 flags a confirmed booking when an approved change moves the event (Requires Reconfirmation)
or raises attendance above what the booked layout holds (Unsuitable), and F5 refuses to confirm the event
while either flag stands. But the coordinator had no way to clear them. "Find a replacement" (L5) was only
offered for a block (I2) or a buffer change (H3), not for S3's flags, although the server accepted a
replacement for a moved booking; and an Unsuitable booking could not be replaced at all, and nothing ever
cleared the flag, so such an event could only be cancelled. Found while rehearsing the Week 13 demo.
**Scope:** venue module (`repo/bookingRequests.ts`, `repo/eventBookings.ts`, `api/bookingRequests.ts`), the
OpenAPI `EventBooking` schema, the coordinator's Venue requests, the venue search and the request form, and
their tests. No migration.

## Changed

- **A booking flagged Unsuitable can be replaced.** `isReplaceableBooking` accepts a confirmed booking flagged
  Requires Reconfirmation (I2, H3, S3's moved period) or Unsuitable (S3). Approving the replacement releases it
  (M1), which ends its flag, as before. `REPLACEMENT_NOT_VALID`'s message names both flags.
- **The event's bookings say which S3 flag they carry**: `periodMismatch` and `unsuitable` on each booking.
- **"Find a replacement" is offered for both S3 flags**, to the assigned coordinator only. A moved booking is
  searched and requested for the event's new period; an Unsuitable one for its own period, with the event's
  attendance as the minimum capacity. The row says why ("An approved change moved the event to …", "Too small
  for the event's expected attendance of …"), and the search and the form name the reason instead of always
  saying "which is unavailable".

## Tests

- S3-T15, S3-T16 (`tests/S3/`): API cards in `s3Cards.test.ts`, the second ending with F5 confirming the event,
  and screen tests in `frontend/tests/replacements.test.tsx`. Both screen tests fail on the old screens.
- L5's bookings tests expect the two new fields.
