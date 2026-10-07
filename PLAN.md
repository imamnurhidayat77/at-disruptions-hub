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

Status: DONE (06 Oct 2026)

Screens (map to `design/Capture new bus disruption.png`):
- Contractor Overview (`/contractor`)
- Report Disruption (`/contractor/report`)
- Submission Success / Incident Detail (`/contractor/incident/:id`)

Tasks:
- [x] Role-specific contractor navigation (overview / report / my incidents / shared record; TopNav switcher unchanged).
- [x] Contractor dashboard (own reported incidents + high-level AT status badges + shared-store fingerprint).
- [x] Disruption notification form (Service & location / Onset & source / Disruption & impact per design; Mode fixed to Bus; readiness checklist; "Use Route 70 demo values" helper).
- [x] Mandatory-field validation (`validateReport` in domain; inline errors; input preserved on failure).
- [x] Shared incident created on submit (REPORTED/REQUIRED + timeline event; next ID INC-1044+).
- [x] Contractor notification recorded in timeline.
- [x] Confirmed operator update (detail + optional revised delay → shared timeline event).

Acceptance Scenario (verified against domain functions + build):
Contractor reports Route 70 / breakdown / Newmarket / 25-min delay /
high impact / interchange affected → validates clean, builds REPORTED
record, severity recommendation HIGH. New record appears in the shared
store (all-records table + every role page); AT Operations incoming queue
itself arrives in Phase 3.

Verification: `npm run build` passes; `/contractor`, `/contractor/report`,
`/contractor/incident/INC-1043` serve 200; headless domain test green
(validation, factory, ID sequencing, severity HIGH, update validation).

---

# Phase 3 — AT Operations Experience

Status: DONE, refined (07 Oct 2026) — full role nav (Overview, Incoming,
Incidents, Recovery, Reviews, Analytics), spec dashboards and workspace.

Refinement (per role brief):
- Overview: Active / High-Critical / Average First Communication /
  Within-10-Min KPIs (all derived) + Incoming Operator Notifications with
  Request More Information + Accept & Assess inline.
- Incoming detail: 11-field contractor summary, "Information provided by
  Bus Contractor", Request More Information (audit event + contractor
  status "More Information Requested", cleared by update/validate/assess).
- Severity: reusable `assessSeverity` (HIGH + supporting message + factors
  + score for Route 70); Confirm Severity + Override Severity modal (new
  severity + mandatory reason); calculated severity retained in the audit
  detail ("overridden from HIGH to CRITICAL").
- Owner roster Sarah Chen / James Wilson / Mia Roberts (demo: Sarah Chen);
  legacy owners preserved in existing records.
- Workspace header per spec (INC-1043, Route 70 — Vehicle Breakdown,
  Newmarket; HIGH/ACTIVE; owner; friendly operational status) + shared
  timeline + parallel recovery/comms panels; comms read-only with "View
  Communication Status" expander (no edit/publish for Operations).
- Recovery: 5 spec tasks, ERT editor + Update Recovery, milestones.
- Reviews/Analytics/Incidents/Recovery pages derived from shared state.
- Contractor sees More Information Requested / Recovery in Progress /
  AT Severity: High from the same record; no state duplicated.
- Second pass (role brief): shared Demo Role shell with "AT Disruption Hub
  / Operations" context; INC-1043 seeds clean (no MIR flag); request action
  hides after use showing "Awaiting Operator Update"; post-update REPORTED
  reads "Ready for AT Assessment" (timeline-derived); Accept & Assess jumps
  to #severity-assessment; HIGH SEVERITY display + exact four factors +
  prototype-rule label; override modal (level + mandatory reason, calculated
  retained in audit); Sarah Chen — Duty Operations Manager with assignment
  timestamp; ERT editor + Update Recovery; comms panel shows
  notice/publication/timer/remaining/target read-only; friendly operational
  status labels. Verified headlessly + screenshots.

