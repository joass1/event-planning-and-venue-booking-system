# A button that puts staging's demo examples back

**Timestamp:** 2026-11-08T22:10+08:00 (SGT)
**Author:** Joash
**Reason:** Rehearsing the Week 13 demo cancels, rejects and moves the seeded examples, and the seed only
creates what is missing, so a cancelled example stayed cancelled. The event history is append-only
(ADR-0007), so the examples can't be deleted and seeded again: they are retired and recreated instead.
**Scope:** `deploy/demo/seed-staging.mjs`, its new test, `.github/workflows/demo-reset.yml`, `README.md`,
`package.json` (`test:scripts`). No application code.

## Added

- **`--reset`** on the staging demo seed. First, every live event of `organiser@` and `organiser2@` is
  cancelled through the API with the reason "Demo reset: …". That releases its bookings, holds and
  equipment, and keeps its history. Next, every active block at the demo venues is removed. Then each
  example is created again at its stage.
- **The "Reset staging demo data" workflow** runs that from the Actions tab: Run workflow, then type
  `RESET`. It uses the staging environment's own secrets (`--from-environment`), and the script still
  refuses any project or host but staging's.

## Fixed

- An existing event stands for its example only while it is in progress, or if it ended the way the
  example does (Charity Run cancelled for its own reason, Open Mic rejected). An example cancelled in a
  rehearsal is now created again, rather than left cancelled for good.
- The high-demand flag sends the event's version (`If-Match`), as the route requires. Before, the request
  was refused with 428 and the refusal was ignored, so the concert was never flagged high-demand.

## Tests

- `deploy/demo/seed-staging.test.mjs` (DEMO-RESET): the reuse rule, and the staging guard reading from
  the environment.
