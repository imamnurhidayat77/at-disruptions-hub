# AT Disruption Hub — Agent Instructions

> **Repo state (06 Oct 2026): ALL PHASES DONE (0–10).** Vite + React +
> TypeScript SPA (`package.json`, `src/`, hand-written CSS from the UI
> kit). Full demo chain works: contractor reporting → operations
> validate/severity/owner/recovery → comms draft/publish (<10 min KPI) →
> KPI dashboard → closure + corrective actions, on one shared store.
> SAP: integration code complete (server proxy + adapter + panel + tests)
> but BLOCKED on credentials — no live response observed yet. See PLAN.md
> Phase 7 and docs/SAP_INTEGRATION.md.

## Project Purpose

This repository contains a university functional prototype for:

AT Disruption Hub

Client context:
Auckland Transport Public Transport Operations.

The app demonstrates an approved Integrated Disruption Management Hub concept for managing unplanned bus service disruptions.

This is a prototype, not a production Auckland Transport system.

The priority is:
1. functional correctness,
2. a convincing end-to-end demo,
3. role-based usability,
4. visual consistency with the approved Figma design,
5. clear and maintainable code.

Do not over-engineer the prototype.

---

## Proposed Stack (pending approval — see PLAN.md Phase 0)

- **Build:** Vite + React + TypeScript (SPA, client-side only).
- **Routing:** React Router (role-scoped routes, deep-linkable incident workspace).
- **State:** One shared incident store via React context + reducer
  (single source of truth, no per-role duplication). Persist to
  `localStorage` only as a demo convenience with explicit reset.
- **Styling:** Hand-written CSS (custom properties) matching the UI kit —
  no component framework. Tokens live in one `tokens.css`.
- **No backend.** SAP access (if any) goes through a
  `src/services/` adapter boundary with a labelled demo fallback.
- **No new dependencies** without checking PLAN.md and justifying in the
  phase summary.

If the user approves a different stack, update this section and PLAN.md
before scaffolding.

---

## Proposed Folder Map (scaffold in Phase 1, not before)

```
src/
  domain/        # Incident types, lifecycle, severity rules, KPI derivations
  state/         # Shared incident store (context + reducer), role context
  services/      # sapIncidentService, incidentRepository, demo seed data
  routes/        # Role-scoped pages (contractor / operations / comms / review)
  components/    # UI-kit primitives: badges, KPI cards, tables, timeline, banners, dialogs
  styles/        # tokens.css + shared layout
docs/            # PRODUCT_REQUIREMENTS.md, DEMO_SCENARIO.md
design/          # Approved PNG screens (source of truth for visuals)
```

Rules:
- Domain rules (`severity`, KPI math) live in `src/domain/` only — never
  inside UI components.
- UI components must not contain SAP credentials or raw API auth logic.
- Keep components small; avoid giant page components and magic values.

---

## Design Assets (existing, source of truth for visuals)

`design/` contains 8 screens + 1 UI kit (PNG, Desktop 1440):

- `AT Disruption Hub UI kit.png` — colour tokens, nav, KPI cards,
  buttons, severity/status badges, form fields, incident table, timeline,
  banners, confirmation dialogs.
- `Live operations overview.png` — KPI cards + incident queue table.
- `Capture new bus disruption.png` — contractor reporting form.
- `Incident assessment and ownership.png` — severity + owner assignment.
- `Operational recovery coordination.png` — recovery track.
- `Passenger communication workspace.png` — message composer.
- `Published update and active monitoring.png` — published state.
- `Incident closure and review.png` — restoration + corrective action.

