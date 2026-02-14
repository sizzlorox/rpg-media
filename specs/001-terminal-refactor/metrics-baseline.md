# Terminal Refactoring Metrics Baseline

**Purpose**: Track quantitative improvements from refactoring against success criteria
**Created**: 2026-02-14
**Branch**: 001-terminal-refactor
**Baseline Date**: 2026-02-14 (pre-refactor)

---

## Code Quality Metrics (Baseline)

### Lines of Code (LOC)
**Success Criterion**: SC-007 - Reduce LOC by ≥20%

| File | Baseline LOC | Target LOC (≤80%) | Post-Refactor | Delta | Status |
|------|--------------|-------------------|---------------|-------|--------|
| `Terminal.tsx` | 560 | ≤448 | TBD | TBD | ⏳ Pending |
| `terminal-responsive.ts` | 60 | ≤48 | TBD | TBD | ⏳ Pending |
| `useHomeLogic.ts` | 458 | ≤366 | TBD | TBD | ⏳ Pending |
| **Total** | **1,078** | **≤862** | **TBD** | **TBD** | ⏳ Pending |

### Cyclomatic Complexity
**Success Criterion**: SC-001 - Reduce complexity by ≥30%

| File | Baseline Complexity | Target (≤70%) | Post-Refactor | Delta | Status |
|------|---------------------|---------------|---------------|-------|--------|
| `Terminal.tsx` | ~96 points | ≤67 | TBD | TBD | ⏳ Pending |
| `terminal-responsive.ts` | Low (config file) | Low | TBD | TBD | ⏳ Pending |
| `useHomeLogic.ts` | ~85 points (est.) | ≤60 | TBD | TBD | ⏳ Pending |

**Measurement Method**: Count control flow statements (if, for, while, case, catch, &&, ||, ternary operators, function declarations)

---

## Developer Experience Metrics (Baseline)

### Onboarding Time
**Success Criterion**: SC-002 - New developers understand terminal code in ≤30 minutes

| Metric | Baseline | Target | Post-Refactor | Status |
|--------|----------|--------|---------------|--------|
| Time to understand architecture | **Unknown** (no quickstart.md) | ≤30 min | TBD | ⏳ Pending |
| Time to locate feature code | **Unknown** (manual tracking) | ≤5 min (FR-006) | TBD | ⏳ Pending |

**Measurement Method**: Survey new developer unfamiliar with codebase, provide timer, track understanding milestones

### Feature Implementation Time
**Success Criterion**: SC-003 - Implement new terminal command in <2 hours

| Metric | Baseline | Target | Post-Refactor | Status |
|--------|----------|--------|---------------|--------|
| Add new command (e.g., `/whoami`) | **Unknown** (manual test needed) | <2 hours | TBD | ⏳ Pending |

**Measurement Method**: Time-trial with developer unfamiliar with terminal code, task: "Add a `/whoami` command that displays username and level"

---

## Code Review Metrics (Baseline)

### Review Time
**Success Criterion**: SC-006 - Reduce code review time by ≥40%

| Metric | Baseline | Target (≤60%) | Post-Refactor | Status |
|--------|----------|---------------|---------------|--------|
| Average review time (terminal PRs) | **Unknown** (manual tracking) | ≤60% of baseline | TBD | ⏳ Pending |
| Average review cycles | **Unknown** (manual tracking) | Fewer iterations | TBD | ⏳ Pending |

**Measurement Method**: Track review time from PR creation to approval for terminal-related changes over 30-day period

**Historical Data** (if available):
- No historical data available for pre-refactor baseline
- **ACTION REQUIRED**: Manually track next 3-5 terminal PRs to establish baseline

---

## Bug/Reliability Metrics (Baseline)

### Bug Count
**Success Criterion**: SC-004 - Reduce terminal bugs by ≥50% in 60 days

| Metric | Baseline (60 days before) | Target (60 days after) | Post-Refactor | Status |
|--------|---------------------------|------------------------|---------------|--------|
| Terminal-related GitHub issues | **0 issues** (current) | 0 issues | TBD | ⏳ Pending |
| Terminal crashes/errors | **Unknown** (manual tracking) | ≤50% of baseline | TBD | ⏳ Pending |

**Measurement Method**: Track GitHub issues tagged "terminal" over 60-day periods before/after deployment

**Baseline Period**: 2025-12-16 to 2026-02-14 (60 days pre-refactor)
**Comparison Period**: Deployment date + 60 days

**Historical Bug Data**:
- No terminal-specific issues currently tracked in GitHub
- **ACTION REQUIRED**: Establish bug tracking for terminal component (tag existing issues with "terminal" label)

### User Regressions
**Success Criterion**: SC-008 - Zero user-reported regressions in 30 days

| Metric | Baseline | Target | Post-Refactor | Status |
|--------|----------|--------|---------------|--------|
| User-reported terminal issues | **Unknown** (manual tracking) | 0 regressions | TBD | ⏳ Pending |

**Measurement Method**: Monitor user feedback, production error logs, support tickets for terminal-related issues

**Baseline Period**: 2026-01-15 to 2026-02-14 (30 days pre-refactor)
**Comparison Period**: Deployment date + 30 days

---

## Logging & Observability Metrics (Baseline)

### Structured Logging Coverage
**Success Criterion**: SC-009 - All terminal errors captured in structured logs

| Metric | Baseline | Target | Post-Refactor | Status |
|--------|----------|--------|---------------|--------|
| Terminal errors logged | **Unknown** (no structured logging) | 100% | TBD | ⏳ Pending |
| Log event types defined | **0** (no Logger interface) | ≥5 types (init, command, buffer, error, perf) | TBD | ⏳ Pending |

**Measurement Method**: Review browser console logs during testing, validate all error paths produce structured JSON logs

---

## Accessibility Metrics (Baseline)

### Keyboard Navigation
**Success Criterion**: SC-010 - All terminal features operable via keyboard only

| Metric | Baseline | Target | Post-Refactor | Status |
|--------|----------|--------|---------------|--------|
| Keyboard-only operability | **Partial** (commands work, focus indicators unclear) | 100% | TBD | ⏳ Pending |
| ARIA labels present | **No** (no accessibility attributes) | Yes (role, aria-label, aria-live) | TBD | ⏳ Pending |
| Screen reader compatibility | **Unknown** (manual test needed) | Verified | TBD | ⏳ Pending |

**Measurement Method**: Manual accessibility audit using keyboard-only navigation and screen reader (VoiceOver/NVDA)

---

## Summary

**Total Success Criteria**: 10 (SC-001 through SC-010)
**Baseline Status**: 2/10 criteria have quantitative baselines
**Data Gaps**: 8 criteria require manual tracking or testing to establish baselines

**Required Actions Before Post-Refactor Comparison**:
1. ✅ Capture LOC and complexity metrics (completed)
2. ⏳ Track 3-5 terminal PRs to measure review time baseline
3. ⏳ Tag historical terminal bugs in GitHub issues
4. ⏳ Conduct developer onboarding time trial (baseline)
5. ⏳ Conduct feature implementation time trial (baseline)
6. ⏳ Document current accessibility state

**Update Schedule**:
- **Post-Phase 3 (MVP)**: Update LOC and complexity metrics
- **Post-Deployment**: Track bug count, review time, user regressions over 30-60 days
- **Final Report**: Generate comparison report after all metrics collected
