# AT Disruption Hub — Implementation Plan

## Goal

Deliver a polished functional prototype demonstrating the core Integrated Disruption Management Hub workflow for Auckland Transport.

Primary success condition:

A presenter can complete the full Route 70 scenario reliably during a five-minute demonstration.

---

## Repository Assessment — Phase 0 findings (06 Oct 2026)

Inspected: repo root, `AGENTS.md`, `PLAN.md`, `docs/`, `design/`,
filesystem search for `*.json / *.js / *.ts / *.html`.

| Question | Finding |
|---|---|
| Application stack | **None.** No `package.json`, no source files, no framework. Greenfield. |
| Routing solution | None exists. Proposed: React Router (decision gate below). |
| Styling / component system | None exists. 8 approved PNG screens + UI kit in `design/` are the visual source of truth. Proposed: hand-written CSS with `tokens.css` derived from the UI kit; no component framework. |
| State management | None exists. Proposed: React context + reducer, single shared incident store. |
| SAP / API lab code | **None.** No examples, no service name, no endpoint. Phase 7 is adapter-boundary + labelled demo fallback until a confirmed course API is supplied. |
| Build / lint / test commands | **None** (nothing to run — greenfield). Record `none — greenfield` in summaries until scaffolding lands. |
| Figma-generated code | No — PNG screens only (Desktop 1440). |
| Existing docs | `AGENTS.md`, `PLAN.md`, `docs/PRODUCT_REQUIREMENTS.md`, `docs/DEMO_SCENARIO.md` (this task refreshes all four). |

**Consequence:** "Do not replace the current technology stack" is
vacuous — there is no stack to replace. The proposed stack below is
chosen to be the smallest thing that satisfies the spec (single SPA,
no backend, no new services). No dependencies have been installed and
no application code has been written in this task, per instructions.

### Proposed stack (approval gate — confirm before Phase 1)

- Vite + React + TypeScript SPA (client-side only, no backend).
- React Router for role-scoped routes + deep-linkable incident workspace.
- React context + reducer for the single shared incident record
  (`localStorage` persistence only as a demo convenience, with reset).
- Hand-written CSS from UI-kit tokens (`tokens.css`); no UI framework.
- `src/services/` adapter boundary for any future SAP call; demo seed
  data behind an explicitly labelled fallback.

### Approval gates (do not pass without explicit user approval)

1. **Stack gate:** approve the proposed stack above (or direct an
   alternative) → then scaffold (Phase 1 may begin).
2. **SAP gate:** no SAP work beyond the adapter boundary + fallback
   until a confirmed course API pool service name is supplied.
3. **Scope gate:** anything in AGENTS.md "Scope Control" needs an
   explicit user request first.

---

# Phase 0 — Repository Assessment

Status: DONE (06 Oct 2026 — this task; findings table above)

Tasks:
- [x] Inspect current application stack.
- [x] Identify routing solution.
- [x] Identify styling/component system.
- [x] Identify state-management approach.
- [x] Identify available SAP/API lab code.
- [x] Identify current build/lint/test commands.
- [x] Confirm whether Figma-generated code already exists.
- [x] Document assumptions and technical constraints.

Acceptance Criteria:
- Current architecture is understood. ✅ (greenfield — nothing to preserve)
- No unnecessary framework replacement is proposed. ✅ (nothing existed)
- Build command succeeds before major implementation begins. ⏳ (no build
  exists yet — first build check moves to end of Phase 1 scaffolding)

---

# Phase 1 — Scaffold + Shared Domain Model + Demo State

Status: DONE (06 Oct 2026)

Implemented (Vite + React + TS + React Router, hand CSS from UI-kit tokens):
- [x] Scaffold per approved stack; `src/styles/tokens.css` seeded from the
      UI kit (navy/teal/severity tokens, KPI/badges/table/timeline styles).
- [x] Role type CONTRACTOR | OPERATIONS | CUSTOMER_INFORMATION (`src/domain/types.ts`).
- [x] Shared Incident type/model (PRD §5 fields, incl. parallel
      `recoveryStatus` vs `communicationStatus`).
- [x] Incident lifecycle + communication lifecycle types.
- [x] Audit/timeline event structure (append-only, newest-first render).
- [x] Severity rules as one domain function (`assessSeverity` +
      `validateSeverityOverride`); INC-1043 seed asserts HIGH at build time.
- [x] KPI derivations as domain functions (`firstCommunicationKpi`,
      countdown/elapsed formatting, NZDT formatting).
- [x] Permission matrix as one domain module (`allowedActions` /
      `deniedActions` / `can` — no per-role UI branches).
- [x] Demo seed: INC-1043 (REPORTED, awaiting validation) + INC-1039 +
      INC-1041 background records; `localStorage` persistence + Reset demo.
- [x] Role switcher in top nav (NavLinks) + deep links drive the demo role.
- [x] Same store record on all role pages (shared-record fingerprint shown).
- [x] Persistent demo-workspace bar + footer disclaimer on every screen.
- [x] Clean `npm run build` (tsc -b + vite) and all role routes serve 200.

