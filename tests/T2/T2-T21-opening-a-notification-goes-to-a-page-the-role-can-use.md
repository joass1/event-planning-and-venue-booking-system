# T2-T21 — Opening a notification goes to a page the reader's role can open, about what it says

## Specification

| Item | Content |
|---|---|
| Test Case ID | T2-T21 |
| Test Scenario | Opening a notification goes to a page the reader's role can open, about what it says |
| Pre-conditions | 1. The web app's unit test environment (`frontend/`, jsdom). Each role's permissions are answered from the same `policies/` the server's Cerbos PDP loads (`frontend/tests/setup.ts`), so the route guard behaves as it does in the browser.<br>2. The notification API is stubbed to return one unread notification of the type a step names, about event E. Every other API call is left unanswered, so each page stays as it opens. |
| Test Steps | 1. For each row of the expected result, sign in as that role, open "Notifications" and click "Open" on the notification.<br>2. Wait a moment, then read the address.<br>3. Run `npm test -w @connectsphere/web -- tests/notifications.test.tsx -t "T2-T21"` and read the eight named `T2-T21` results. |
| Test Data | Notification types and texts as the notification service writes them (`backend/services/notification/src/domain/recipients.ts`), e.g. "Hold HLD-000002 at Hall for EVT-000001 needs attention after an approved change." for Venue Staff. |
| Expected Result | Event Organiser: `/requests/E` for every notice. Event Coordinator: `/events/E/venue-requests` for a `venue-booking.*` notice, `/events/E/equipment` for an `equipment-request.*` notice, `/review/E` for any other. Event Coordinator Lead: `/assignments/E`. Safety Officer: `/safety/E`. Venue Staff: `/holds` when the notice names holds and nothing else, `/booking-requests` otherwise. Technical Support: `/equipment/requests`. Attendee: `/open-events/E` for "a place has opened", `/my-registrations` for anything else. A notice type the app does not know opens the same page as the role's other notices. In every case the address stays on that page: the route guard does not send the role to its start page. "has no page for your role" is never shown, and the notification is marked read. |
| Created By | Joash |
| Date of Creation | 2026-11-08 |

## Execution record

| Item | Content |
|---|---|
| Actual Result | Every row went to the page above and stayed there; the policies allowed each role its page, so the route guard did not redirect. A Venue Staff notice naming only HLD-000002 opened Hold requests; one naming a hold and a booking request opened Booking requests. Unknown types opened each role's usual page. All 13 tests in `frontend/tests/notifications.test.tsx` passed, as did the whole web app suite (625 tests). |
| Status | Pass |
| Remarks | Automated (unit, web app) · Evidence: frontend/tests/notifications.test.tsx › notificationPathFor and › opening a notice as each role (eight `T2-T21` tests) · Defect: Venue Staff, Technical Support and attendees were told "Event … has no page for your role." (found on staging, 8 Nov 2026) |
| Executed By | Joash, via automated testing (local run) |
| Date of Execution | 2026-11-08 |
