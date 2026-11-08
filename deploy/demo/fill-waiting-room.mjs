#!/usr/bin/env node
/**
 * EN-19 demo, staging only: puts simulated people in a high-demand event's waiting room, ahead of
 * whoever joins next, so the queue can be shown with one real attendee.
 *
 *   npm run demo:queue -- --env staging
 *   npm run demo:queue -- --env staging --event "Campus Concert Ticket Release" --people 6000
 *
 * Each simulated person takes the next slot at the event's gate, as a join does: one interval apart
 * at WAITING_ROOM_ADMIT_PER_SECOND (100 a second unless set). The next real attendee is shown a
 * position behind them and is admitted when the clock reaches their slot. Simulated people never
 * register, so they take no seat, and their places simply pass. It writes
 * registration.waiting_room_gates and registration.waiting_room_entries only, and uses the staging
 * guard of seed-staging.mjs (any other project or host is refused). The "Fill the waiting room"
 * workflow runs it from the Actions tab with --from-environment.
 */
import { pathToFileURL } from "node:url";
import postgres from "postgres";
import { loadStagingConfig, Refused } from "./seed-staging.mjs";

export const DEFAULT_EVENT = "Campus Concert Ticket Release";
/** About a minute of queue at 100 a second: time to finish the workflow and join. */
export const DEFAULT_PEOPLE = 6000;
export const MAX_PEOPLE = 30000;
/** The registration service's own default (backend/services/registration/src/domain/waitingRoom.ts). */
export const DEFAULT_ADMIT_PER_SECOND = 100;

export function parseArgs(argv) {
  const args = { env: null, event: DEFAULT_EVENT, people: DEFAULT_PEOPLE, fromEnvironment: false, envFile: undefined };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--env") args.env = argv[++i];
    else if (argv[i] === "--event") args.event = String(argv[++i] ?? "").trim();
    else if (argv[i] === "--people") args.people = Number(argv[++i]);
    else if (argv[i] === "--from-environment") args.fromEnvironment = true;
    else if (argv[i] === "--env-file") args.envFile = argv[++i];
    else throw new Refused(`Unknown argument ${argv[i]}`);
  }
  if (!args.event) throw new Refused("--event needs an event's name or reference.");
  if (!Number.isInteger(args.people) || args.people < 1 || args.people > MAX_PEOPLE) {
    throw new Refused(`--people must be a whole number from 1 to ${MAX_PEOPLE}.`);
  }
  return args;
}

/** The gap between two admissions, as the service works it out: 1/N of a second, rounded up to a millisecond. */
export function slotIntervalMs(admitPerSecond) {
  return Math.ceil(1000 / admitPerSecond);
}

/** The places the simulated people take at the gate, and where the gate is left for the next real joiner. */
export function planQueue(now, gateNextSlotAt, people, intervalMs) {
  const start = new Date(Math.max(now.getTime(), gateNextSlotAt.getTime()));
  const nextSlotAt = new Date(start.getTime() + people * intervalMs);
  return { start, nextSlotAt, waitSeconds: Math.ceil((nextSlotAt.getTime() - now.getTime()) / 1000) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = loadStagingConfig(args);
  const rate = Number(process.env.WAITING_ROOM_ADMIT_PER_SECOND) || DEFAULT_ADMIT_PER_SECOND;
  const intervalMs = slotIntervalMs(rate);
  const sql = postgres(config.databaseUrl, { max: 1, prepare: false, onnotice: () => undefined });
  try {
    const [event] = await sql`
      select event_id, event_reference, name, high_demand
      from registration.event_listings
      where (event_reference = ${args.event} or name = ${args.event})
        and status = 'CONFIRMED' and registration_required and registration_closes_at >= now()
      order by starts_at
      limit 1`;
    if (!event) throw new Refused(`No event open for registration is called "${args.event}".`);
    if (!event.high_demand) {
      throw new Refused(`${event.event_reference} is not high-demand: turn it on in the event's Registration settings first.`);
    }
    const plan = await sql.begin(async (tx) => {
      // The same lock order as a join: create the gate if it is new, then lock it.
      await tx`insert into registration.waiting_room_gates (event_id, next_slot_at) values (${event.event_id}, now()) on conflict (event_id) do nothing`;
      const [gate] = await tx`select next_slot_at, now() as now from registration.waiting_room_gates where event_id = ${event.event_id} for update`;
      const planned = planQueue(gate.now, gate.next_slot_at, args.people, intervalMs);
      await tx`
        insert into registration.waiting_room_entries (event_id, attendee_id, joined_at, admit_at, created_by, updated_by)
        select ${event.event_id}, s.person, ${gate.now}, ${planned.start}::timestamptz + make_interval(secs => s.i * ${intervalMs} / 1000.0), s.person, s.person
        from (select g.i, gen_random_uuid() as person from generate_series(0, ${args.people - 1}) as g(i)) as s`;
      await tx`update registration.waiting_room_gates set next_slot_at = ${planned.nextSlotAt}, updated_at = now() where event_id = ${event.event_id}`;
      return planned;
    });
    console.log(
      `Added ${args.people} simulated people to the waiting room of ${event.event_reference} "${event.name}", admitted ${rate} a second.` +
        ` Whoever joins next waits about ${plan.waitSeconds} seconds: join now as attendee@.`,
    );
  } finally {
    await sql.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(`${error instanceof Refused ? "REFUSED" : "FAILED"}: ${error.message}`);
    process.exit(error instanceof Refused ? 2 : 1);
  });
}
