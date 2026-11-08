# A button that shows the waiting room's queue with one attendee

**Timestamp:** 2026-11-08T22:50+08:00 (SGT)
**Author:** Joash
**Reason:** At 100 admissions a second per event, a lone demo attendee is admitted at once, so the queue
(position, wait, admission) could not be shown in the Week 13 demo.
**Scope:** `deploy/demo/fill-waiting-room.mjs` and its test, `.github/workflows/demo-fill-waiting-room.yml`,
`deploy/demo/seed-staging.mjs` (the env file is the default when none is given), `package.json`
(`demo:queue`, `test:scripts`), `README.md`. No application code.

## Added

- **`npm run demo:queue -- --env staging`** puts simulated people in a high-demand event's waiting room
  ahead of whoever joins next (6000 by default, about a minute at 100 a second). Each takes the next slot at
  the event's gate, as a join does, so the next real attendee sees a real position and wait. They are then
  admitted and registered at their slot. Simulated people never register, so they take no seat. The
  script uses the staging guard, and refuses an event that is not open or not high-demand.
- **The "Fill the waiting room" workflow** runs it from the Actions tab, with the event and the number of
  people as inputs.

## Tests

- `deploy/demo/fill-waiting-room.test.mjs` (DEMO-QUEUE): the gap between places matches the registration
  service's `slotIntervalMs` at several rates, a join after the fill is placed behind every simulated
  person (the service's `assignSlot`), and bad arguments are refused.