Screens (map to `design/Incident assessment and ownership.png`,
`design/Operational recovery coordination.png`):
- Operations Dashboard (`/operations` — incoming queue + all records)
- Incident Workspace (`/operations/incident/:id` — validate, severity,
  owner, recovery, read-only comms rail + timeline)

Tasks:
- [x] Operations navigation (dashboard / incoming / workspace routes).
- [x] Incoming contractor notifications (REPORTED queue; validating starts the KPI clock).
- [x] Validate/accept notification (REPORTED → VALIDATED + `confirmedAt` + audit event; re-validate is a no-op).
- [x] Severity calculation service reused (`assessSeverity`); recommendation + factors shown.
- [x] Severity radio cards + mandatory rationale; override (differs from recommendation) requires reason via `validateSeverityOverride`.
- [x] Owner assignment from demo roster (default Sarah Chen) + accepted banner.
- [x] Active-management gate (VALIDATED + severity + owner → ACTIVE).
- [x] Recovery task board (toggle with timestamps, add task, operator-contact log, milestones, no-restoration-time warning).
- [x] Auto-transitions: first task → RECOVERY_IN_PROGRESS; all tasks → RESTORED + `restoredAt`; reopening final task rolls back.
- [x] Customer communication status read-only in workspace rail (derived KPI snapshot; publish disabled with Phase 4 tag).
- [x] Workflow stepper (assess → recover → passenger update → monitoring → close) derived from statuses.

Acceptance Criteria (headless reducer test + build):
- INC-1043 asserted HIGH with owner Sarah Chen; full chain REPORTED →
  VALIDATED → ACTIVE → RECOVERY_IN_PROGRESS → RESTORED produces a
  10-event audit trail in order; override path and guards verified.
- Fixed during verification: recovery-toggle events were built but dropped
  from state (`timeline: events` missing) — caught by the headless test,
  fixed, re-verified.
- `npm run build` passes; ops routes serve 200; contractor detail page
  shows confirmed severity/owner read-only (cross-role proof).

---

# Phase 4 — Customer Information Experience

Status: DONE, refined (07 Oct 2026) — full role nav (Overview,
Communication Queue, Published Updates, Templates, Analytics), spec
dashboards and composer.

Refinement (per role brief, no SAP work):
- Shell: same global chrome; "Customer Information" role tag next to
  "AT Disruption Hub"; Demo Role switcher unchanged; comms-only nav.
- Overview (`/comms`): title "Customer Information Overview" + four
  derived KPI cards (Awaiting Passenger Update, Oldest Communication
  Timer, Average First Publication, Communication Coverage) + queue preview.
- Queue (`/comms/queue`): validated + severity-assessed incidents needing
  first publication, riskiest first, with derived elapsed/remaining per row
  and "Prepare update" buttons. REPORTED and awaiting-severity records are
  listed as blocked, never queue-ready.
- Published (`/comms/published`): every PUBLISHED record with title,
  channels, published time, first-communication time and target badge.
- Templates (`/comms/templates`): default title/message pattern generated
  from validated facts (editable in composer) + prototype channel list.
- Analytics (`/comms/analytics`): average, coverage, within-target and
  awaiting figures, all timestamp-derived, plus per-incident record.
- Composer (`/comms/incident/:id`, "Prepare Passenger Update"): read-only
  operational summary (11 fields incl. owner + latest operator update),
  editable title/message, character count, optional next-update time,
  channels AT Mobile App / Website / Social Media (Mobile + Website
  pre-selected), live preview, prominent timer with progress bar, and an
  "Approve & Publish" confirmation modal (Cancel / Approve & Publish).
  First publish records firstPublishedAt and stops the clock; follow-up
  publishes add audit events without resetting it. Draft save never stops
  the clock and never discards input on validation errors.
- Channels renamed to AT Mobile App / Website / Social Media (demo seed
  updated; legacy "AT website" labels backfilled on load).
