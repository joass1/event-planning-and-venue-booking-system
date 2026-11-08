# CI retries its tool downloads instead of failing on a GitHub timeout

**Timestamp:** 2026-11-08T20:40+08:00 (SGT)
**Author:** Joash
**Reason:** The required "Secret scan (gitleaks)" check failed on #125 without scanning anything: downloading
gitleaks from GitHub's releases hung for two minutes and then got a 504, and the step had no retry. 3 of the
last 60 CI runs failed, and a failed required check blocks the merge until someone re-runs it.
**Scope:** `.github/workflows/ci.yml`, `deploy.yml`, `gateway.yml`, `load-chaos.yml`. No application code.

## Changed

- Every tool download in the workflows (gitleaks, kubeconform, actionlint, the Chaos Mesh CRDs) retries up
  to five times, including on 5xx answers, with a 15-second connect limit and a 60-second limit per attempt.
  The checksum checks after each download are unchanged.
- The secret-scan job's timeout goes from 5 to 10 minutes, so the retries fit.
