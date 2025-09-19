# Definition of Done

A change is "Done" only if:
- Acceptance criteria are met and proven by tests or runnable example.
- Lint/format/type checks pass.
- Unit coverage ≥ 80% on new/changed lines; critical paths covered.
- One integration path proves the main workflow.
- Performance within budget (P95 latency/memory) or measured and justified.
- Security: inputs validated; no secrets logged; no new HIGH/CRITICAL vulns.
- Observability: structured logs, basic metrics, trace notes.
- Docs updated (README/CHANGELOG/ADR if applicable).
- Feature flags and rollback documented if risky.
