// The waiting-room demo filler's rules, checked against the registration service's own (EN-19).
// Run by `npm run test:scripts` (tsx, so the service's TypeScript can be imported).
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ADMIT_PER_SECOND, DEFAULT_PEOPLE, MAX_PEOPLE, parseArgs, planQueue, slotIntervalMs } from "./fill-waiting-room.mjs";
import * as service from "../../backend/services/registration/src/domain/waitingRoom.ts";

test("DEMO-QUEUE the filler spaces people exactly as the registration service does", () => {
  assert.equal(DEFAULT_ADMIT_PER_SECOND, service.DEFAULT_ADMIT_PER_SECOND);
  for (const rate of [1, 3, 7, 100, 333, 1000]) assert.equal(slotIntervalMs(rate), service.slotIntervalMs(rate), `rate ${rate}`);
});

test("DEMO-QUEUE the next real attendee is placed behind every simulated person", () => {
  const now = new Date("2026-11-08T14:00:00.000Z");
  const interval = slotIntervalMs(100);
  const plan = planQueue(now, now, 6000, interval);
  // A join after the fill takes the gate's next slot, as the service assigns it.
  const joined = service.assignSlot(now, plan.nextSlotAt, interval);
  assert.equal(joined.admitAt.getTime(), now.getTime() + 6000 * interval);
  assert.equal(plan.waitSeconds, 60);
  // A gate already ahead of the clock is respected, not overtaken.
  const later = new Date(now.getTime() + 5000);
  assert.equal(planQueue(now, later, 100, interval).start.getTime(), later.getTime());
});

test("DEMO-QUEUE the arguments: defaults, and refusals for a bad number of people", () => {
  const args = parseArgs(["--env", "staging"]);
  assert.equal(args.event, "Campus Concert Ticket Release");
  assert.equal(args.people, DEFAULT_PEOPLE);
  assert.equal(parseArgs(["--env", "staging", "--people", "1200", "--event", "EVT-000015"]).people, 1200);
  for (const bad of ["0", "-5", "2.5", "abc", String(MAX_PEOPLE + 1)]) {
    assert.throws(() => parseArgs(["--env", "staging", "--people", bad]), /--people must be/, bad);
  }
  assert.throws(() => parseArgs(["--env", "staging", "--event", " "]), /--event needs/);
});