- Cross-role: ops workspace shows read-only first-communication time +
  target met/exceeded; contractor detail shows high-level
  "Passenger information: Published".
- Comms components call no Operations-only actions (verified by grep);
  publish stays possible while recovery is in progress (parallel tracks).

Original implementation (06 Oct 2026):

Screens (map to `design/Passenger communication workspace.png`,
`design/Published update and active monitoring.png`):
- Communication Dashboard (`/comms` — queue sorted by risk + target performance)
- Passenger Message Composer (`/comms/incident/:id` — facts, draft, channels, preview, live countdown, publish dialog)

Tasks:
- [x] Customer Information navigation (dashboard / queue / composer routes).
- [x] Communication queue (validated incidents needing first publication, riskiest first; REPORTED shown as blocked).
- [x] Live communication timer (1s ticking countdown + elapsed + deadline in composer rail).
- [x] Operational incident summary (service, location, cause, impact, restoration — "do not promise" when unconfirmed).
- [x] Message template generated from incident data (title + plain-language body, editable).
- [x] Message editing, channel selection (3 demo channels, ≥1 required), passenger preview.
- [x] Confirmation dialog before publish ("Demo publication only" + facts check).
- [x] Approve & Publish: records `firstPublishedAt`, stops the clock, PUBLISHED + audit event (single-publication model; re-publish guarded).
- [x] Draft save (REQUIRED → DRAFT, does NOT stop the clock).

Acceptance Criteria (headless chain test + build):
- Same INC-1043 across roles; publish mutates the shared record immediately.
- Operations sees published status + target result after role switch (read-only rail).
- First Communication Time derived confirmedAt → firstPublishedAt; 8-min demo run shows Target met.

---

# Phase 5 — KPI and Dashboard Behaviour

Status: DONE (06 Oct 2026) — `queueKpis()` domain function + KPI cards and
risk-sorted filterable queue on `/operations` (search, status, severity,
target, owner + reset). All values derived; achieved % shows "—" when
nothing published.

- [x] Active incidents KPI (with critical/high/other breakdown).
- [x] Awaiting-initial-update KPI.
- [x] Breached + due-soon risk KPI.
- [x] Within-10-minute-target KPI.
- [x] Countdown/progress + Target Met / Exceeded states (badges + composer rail).

---

# Phase 6 — Closure and Review

