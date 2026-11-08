# S3-T15 — A booking an approved change moved is replaced for the new period, and its flag ends with it

## Specification

| Item | Content |
|---|---|
| Test Case ID | S3-T15 |
| Test Scenario | After a date change is approved, the assigned coordinator replaces booking B1 (flagged Requires Reconfirmation for the old period) with a request for the event's new period; when Venue Staff approve it, B1 is released and its flag no longer counts, while B2, not replaced, stays flagged |
| Pre-conditions | 1. Clean throwaway Postgres with every migration applied, using the isolated setup in `tests/S3/README.md`. Authentication is stubbed: the signed-in user is whichever actor a step names.<br>2. Fixture FX-S3 from `tests/S3/README.md` is loaded. CR proposes `proposedStartAt` `D 15:00`, nothing else. FX-S3's venues record no operating hours, so K2 finds each request Not suitable and asks for a justification, which the request gives. |
| Test Steps | 1. As C, send `POST /api/v1/change-requests/<CR>/decision` with `{"decision":"APPROVE"}`.<br>2. As C, send `POST /api/v1/booking-requests` for V1, `D 15:00`–`D 18:00`, layout Theatre, attendance 80, `replacesBookingId` B1, with a justification.<br>3. As VS, send `POST /api/v1/booking-requests/<request>/approve`.<br>4. Read B1 and the new booking.<br>5. As C, send `GET /api/v1/events/<E>/arrangement-flags`.<br>6. In the app, as C, open the event's Venue requests: the moved booking's row offers "Find a replacement"; follow it to the search and the request form.<br>7. Run `npm test -w @connectsphere/planning-core -- tests/change/api/s3Cards.test.ts -t 'S3-T15 '` and `npx vitest run tests/replacements.test.tsx` in `frontend`. |
| Test Data | `{"decision":"APPROVE"}`; CR proposes `proposedStartAt` `D 15:00`; the replacement is for `D 15:00`–`D 18:00` at V1. |
| Expected Result | Step 1 answers 200 and B1 is CONFIRMED with its period flag set. Step 2 answers 201, Pending, with `replacesBookingId` B1, and B1 is still CONFIRMED. Step 3 answers 200. In step 4 B1 is RELEASED and the new booking is CONFIRMED for `D 15:00`–`D 18:00` with no flag. Step 5 lists no flag on B1 or the new booking, and still lists B2 Requires Reconfirmation. In step 6 the row says "An approved change moved the event to …", the search and the form say the booking is "for the event's old date and time", and both start from the event's new period. |
| Created By | Joash |
| Date of Creation | 2026-11-08 |

> **Expected results are checked by the PR reviewer** against S3's acceptance criteria.

## Execution record

| Item | Content |
|---|---|
| Actual Result | — |
| Status | Not Executed |
| Remarks | Automated (API and screen level). Runs in CI on the pull request that adds it; this record is filled in from that run. Evidence: `backend/services/planning-core/tests/change/api/s3Cards.test.ts` › S3 cards: reconsidering the arrangements an approved change affects › S3-T15 a booking the change moved is replaced for the new period; approving the replacement releases it and its flag; `frontend/tests/replacements.test.tsx` › bookings an approved change flagged (S3-T15, S3-T16) › offers Find a replacement for a booking the change moved, searched and requested for the event's new period · Defect: — |
| Executed By | — |
| Date of Execution | — |
