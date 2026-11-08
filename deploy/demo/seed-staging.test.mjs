// The staging demo seed's rules that need no network: which existing events stand for their example,
// and the guard that refuses anything but staging. Run by `npm run test:scripts`. Fake values only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadStagingConfig, RESET_REASON, Refused, reusable } from "./seed-staging.mjs";

const REF = "ersukefviuuygauatwox";
const env = (overrides = {}) => ({
  DATABASE_URL: `postgresql://postgres.${REF}:fake-password@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  SUPABASE_URL: `https://${REF}.supabase.co`,
  SUPABASE_ANON_KEY: "fake-anon",
  SUPABASE_SERVICE_ROLE_KEY: "fake-service",
  ...overrides,
});
const fromEnvironment = { env: "staging", fromEnvironment: true };

test("DEMO-RESET an event still in progress stands for its example; one that ended another way does not", () => {
  const confirmed = { stage: "CONFIRMED" };
  assert.equal(reusable({ status: "PLANNING" }, confirmed), true);
  assert.equal(reusable({ status: "CANCELLED", cancellationReason: "rehearsal" }, confirmed), false);
  assert.equal(reusable({ status: "CANCELLED", cancellationReason: RESET_REASON }, confirmed), false);
  assert.equal(reusable({ status: "REJECTED" }, confirmed), false);
  assert.equal(reusable({ status: "COMPLETED" }, confirmed), false);
});

test("DEMO-RESET an example meant to end cancelled or rejected is kept when it ended that way, for its own reason", () => {
  const cancelled = { stage: "CANCELLED", cancellation: "The run was postponed to next semester by the sponsor." };
  assert.equal(reusable({ status: "CANCELLED", cancellationReason: cancelled.cancellation }, cancelled), true);
  assert.equal(reusable({ status: "CANCELLED", cancellationReason: RESET_REASON }, cancelled), false);
  assert.equal(reusable({ status: "REJECTED" }, { stage: "REJECTED" }), true);
  // An event that is not an example is never reused once it has ended.
  assert.equal(reusable({ status: "CANCELLED", cancellationReason: RESET_REASON }, undefined), false);
});

test("DEMO-RESET --from-environment reads staging's settings, with the password already in the URL", () => {
  const config = loadStagingConfig(fromEnvironment, env());
  assert.equal(config.supabaseUrl, `https://${REF}.supabase.co`);
  assert.equal(config.databaseUrl, env().DATABASE_URL);
});

test("DEMO-RESET the guard refuses another project, a missing setting, and anything but --env staging", () => {
  assert.throws(() => loadStagingConfig(fromEnvironment, env({ SUPABASE_URL: "https://hjgswgntfwshpyoiswns.supabase.co" })), Refused);
  assert.throws(
    () => loadStagingConfig(fromEnvironment, env({ DATABASE_URL: "postgresql://postgres.hjgswgntfwshpyoiswns:x@host:6543/postgres" })),
    Refused,
  );
  assert.throws(() => loadStagingConfig(fromEnvironment, env({ SUPABASE_SERVICE_ROLE_KEY: "" })), /SUPABASE_SERVICE_ROLE_KEY is missing/);
  assert.throws(
    () => loadStagingConfig(fromEnvironment, env({ DATABASE_URL: `postgresql://postgres.${REF}:[YOUR-PASSWORD]@host:6543/postgres` })),
    /DB_PASSWORD is missing/,
  );
  assert.throws(() => loadStagingConfig({ env: "production", fromEnvironment: true }, env()), Refused);
});
