# Security Policy

## Reporting a vulnerability
Please email security@example.com. We aim to triage within 72 hours.

## Minimum controls
- Secrets via environment only; never committed.
- Input validation on all external boundaries.
- Dependency audit on CI; block HIGH/CRITICAL.
- Optional SBOM generation when adding new deps.

## Hard rules
- No plaintext secrets in logs, crashes, or analytics.
- No production data in tests or local fixtures.