Acceptance Criteria:
- Switching roles does not reset INC-1043. ✅ (context store; role only changes `role`)
- All role-specific screens reference the same incident. ✅ (fingerprint identical; one store)
- Shared state is not duplicated per role. ✅ (single `AppState.incidents`, one `RolePage`)
- Build passes; no secrets in repo. ✅ (no backend, no credentials, no SAP code)

Outstanding / deferred (not Phase-1 gaps, see phases below):
- Browser render check (routes serve 200; visual pass left to presenter).
- No lint configured (recorded for Phase 10); no tests yet.

Tasks:
- [ ] Scaffold Vite + React + TS (+ router) per approved stack; add
      `tokens.css` seeded from the UI kit (navy/teal/severity tokens,
      KPI card, badges, table, timeline, banners, dialogs).
- [ ] Define role type:
      CONTRACTOR | OPERATIONS | CUSTOMER_INFORMATION
- [ ] Define shared Incident type/model (see PRODUCT_REQUIREMENTS.md §4–5).
- [ ] Define incident lifecycle + communication lifecycle.
- [ ] Define audit/timeline event structure.
- [ ] Implement severity rules as one domain function + override path
      (reason mandatory + audit event).
- [ ] Implement KPI derivations as domain functions (first-communication
      time vs 10-min target; coverage; counts).
- [ ] Add controlled demo seed for INC-1043 (Route 70, Newmarket,
      breakdown) + 2–3 background incidents for queue realism.
- [ ] Implement prototype role switcher (demo mechanism, not auth).
- [ ] Ensure all roles read the same incident state; role change
      preserves data.
- [ ] Add persistent "DEMO WORKSPACE · Synthetic data" bar + footer
      disclaimer on every screen.
- [ ] First clean build + typecheck passes.

Acceptance Criteria:
- Switching roles does not reset INC-1043.
- All role-specific screens reference the same incident.
- Shared state is not duplicated per role.
- `npm run build` (or approved equivalent) passes; no secrets in repo.

---

# Phase 2 — Bus Contractor Experience

Status: TODO

Screens (map to `design/Capture new bus disruption.png`):
- Contractor Overview
- Report Disruption
- Submission Success / Incident Detail

Tasks:
- [ ] Build role-specific contractor navigation.
- [ ] Build simple contractor dashboard.
- [ ] Build disruption notification form (route, location, disruption
      type, onset time NZDT, facts-vs-estimates fields per UI kit).
- [ ] Validate mandatory fields (inline text errors; no silent loss).
- [ ] Create shared incident on submit (status REPORTED + timeline event).
- [ ] Record contractor notification in timeline.
- [ ] Allow confirmed operator update.

Acceptance Scenario:
Contractor reports:
- Route 70
- Vehicle breakdown
- Newmarket
- 25-minute estimated delay
- High passenger impact

Result:
INC-1043 appears in AT Operations Incoming queue.

---

# Phase 3 — AT Operations Experience

Status: TODO

Screens (map to `design/Incident assessment and ownership.png`,
`design/Operational recovery coordination.png`):
- Operations Dashboard
- Incoming Notification
- Severity Assessment
- Incident / Recovery Workspace

Tasks:
- [ ] Build operations navigation.
- [ ] Show incoming contractor notifications.
- [ ] Validate/accept notification (REPORTED → VALIDATED/ACTIVE).
- [ ] Implement severity calculation service (single domain function).
- [ ] Display severity reasoning (factors + recommended action).
- [ ] Implement severity override + required reason.
- [ ] Assign incident owner.
- [ ] Build operational recovery checklist (parallel track UI).
- [ ] Record actions in shared timeline.
- [ ] Show customer communication status read-only.

Acceptance Criteria:
- INC-1043 can be assessed as HIGH.
- Owner can be assigned.
- Severity override requires reason.
- Timeline identifies AT Operations actions.

---

# Phase 4 — Customer Information Experience

Status: TODO

Screens (map to `design/Passenger communication workspace.png`,
`design/Published update and active monitoring.png`):
- Communication Dashboard
- Communication Queue
- Passenger Message Composer
- Publish Success

Tasks:
- [ ] Build Customer Information navigation.
- [ ] Display incidents requiring communication.
- [ ] Show communication timer (live countdown to 10-min target).
- [ ] Show relevant operational incident summary.
- [ ] Generate initial message template from incident data.
- [ ] Allow message editing.
- [ ] Allow channel selection.
- [ ] Add preview.
- [ ] Confirmation dialog before publish ("Demo publication only").
- [ ] Implement prototype Approve & Publish action.
- [ ] Record first publication timestamp.
- [ ] Stop communication timer.
- [ ] Update shared communication status.
- [ ] Add audit event.

Acceptance Criteria:
- Customer Information sees the same INC-1043.
- Publication changes shared incident immediately.
- Operations can see published status after role switch.
- First Communication Time is derived from timestamps.

