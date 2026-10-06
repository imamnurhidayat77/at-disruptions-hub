# Product Requirements — AT Disruption Hub

## 1. Product Statement

AT Disruption Hub is a functional prototype demonstrating how Auckland Transport could coordinate an unplanned bus disruption through one governed incident record.

The prototype connects:
- Bus Contractor reporting,
- AT operational response,
- AT passenger communication.

This is a **university prototype, not a production Auckland Transport
system**. Severity rules, KPI targets and workflows are demonstration
assumptions and must be labelled as such in the UI. They are not
official Auckland Transport operational policy.

---

## 2. Business Problem

The prototype addresses:
- delayed or incomplete operator notifications,
- fragmented incident information,
- inconsistent severity assessment,
- manual hand-offs,
- delayed passenger communication,
- unclear ownership and review follow-through.

---

## 3. Target Outcome

The prototype should demonstrate how structured workflow can support:

- earlier incident notification,
- consistent severity assessment,
- named ownership,
- operational recovery and passenger communication in parallel,
- traceable publication timestamps,
- a first-public-communication target of 10 minutes or less,
- complete communication coverage for confirmed significant disruptions.

The prototype does not claim to prove these outcomes in production.

---

## 4. Users & Role Permissions

Three roles share **one incident record**. Permissions enforced per role:

### 4.1 Bus Contractor / Operator

Primary need: report disruption quickly without completing unnecessary
AT-internal work.

Can:
- view own incidents,
- create a disruption notification,
- send confirmed incident updates,
- view high-level AT incident status.

Cannot:
- set or override final AT severity,
- assign the AT incident owner,
- publish passenger information,
- view internal AT analytics,
- close AT review actions.

### 4.2 AT Operations

Primary need: understand what happened, prioritise the incident, assign
ownership and coordinate recovery.

Can:
- view incoming operator notifications,
- validate incident information,
- assess severity (including override with mandatory reason),
- assign the incident owner,
- coordinate recovery,
- view customer communication status,
- update restoration information,
- close the incident,
- create or trigger review actions.

Cannot:
- impersonate contractor submissions,
- silently modify already-published passenger messages.

### 4.3 AT Customer Information

Primary need: receive validated information early enough to communicate
useful passenger information without waiting for recovery to finish.

Can:
- view validated shared incident information,
- view operational status relevant to passengers,
- prepare and edit a communication draft,
- choose publication channels,
- approve/publish prototype passenger notices,
- view the communication KPI and timer.

Cannot:
- change final operational severity,
- assign the incident owner,
- control operator recovery tasks,
- modify operational recovery decisions.

Role switching is a **demo mechanism** (not authentication): switching
roles changes navigation and available actions but preserves the same
incident data.

---

## 5. Shared Incident Model

One normalized incident object; no per-role duplication. Minimum fields:

| Field | Notes |
|---|---|
| `id` | Canonical demo ID: `INC-1043` |
| `route` | e.g. `70` |
| `operator` | Reporting contractor/operator name |
| `vehicleOrServiceId` | Vehicle or service identifier |
| `location` | e.g. Newmarket (free text + road) |
| `disruptionType` | e.g. vehicle breakdown |
| `description` | Operator's free-text account |
| `detectedAt` | When the disruption started/noticed (NZDT) |
| `confirmedAt` | When AT acknowledged — **KPI start timestamp** |
| `estimatedDelayMinutes` | Operator estimate (e.g. 25) |
| `passengerImpact` | Low / Medium / High |
| `majorInterchangeAffected` | Boolean — severity factor |
| `severity` | LOW / MEDIUM / HIGH / CRITICAL (final) |
| `severityScore` | Numeric derivation behind the recommendation |
| `severityReason` | Factors shown in UI (contributing factors + recommended action) |
| `severityOverrideReason` | Mandatory when Operations overrides; audited |
| `owner` | Named accountable owner (e.g. Sarah Chen) |
| `operationalStatus` | Lifecycle state (§6) |
| `communicationStatus` | Publication state (§6) |
| `recoveryStatus` | Recovery track state (parallel to communication) |
| `estimatedRestorationAt` | Operator/Operations estimate (NZDT) |
| `restoredAt` | Actual restoration timestamp (NZDT) |
| `firstPublishedAt` | First passenger publication (NZDT) — **KPI stop timestamp** |
| `selectedChannels` | e.g. AT Mobile App, Website (prototype labels) |
| `reviewRequired` | Boolean |
| `correctiveActions` | List: action, owner, due date, status |
| `timeline` / `auditEvents` | Append-only: timestamp, actor role, action, detail |

---

## 6. Lifecycles

### 6.1 Operational lifecycle (`operationalStatus`)

`REPORTED → VALIDATED → ACTIVE → RECOVERY_IN_PROGRESS → RESTORED → CLOSED`

- `REPORTED`: contractor submitted, awaiting AT validation.
- `VALIDATED` / `ACTIVE`: Operations accepted; severity + owner assigned.
- `RECOVERY_IN_PROGRESS`: recovery checklist under way.
- `RESTORED`: service restored (`restoredAt` recorded).
- `CLOSED`: review decision + corrective actions recorded.

