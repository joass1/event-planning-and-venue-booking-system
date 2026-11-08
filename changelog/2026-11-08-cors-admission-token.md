# Registering from the waiting room works in the browser

**Timestamp:** 2026-11-08T21:40+08:00 (SGT)
**Author:** Joash
**Reason:** With the waiting room's signing key in place (#124), an attendee of a high-demand event was
admitted but then saw "You were not registered. ConnectSphere couldn't be reached." Registering sends the
admission in the `X-Admission-Token` header, and the registration service's CORS rule did not allow that
header, so the browser refused to send the request. A preflight against staging and production confirmed it.
The tests sent the request from the same origin, where CORS does not apply, so they passed.
**Scope:** `backend/services/registration/src/cors.ts` and its test. No other change.

## Fixed

- The registration service's CORS rule allows `X-Admission-Token`.

## Tests

- EN-19 (`backend/services/registration/tests/cors.unit.test.ts`): a preflight for registering with the
  header is allowed, and every custom header the web app's registration client sends is one CORS allows.
  Both failed before the fix.