Key visual conventions (from UI kit):
- Dark navy top navigation with role/user chip; brand links to the role
  home. Prototype disclosure lives in the persistent footer disclaimer
  ("Illustrative workflow only · All times NZDT · Not a live operational
  record").
- Teal primary actions (`Publish update`, `Capture disruption`); labelled
  severity badges (Critical/High/Medium/Low) and communication-target
  badges (Due soon / Breached / Achieved / Not published) — never
  colour-alone.
- KPI cards: value + operational context + next-action link.
- Timeline newest-first; confirmation dialogs before publish/close, each
  carrying a "Demo publication only / illustrative workflow" disclaimer.
- All times NZDT; footer disclaimer "Illustrative workflow only".

Note: design PNGs use illustrative IDs (e.g. `BUS-2026-0142`, Dominion
Road). The canonical demo incident is **INC-1043, Route 70, Newmarket**
per `docs/DEMO_SCENARIO.md`. Do not let illustrative IDs leak into the
demo seed data as the canonical record.

---

## Core Business Principle

The application MUST represent:

ONE INCIDENT
ONE SHARED RECORD
MULTIPLE ROLE-SPECIFIC EXPERIENCES

The three primary roles are:

1. Bus Contractor / Operator
2. AT Operations
3. AT Customer Information

The roles do NOT use separate incident databases or disconnected workflows.

All roles interact with the same shared incident object according to their permissions.

---

## Main Demo Scenario

Use this scenario as the primary acceptance scenario (full script in
`docs/DEMO_SCENARIO.md`):

Incident:
INC-1043

Route:
70

Location:
Newmarket

Disruption:
Vehicle breakdown

Flow:

Bus Contractor
→ reports disruption

AT Operations
→ validates notification
→ assesses severity
→ assigns incident owner
→ begins service recovery

AT Customer Information
→ receives same incident
→ prepares passenger communication
→ publishes passenger update

AT Operations
→ immediately sees publication status

Recovery
→ service restored
→ incident closed
→ review / corrective action recorded

The first passenger publication should demonstrate a communication time below 10 minutes.

---

## Role Permissions

### Bus Contractor

Can:
- view own incidents
- create disruption notification
- send confirmed incident updates
- view high-level AT incident status

Cannot:
- set final AT severity
- override severity
- assign AT incident owner
- publish passenger information
- view internal AT analytics
- close AT review actions

### AT Operations

Can:
- view incoming operator notifications
- validate incident information
- assess severity
- override severity with mandatory reason
- assign incident owner
- coordinate recovery
- view customer communication status
- update restoration information
- close incident
- create or trigger review actions

Cannot:
- impersonate contractor submissions
- silently modify passenger messages already published

### AT Customer Information

Can:
- view validated shared incident information
- view operational status relevant to passengers
- prepare passenger communication
- edit communication draft
- choose publication channels
- approve/publish prototype passenger notices
- view communication KPI and timer

Cannot:
- change final operational severity
- assign incident owner
- control operator recovery tasks
- modify operational recovery decisions

---

## Shared Incident Model

Prefer one normalized incident domain object.

At minimum support:

- id
- route
- operator
- vehicleOrServiceId
- location
- disruptionType
- description
- detectedAt
- confirmedAt
- estimatedDelayMinutes
- passengerImpact
- majorInterchangeAffected
- severity
- severityScore
- severityReason
- severityOverrideReason
- owner
- operationalStatus
- communicationStatus
- recoveryStatus
- estimatedRestorationAt
- restoredAt
- firstPublishedAt
- selectedChannels
- reviewRequired
- correctiveActions
- timeline / auditEvents

Avoid duplicating shared incident state independently across role-specific pages.

Full field definitions and state machines: `docs/PRODUCT_REQUIREMENTS.md`.

---

## Incident Lifecycle

Use a small, understandable lifecycle.

Suggested states:

REPORTED
VALIDATED
ACTIVE
RECOVERY_IN_PROGRESS
RESTORED
CLOSED

Communication status should be tracked separately:

NOT_REQUIRED
REQUIRED
DRAFT
APPROVED
PUBLISHED

Do not create dozens of states unless required.

---

## Severity Assessment

Prototype severity levels:

LOW
MEDIUM
HIGH
CRITICAL

Severity calculation must be implemented in a single reusable domain function or service.

Do not duplicate severity logic inside UI components.

The UI must display:
- calculated severity,
- the factors contributing to severity,
- recommended action.

AT Operations may override severity.

Any override MUST require:
- new severity,
- reason,
- audit event.

Prototype severity rules are demonstration assumptions and must not be presented as official Auckland Transport operational policy.

---

## 10-Minute Communication KPI

The app must visibly support the prototype communication objective.

Calculate first communication time from the agreed incident confirmation timestamp to the first passenger publication timestamp.

Display:
- elapsed time,
- remaining time while unpublished,
- target = 10 minutes,
- target met / target exceeded after publication.

Do not fake the calculation directly in UI text.

Use timestamps and derive the value.

---

## Parallel Workflow

Operational recovery and passenger communication MUST be modelled as parallel activities.

Customer Information must NOT need to wait for service recovery to complete before preparing or publishing the first passenger update.

The Incident Workspace should visually communicate these parallel tracks.

---

## Role Switching

For prototype demonstration purposes, include a role switcher.

Roles:

- Bus Contractor
- AT Operations
- AT Customer Information

The role switcher is a DEMO mechanism, implemented as a small top-right
"Demo Role" profile control (university prototype demonstration only).

It is not intended to represent production authentication.

Changing roles must:
- change navigation,
- change available actions,
- preserve the same incident data.

---

## Design Rules

Follow the approved Figma design as closely as possible.

The app is an enterprise operations interface, not a consumer journey-planning app.

Keep:
- existing approved colour palette,
- typography,
- spacing,
- sidebar patterns,
- button hierarchy,
- KPI card style,
- tables,
- severity badges,
- status indicators.

Prioritize:
- visibility of system status,
- clear primary actions,
- minimal mandatory fields,
- predictable navigation,
- accessibility,
- clear validation,
- meaningful loading/error/success states.

Do not use decorative animation unless it improves feedback.

Do not add visual complexity simply to make the prototype look sophisticated.

---

## API Architecture

Keep external API interaction isolated from UI components.

Use a service/adapter boundary such as:

src/services/
  sapIncidentService
  incidentRepository

or the equivalent appropriate to the existing stack.

UI components must not directly contain SAP credentials or raw API authentication logic.

Never commit:
- API keys
- passwords
- secrets
- tokens

Use environment variables where required.

Do not hard-code a SAP service name unless it has been confirmed against the supplied course API pool.

If SAP data does not directly match transport disruption data:
- create a mapper/adapter,
- retain AT-specific prototype fields in the application domain model.

The business workflow should not be distorted simply to match the SAP data model.

---

## SAP Status (06 Oct 2026): NO confirmed API, NO sample code

No SAP integration examples exist in this repository and no course API
pool service has been confirmed. Therefore:

- Phase 7 (SAP layer) is planned as adapter-boundary + clearly labelled
  demo fallback only, until a confirmed API is supplied.
- Do not invent a SAP service name or endpoint.
- If a SAP sandbox becomes available, confirm the service name against
  the course API pool first, then implement the adapter.

---

## Mock / Demo Data

The prototype must remain demoable if an external SAP sandbox is unavailable.

Use a clean repository/service abstraction so the app can support:
- SAP-backed data where available,
- controlled demo data for unsupported AT-specific fields or temporary API failure.

Do not hide SAP errors.

Display a clear state such as:

"SAP incident service is temporarily unavailable."

Allow the demo to continue only through an explicitly identified prototype/demo fallback.

Do not pretend fallback data came from SAP.

Every screen must carry the persistent synthetic-data disclosure from the
UI kit (demo workspace bar + footer disclaimer).

---

## Error Handling

Handle at minimum:
- required field validation,
- failed incident creation,
- failed API retrieval,
- failed update,
- failed publication simulation,
- unavailable SAP connection.

Errors must be visible to the user and must not silently discard user input.

---

## Code Quality

Follow the conventions already used by this repository.

Before adding a dependency:
1. verify whether the current stack already solves the problem,
2. explain why the dependency is required.

Prefer:
- small components,
- clear types,
- centralized domain rules,
- reusable UI components,
- explicit data transformations.

Avoid:
- giant page components,
- duplicated business logic,
- deeply nested conditional JSX/templates,
- magic values spread throughout the UI,
- unnecessary global state.

---

## Scope Control

This is an A3 prototype.

DO NOT add the following unless explicitly requested:

- real production authentication
- production Auckland Transport integrations
- real public posting to AT channels
- live GPS vehicle tracking
- passenger journey planning
- fare/payment systems
- push notification infrastructure
- complex admin systems
- full production RBAC
- enterprise observability platforms
- unnecessary microservices

A polished functional prototype is more important than excessive scope.

---

## Development Workflow

Before each implementation phase:

1. Read PLAN.md.
2. Confirm which phase is currently in progress.
3. Inspect existing relevant code before editing.
4. Reuse existing components where reasonable.
5. Make the smallest coherent change.
6. Run relevant validation.
7. Update PLAN.md progress.
8. Summarize changed files and outstanding issues.

Do not silently move to the next major phase when acceptance criteria for the current phase are not satisfied.

No application code is to be written until the user approves the plan
(Phase 1 gate in PLAN.md).

---

## Verification

After meaningful changes:

- run the repository's existing build command,
- run type checking if available,
- run linting if available,
- run relevant tests if available.

Do not claim success when commands fail.

Record unresolved issues clearly.

(Until scaffolding exists there is no build/typecheck/lint command;
record `none — greenfield` in phase summaries rather than skipping silently.)

The most important manual acceptance path is:

Contractor reports INC-1043
→ Operations validates
→ severity becomes HIGH
→ owner assigned
→ Customer Information drafts/publishes
→ timer stops
→ target met is shown
→ Operations sees published status
→ recovery completed
→ incident closed.

---

## Documentation

Keep PLAN.md aligned with actual implementation status.

Do not mark a task complete merely because code was written.

A task is complete only when its acceptance criteria work in the application.

When architectural decisions materially change, update the relevant documentation.

Planning hierarchy: `AGENTS.md` (agent rules) → `PLAN.md` (phased build
plan) → `docs/PRODUCT_REQUIREMENTS.md` (what the app must do) →
`docs/DEMO_SCENARIO.md` (the script that proves it).