### 6.2 Communication lifecycle (`communicationStatus`, tracked separately)

`NOT_REQUIRED → REQUIRED → DRAFT → APPROVED → PUBLISHED`

- Publication is **simulated** and must carry a "Demo publication only —
  no live channel is connected" disclaimer.
- Publishing requires a confirmation dialog (per UI kit); publishing
  records `firstPublishedAt` (first time only) and an audit event.
- Already-published messages cannot be silently edited by Operations.

### 6.3 Parallel tracks

Operational recovery and passenger communication progress **in parallel**:
Customer Information must be able to draft and publish the first
passenger update before recovery completes. The Incident Workspace must
render both tracks side by side.

---

## 7. Severity Assessment (prototype rules — not AT policy)

Levels: `LOW / MEDIUM / HIGH / CRITICAL`.

- Implemented as **one reusable domain function** (never duplicated in
  UI components). Inputs include at minimum: `estimatedDelayMinutes`,
  `passengerImpact`, `majorInterchangeAffected`, `disruptionType`.
- The UI displays: calculated severity, contributing factors, and the
  recommended action.
- AT Operations may override; override requires new severity + reason +
  audit event.
- The canonical demo (Route 70, breakdown, 25-min delay, high impact,
  interchange affected) must recommend **HIGH**.
- Rules and labels must carry a prototype disclaimer.

---

## 8. 10-Minute Communication KPI (derived, never hard-coded)

- `firstCommunicationMinutes = firstPublishedAt − confirmedAt` (NZDT).
- Target: **≤ 10 minutes**.
- Display states:
  - *Unpublished:* live elapsed time + remaining time ("Due soon / Not
    published · 07:00 left" style per UI kit).
  - *Published:* elapsed time + `Target met` (≤10) or `Target exceeded`
    (>10), with timestamps shown.
- Dashboards derive all KPI cards from incident data (active count,
  awaiting-update count, at-risk/breached count, % within target);
  no KPI value is hard-coded for visual effect.

---

## 9. Core Functional Requirements

FR1: Contractor can create a structured disruption notification.
FR2: The app creates one shared incident record.
FR3: AT Operations can validate the incident.
FR4: The app calculates a prototype severity recommendation.
FR5: AT Operations can override severity with a recorded reason.
FR6: AT Operations can assign an owner.
FR7: Operational recovery and customer communication can progress in parallel.
FR8: Customer Information can prepare and publish a prototype passenger message.
FR9: Publication timestamp is captured.
FR10: The app calculates first communication time against a 10-minute target.
FR11: Role-specific interfaces expose appropriate actions.
FR12: Actions are visible in an audit/timeline view (newest-first).
FR13: High/significant incidents can progress into review/corrective action.

---

## 10. Non-Functional / UX Requirements

- Follow the approved UI kit: dark navy nav + role chip, persistent
  `DEMO WORKSPACE · Synthetic data · No live connections` bar, teal
  primary actions, labelled badges (never colour-alone), KPI cards with
  next-action links, newest-first timeline, footer disclaimer.
- All times NZDT.
- Minimal mandatory fields; inline validation messages; no silent loss
  of user input.
- Confirmation dialogs before publish and before close, each with the
  demo/illustrative disclaimer.
- Meaningful loading, error, and empty states; keyboard-usable where
  practical; responsive enough for a presentation laptop.
- Demo reset mechanism so the scenario runs twice consecutively without
  manual data repair.

---

## 11. Error Handling

At minimum, visibly handle (without discarding user input):
- required-field validation,
- failed incident creation,
- failed data retrieval,
- failed update,
- failed publication simulation,
- unavailable SAP connection → show
  "SAP incident service is temporarily unavailable." and continue only
  via the explicitly labelled demo fallback; never present fallback data
  as SAP data.

---

## 12. SAP / External Data Boundary

- All external access sits behind `src/services/` (adapter boundary);
  UI components hold no credentials or auth logic; no secrets in repo.
- No SAP service name or endpoint is hard-coded until confirmed against
  the course API pool.
- Where SAP data does not match transport-disruption fields, a
  mapper/adapter translates; AT-specific prototype fields stay in the
  domain model. The workflow is not distorted to fit SAP shapes.

---

## 13. Prototype Out of Scope

- production authentication
- production Auckland Transport deployment
- actual posting to live AT customer channels
- passenger mobile application
- real-time fleet GPS
- network timetable optimization
- fares
- real operator contractual systems
- production-grade identity/authorization
- push notification infrastructure
- complex admin systems / full production RBAC
- enterprise observability / unnecessary microservices

---

## 14. Acceptance

The requirements are met when the demo scenario in
`docs/DEMO_SCENARIO.md` runs end-to-end (contractor → operations →
comms → publish under 10 min → operations sees it → restore → close
with corrective action) with all values derived from the shared record.
