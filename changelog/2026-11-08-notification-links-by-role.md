# Opening a notification goes to a page the reader's role can use

**Timestamp:** 2026-11-08T20:13+08:00 (SGT)
**Author:** Joash
**Reason:** On staging, Venue Staff who opened a notification were told "Event EVT-… has no page for
your role." Technical Support and attendees were told the same. T2 AC8 says opening a notification
goes to the related event. Only four roles had an event page, so the other three had nowhere to go.
**Scope:** web app only: `frontend/src/api/notifications.ts`, `frontend/src/screens/Notifications.tsx`,
`frontend/tests/notifications.test.tsx`, test card T2-T21, T2's traceability rows. No service changes.

## Changed

- **"Open" chooses the page from the reader's role and the notice** (`notificationPathFor`, which replaces
  `eventPathFor`). Each page is one the role's policies allow, so the route guard never turns the
  reader away:
  - Event Organiser: the request (`/requests/:id`), as before.
  - Event Coordinator: the event's venue requests for a venue booking, hold or request notice; the
    event's equipment request for an equipment notice; the review page for anything else, as before.
    An equipment line marked Unavailable can now be read from the notice that reports it.
  - Event Coordinator Lead and Safety Officer: the assignment and safety review pages, as before.
  - Venue Staff: Hold requests when the notice is about holds only, otherwise Booking requests.
  - Technical Support: Equipment requests.
  - Attendee: the event, to register, when a waitlist place opens; otherwise My registrations.
- **The "has no page for your role" notice is gone**, because every role now has a page to open. An
  event page still asks the server, so a reader who has lost access sees the refusal and no event
  data (AC8, T2-T16).

## Not changed

- The list pages don't filter or scroll to the notice's event. Hold requests, Booking requests and
  Equipment requests open showing everything waiting.
- Venue Staff still start on the API console after signing in (`landingFor` in `App.tsx`).
