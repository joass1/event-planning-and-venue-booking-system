# The waiting room works on staging and production

**Timestamp:** 2026-11-08T19:49+08:00 (SGT)
**Author:** Joash
**Reason:** EN-19 (#89) built the waiting room for high-demand events, but no deployed environment
had `WAITING_ROOM_SIGNING_KEY`. The VM deploy gate accepts only the settings it lists, and the key
wasn't one of them, so registration ran without it and refused every attendee of a high-demand event
with `503 WAITING_ROOM_UNAVAILABLE` ("The waiting room is not available right now"). Found on staging
while rehearsing the Week 13 demo.
**Scope:** `deploy/azure/connectsphere-vm-deploy`, `.github/workflows/deploy-vm-environment.yml`,
`deploy/azure/deploy-vm.test.mjs`, `documentation/deploy/README.md`. No service code changes.

## Added

- **The deploy gate** accepts one more optional setting, `WAITING_ROOM_SIGNING_KEY`. An environment
  without it deploys as before; a high-demand event there still takes no registrations, as EN-19
  intends, rather than take them unchecked.
- **The release workflow** passes the environment's `WAITING_ROOM_SIGNING_KEY` secret to the gate when
  it is set, and stops with an error naming it when it is shorter than the 32 characters registration
  requires, instead of a container that never becomes ready.
- **A test** (`DEPLOY-T19`, in `deploy/azure/deploy-vm.test.mjs`) that every setting the workflow sends
  is one the gate accepts, and that the signing key is among them. It fails on the gate as it was.
- **Staging and production** each have their own key, 64 hex characters from a random source, stored
  only as the GitHub environment secret. It was never written to disk or printed. A lost key is
  replaced by a new one; the only cost is that admissions already handed out stop working.
- The updated gate was installed on `connectsphere-vm` by hand, as for the OTEL settings on 4 Nov.

## Not changed

- `npm run deploy:vm`, the manual fallback, still writes no signing key (nor the OTEL settings), so a
  manual deploy turns the waiting room off again until the next release.