Status: DONE (06 Oct 2026) — `CloseReviewPanel` in the operations workspace
(map to `design/Incident closure and review.png`): root cause + review
decision, corrective actions (action/owner/due, OPEN), close via
confirmation dialog (requires RESTORED + root cause; "does not remove
follow-up actions"), closure banner, reopen support. Corrective actions
persist after closure and are visible read-only on the contractor detail
page.

- [x] Service restoration action (final recovery task → `restoredAt`, RESTORED).
- [x] Root cause, review-required decision, corrective action + owner + due date.
- [x] Close incident + audit event; high-severity demo incident closes with review action retained.

---

# Phase 7 — SAP Integration Layer

Status: BLOCKED — SAP credentials / sandbox required (07 Oct 2026).

Completed code (verified without a network):
- [x] Server-side proxy (`server/sapProxy.ts` Vite plugin): same-origin
      `/api/sap/status` + `/api/sap/incidents`, key stays server-side,
      5-record cap, NOT_CONFIGURED (503) / upstream-error (502) mapping.
- [x] Integration boundary (`src/services/sap/`): service (proxy-only,
      typed NotConfigured/Unavailable errors), central testable mapper
      (OData V2/V4/bare/single, candidate-key reads, nulls never invented,
      rawSource preserved), normalised `SapIncidentReference` type.
- [x] UI: SAP Integration panel on Operations → Analytics (status, last
      sync, count, Sync action, results table with SAP badge, normalised
      details expander), subtle ops-only nav chip, refactored `SapStatus`.
- [x] Tests: `npm run test:sap` — 8 passing (valid V2/V4, missing fields,
      empty, HTTP error, unreachable, 503 mapping, store non-mutation).
- [x] Secrets: `.env.example` + git-ignored `.env*`; no key in `src/`;
      `.env.example` contains blanks only.
- [x] Docs: `docs/SAP_INTEGRATION.md` (selected API, Option-2 fit,
      adaptation, auth, failure handling, demo steps).

Not verified (hence BLOCKED, not complete):
- No live request has returned data — no `SAP_API_BASE_URL`/`SAP_API_KEY`
  supplied. Evidence-backed so far: service path + `A_Incident` entity set
  from SAP's official EHS integration guide; exact sandbox properties are
  intentionally unconfirmed and must be recorded in
  `docs/SAP_INTEGRATION.md` after the first real response.
- "Use as Reference" import deferred (lower priority than working GET).

---

# Phase 8 — Usability Polish

Status: DONE (06 Oct 2026)

- [x] Clear current role (nav + user chip), status (badges everywhere), next action (per-stage panels/buttons).
- [x] Consistent severity labels; confirmation before publish AND close (shared `ConfirmDialog` with facts check + disclaimers).
- [x] Validation messages inline; error/empty states on queues, tables, forms, detail pages; `:focus-visible` styling; native controls (keyboard-usable).
- [x] No colour-only status (all badges labelled); responsive grids for presentation laptop.
- [x] Role-scoped guards with explanations (comms blocked on REPORTED, publish/close guarded, contractor read-only AT fields).

---

# Phase 9 — Demo Hardening

Status: DONE (06 Oct 2026)

Full Route 70 chain (report → validate → HIGH → Sarah Chen → active →
draft → publish at +8 min → recovery → restore → review + corrective →
close) executed headlessly **twice consecutively from reset — both pass**
(CLOSED/PUBLISHED, target met, 15-event audit trail, corrective OPEN).
Publish-when-REPORTED and close-without-root-cause are safely ignored.

- [x] Reset-demo mechanism (button on dashboards; `localStorage` v2 key + backfill).
- [x] No broken navigation (all 7 routes serve 200).
- [x] No demo dependency on external network (SAP stub fails fast with a visible message).
- [x] "Use Route 70 demo values" one-click form fill for the 5-minute demo.
- [x] Deterministic demo lifecycle (07 Oct 2026): INC-1043 seeds REPORTED /
  NOT_REQUIRED (State A); validation flips comms to REQUIRED (State B);
  severity gate admits it to the CI queue; draft never stops the clock;
  publish removes it and flips coverage 67% → 100%. Cross-role flow
  verified headlessly twice (contractor → ops → CI → ops, incl. queue
  counts, COUNTING timer, target-met, shared timestamp/event).
- [x] Discreet header "↺ Reset demo" control with confirmation dialog
  ("Reset demo scenario?"); resets data in place without reload,
  preserves current role; store key bumped to v4 for a clean reseed.

Outstanding (needs a browser): visual pass + click-through of the same
17-step route; console-error check during that pass.

---

# Phase 10 — Final Verification

Status: DONE (06 Oct 2026)

- [x] Build passes (`tsc -b && vite build`, 0 errors).
- [x] Typecheck passes (same command).
- [x] Lint: none configured (recorded gap — no lint tooling installed by design, no new deps).
- [x] Critical functional path passes (headless full-chain ×2 + guard checks + route checks).
- [x] No secrets in repository (scanned `src/`, configs, `package.json` — clean).
- [x] README contains run instructions (updated for full scope below).
- [x] Role labels correct; prototype disclaimers on every screen + dialogs + footer.
- [x] Implementation follows the Figma screens (capture form, assess/recovery workspace, composer, closure, KPI overview).

Known simplifications vs the PNGs (documented, not defects):
- Single-publication model (no v1/v2/v3 update versioning); closure shows the first-update record.
- No queue export buttons; no multi-update commitments beyond `nextUpdateBy`.
- Browser visual/click-through pass still recommended before presenting.

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
