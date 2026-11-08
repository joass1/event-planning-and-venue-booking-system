# S3-T16 — A booking too small for the new attendance is replaced, and the event can then be confirmed

## Specification

| Item | Content |
|---|---|
| Test Case ID | S3-T16 |
| Test Scenario | After an attendance change makes B1 (Theatre, 100) Unsuitable for 150, the assigned coordinator replaces it with a request at a Theatre for 200 for the same period; when Venue Staff approve it, B1 is released, no flag remains and F5 confirms the event |
| Pre-conditions | 1. Clean throwaway Postgres with every migration applied, using the isolated setup in `tests/S3/README.md`. Authentication is stubbed: the signed-in user is whichever actor a step names.<br>2. Fixture FX-S3 from `tests/S3/README.md` is loaded. CR proposes `expectedAttendance` 150, nothing else. FX-S3's venues record no operating hours, so K2 finds each request Not suitable and asks for a justification, which the request gives.<br>3. Specific set-up: a third venue V3 `Venue Three` (layout Theatre, capacity 200, looked after by VS). |
| Test Steps | 1. As C, send `POST /api/v1/change-requests/<CR>/decision` with `{"decision":"APPROVE"}`.<br>2. As C, send `POST /api/v1/booking-requests` for V3, `D 14:00`–`D 18:00`, layout Theatre, attendance 150, `replacesBookingId` B1, with a justification.<br>3. As VS, approve that request.<br>4. Read B1.<br>5. As C, send `GET /api/v1/events/<E>/arrangement-flags`.<br>6. As C, send `POST /api/v1/events/<E>/confirmation`.<br>7. In the app, as C and then as O, open the event's Venue requests.<br>8. Run the same two test commands as S3-T15, with `-t 'S3-T16 '`. |
| Test Data | `{"decision":"APPROVE"}`; CR proposes `expectedAttendance` 150; V3 Theatre for 200. |
| Expected Result | Step 1 answers 200 and B1 is CONFIRMED and Unsuitable, not Requires Reconfirmation. Step 2 answers 201 with `replacesBookingId` B1 (before this change it was refused 422 `REPLACEMENT_NOT_VALID`). Step 3 answers 200 and in step 4 B1 is RELEASED. Step 5 lists no flags. Step 6 answers 200 and the event is in Safety Review. In step 7, C sees B1 marked Unsuitable, "Too small for the event's expected attendance of 150", with "Find a replacement", which searches B1's own period with a minimum capacity of 150; O sees the same row with no button. |
| Created By | Joash |
| Date of Creation | 2026-11-08 |

> **Expected results are checked by the PR reviewer** against S3's acceptance criteria.

## Execution record

| Item | Content |
|---|---|
| Actual Result | — |
| Status | Not Executed |
| Remarks | Automated (API and screen level). Runs in CI on the pull request that adds it; this record is filled in from that run. Evidence: `backend/services/planning-core/tests/change/api/s3Cards.test.ts` › S3 cards: reconsidering the arrangements an approved change affects › S3-T16 a booking too small for the new attendance is replaced; once Venue Staff approve, nothing is flagged and F5 confirms; `frontend/tests/replacements.test.tsx` › bookings an approved change flagged (S3-T15, S3-T16) › offers Find a replacement for a booking too small for the new attendance, for its own period, and only to the assigned coordinator · Defect: — |
| Executed By | — |
| Date of Execution | — |