---

# Phase 5 — KPI and Dashboard Behaviour

Status: TODO

Screens (map to `design/Live operations overview.png`):

Tasks:
- [ ] Active incidents KPI.
- [ ] Average first communication KPI.
- [ ] Within 10-minute target KPI.
- [ ] Communication coverage KPI.
- [ ] Visible target countdown/progress.
- [ ] Target Met / Target Exceeded state.

Acceptance Criteria:
- KPI calculations are derived from incident data.
- KPI values update after publication.
- No important KPI is hard-coded only for visual effect.

---

# Phase 6 — Closure and Review

Status: TODO

Screens (map to `design/Incident closure and review.png`):

Tasks:
- [ ] Service restoration action.
- [ ] Actual restoration timestamp.
- [ ] Root cause field.
- [ ] Review-required decision.
- [ ] Corrective action.
- [ ] Corrective action owner.
- [ ] Due date.
- [ ] Close incident (confirmation dialog; "does not remove follow-up actions").
- [ ] Audit timeline event.

Acceptance Criteria:
- High-severity demo incident can be closed.
- Review/action remains visible after closure.

---

# Phase 7 — SAP Integration Layer

Status: TODO — **blocked on SAP gate (no confirmed API).**

Important:
Confirm the selected course SAP API before implementation.

Tasks:
- [ ] Identify confirmed SAP API/service from supplied course API pool.
- [ ] Implement service/adapter boundary.
- [ ] Map external data into internal Incident model.
- [ ] Keep AT-specific fields separated when SAP lacks equivalents.
- [ ] Add loading state.
- [ ] Add failure state ("SAP incident service is temporarily unavailable.").
- [ ] Add clearly labelled prototype fallback/demo-data behaviour.
- [ ] Keep secrets out of frontend source.

Acceptance Criteria:
- At least one genuine SAP-backed operation works if course environment supports it.
- Failure does not crash the application.
- App does not claim demo data is SAP data.
- API integration is isolated from UI.

Until the SAP gate clears, Phases 1–6 proceed against the labelled
demo repository only.

---

# Phase 8 — Usability Polish

Status: TODO

Review:
- [ ] Clear current role.
- [ ] Clear current incident status.
- [ ] Clear next action.
- [ ] Consistent severity labels.
- [ ] Confirmation before publish.
- [ ] Validation messages.
- [ ] Loading states.
- [ ] Error states.
- [ ] Empty states.
- [ ] Keyboard usability where practical.
- [ ] No colour-only status communication.
- [ ] Responsive enough for presentation laptop.

---

# Phase 9 — Demo Hardening

Status: TODO

Main Demo Route:

1. Select Bus Contractor.
2. Report Route 70 breakdown.
3. Submit to AT.
4. Switch to AT Operations.
5. Accept incoming notification.
6. Assess HIGH severity.
7. Assign Sarah Chen.
8. Start recovery.
9. Switch to Customer Information.
10. Open communication queue.
11. Prepare passenger message.
12. Publish.
13. Show first communication <10 minutes.
14. Switch to Operations.
15. Confirm publication is visible.
16. Restore service.
17. Close incident and record review action.

Tasks:
- [ ] Reset-demo mechanism if required.
- [ ] No broken navigation.
- [ ] No console-blocking errors.
- [ ] No demo dependency on unreliable external network except explicitly demonstrated SAP call.
- [ ] Validate all primary buttons.
- [ ] Test from fresh page load.

Acceptance Criteria:
The entire demonstration can be completed twice consecutively without manual data repair.

---

# Phase 10 — Final Verification

Status: TODO

- [ ] Build passes.
- [ ] Typecheck passes where applicable.
- [ ] Lint passes where applicable.
- [ ] Critical functional path passes.
- [ ] No secrets in repository.
- [ ] README contains run instructions.
- [ ] Role labels are correct.
- [ ] Prototype disclaimer is appropriate.
- [ ] Figma design and implementation are visually aligned.

---

## Assumptions & Open Questions (log — update as decisions land)

| # | Item | Status |
|---|------|--------|
| A1 | Greenfield: no stack to preserve; Vite+React+TS proposed as smallest fit. | Approved — implemented in Phase 1 |
| A2 | Canonical demo incident is INC-1043 / Route 70 / Newmarket (spec), not the illustrative `BUS-2026-0142` / Dominion Road IDs in the PNGs. | Assumed — confirm |
| A3 | 10-min KPI measured confirmedAt → firstPublishedAt (NZDT). | Assumed — confirm |
| A4 | Roles are a demo switcher, not authentication. | Confirmed by spec |
| A5 | No confirmed SAP service; demo fallback is the default path. | Open — needs course API pool info |
| A6 | Severity rules are demo assumptions, not AT policy; must be labelled as such in UI. | Assumed — confirm |
| A7 | `localStorage` persistence acceptable as demo convenience with reset. | Assumed — confirm |
