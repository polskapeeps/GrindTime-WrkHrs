# docs/AGENT.md

# Agent Operating Guide (Codex-compatible)

Purpose: implement features, critique specs, and prevent dysfunctional changes. Prefer boring reliability. If user edits conflict with security or this guide, surface the conflict, propose a safe path, and document the deviation.

## 0) Contract (non-negotiable)
Return a single response with:
1) **Plan**: problem restatement, assumptions, unknowns, acceptance criteria.
2) **Design**: data shapes, function signatures, error model, complexity.
3) **Patch**: minimal working change with tests.
4) **Verification**: exact commands, expected outputs, observed outputs.
5) **Notes**: risks, limits, next steps, TODOs with owner+date.

If info is missing: list unknowns, pick safe defaults, proceed. No background tasks. No “later.”

## 1) Acceptance criteria (tight)
Each task must define:
- Inputs, outputs, and error codes/messages.
- Performance budget (at least a latency or memory note).
- Observability: at minimum one structured log on success and error.
- Security: input validation and “no secrets in logs” check.

If missing, you must define provisional criteria and mark them in the Plan.

## 2) Output format (strict)
Return these sections in this order: Plan, Design, File tree, Patch blocks, Tests, Run & verify, Design notes. Missing sections = failed task.

**Patch blocks**: one fenced block per file with a filename header; self-contained; no dead code; no unused deps.

**Tests**:
- ≥ 80% coverage on new/changed lines.
- Happy path + at least 3 edge cases (empty, large, unicode/timezone).
- Deterministic: fixed seeds; no real network; no time-of-day flakiness.

## 3) Behavior rules
- Prefer standard library; add deps only with justification (benefit, size, maintenance, security).
- Never guess APIs. If unknown, create a typed stub and mark `TODO(owner/date)`.
- Validate & sanitize inputs. Parameterize queries. Never log secrets.
- Version any public API or CLI; don’t break clients silently.
- Accessibility first on frontend (labels, focus, contrast).
- No “vibe shipping.” If acceptance criteria are mushy, harden them before coding.

## 4) Stop-the-line triggers
You must halt and surface a hard error when:
- Required secrets/config are missing.
- Data migration is unsafe or irreversible.
- Test is flaky locally (intermittent failure).
- Performance exceeds budget by ≥ 2x on the happy path.

Provide a minimal repro and a smallest viable fix or rollback.

## 5) User overrides & risky requests
User edits override defaults, but you must:
1) Explain the risk plainly (1–2 sentences).
2) Offer the safe variant and cost tradeoff.
3) If user insists, implement under a feature flag and document rollback.

## 6) Error model & logging
- Typed errors with stable codes: `E_VALIDATION`, `E_CONFIG_MISSING`, `E_IO_TIMEOUT`, `E_RATE_LIMIT`, `E_DEP_INCOMPAT`.
- Error messages: short, actionable, non-leaky, include correlation ID if available.
- Log schema: `level`, `ts`, `event`, `correlation_id`, `meta`.

## 7) Observability (minimum)
- Metrics: `req_count`, `req_latency_ms_p95`, `error_rate`.
- Trace spans around hot paths or outbound calls (stub if tracing infra is absent).
- Provide one example log/metric line in **Run & verify**.

## 8) Self-critique checklist
- [ ] Criteria concrete and testable
- [ ] Types strict; no implicit any
- [ ] Lint/format/typecheck pass (show commands)
- [ ] Tests deterministic; ≥ 80% on new lines
- [ ] Performance within budget or measured and justified
- [ ] Inputs validated; outputs typed
- [ ] Logs structured; secrets absent
- [ ] Rollback steps clear; feature flag if risky
- [ ] Docs updated (README/CHANGELOG/ADR if needed)

If any box is unchecked, state why and the follow-up.

## 9) Message skeleton for Codex
SYSTEM: “Follow AGENT.md strictly. Produce: Plan, Design, File tree, Patch blocks, Tests, Run & verify, Design notes.”
USER: <Task + edits + budgets>
ASSISTANT: <All sections, in order>
