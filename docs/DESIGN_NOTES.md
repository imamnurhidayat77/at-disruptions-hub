# Design Notes — AT Disruption Hub (A3 prototype)

## 1. Chosen solution and justification

The app implements **S2 — Integrated Disruption Management Hub with multichannel
publishing**, the preferred end-state from the A2-D1 consulting proposal, sequenced
after **S1 — standardised disruption protocol + severity matrix** as a prerequisite.

Why S2 (proposal §4.1): it addresses the broadest set of evidenced weaknesses —
late/incomplete operator hand-off (H3), inconsistent coverage (H4), slow or missed
passenger communication (H5) — through one governed record, while S1 stabilises the
operating rules the Hub digitises. Route-level interventions (S3/S4) stay out of scope.

Feature-to-proposal traceability:

| Proposal control (Table 8) | App feature |
|---|---|
| Early structured operator notification | Contractor 3-step wizard with mandatory fields (ReportPage) |
| One incident record, shared event status | Single `Incident` object in one store for all roles (AppStore) |
| Severity and Impact Matrix with override | `assessSeverity` + Duty Manager override with mandatory reason (SeverityPage) |
| Parallel recovery and customer communication | Recovery checklist and comms composer as parallel tracks (IncidentWorkspace) |
| Multichannel publication from approved status | Channel selection + publish with first-publication timestamp (Composer) |
| Triggered review and action ownership | Root cause, corrective actions with owner/due date, Reviews worklist (CloseIncidentPage) |
| KPI: First Public Communication Time ≤ 10 min | `firstCommunicationKpi(confirmedAt → firstPublishedAt)` derived in `domain/kpi.ts`, live countdown in UI |

## 2. Design thinking

- **Empathise:** three role home pages use each role's own language (operator:
  "Report/Awaiting assessment"; Operations: severity/owner/recovery; Customer
  Information: queue/publish/coverage). Contractor never sees severity tooling or
  analytics; Customer Information cannot change severity or ownership.
- **Define:** one problem statement per screen (pagehead lede), minimal mandatory
  fields, named owner for every incident and corrective action.
- **Ideate → Prototype:** SAP Fiori Horizon visual language (shell bar, tab bar with
  More-overflow, Object-Page workspace, MessageStrip notes, responsive FilterBar
  tables) so the prototype reads as an enterprise operations tool.
- **Test:** the `docs/DEMO_SCENARIO.md` script is the usability test — every step is
  reachable by visible affordance and the KPI evidence is derived, never hard-coded.

## 3. SAP API fit — Option #2 (partial fit, A3 spec)

Per the A3 specification, the SAP API **partially fits** the proposed solution
(Option #2: slightly modify the wrapper and/or the solution, with details below).

- **Wrapper changes:** the EHS service (`API_EHS_REPORT_INCIDENT_SRV`) is reached
  only through a same-origin proxy (`server/sapProxy.ts`, API key server-side),
  interpreted by a single mapper (`src/services/sap/sapIncidentMapper.ts`) that
  never invents values — missing fields become labelled cached-record defaults,
  and sync failures degrade to the cached set with a visible "SAP unavailable"
  state instead of crashing.
- **Solution changes:** SAP EHS records are **intake candidates, not incidents**.
  They enter through the Incoming worklist and only become part of the shared
  record after Operations enrichment/acceptance. No new AS-IS/TO-BE models are
  needed (Option #2, not #3): the TO-BE "confirmed status update" step absorbs
  the SAP intake without process change.

## 4. Changes vs the A2 proposal

1. **SAP scope narrowed:** the proposal mapped SAP LeanIX/Analytics Cloud/Build/Cloud
   ALM as potential validation aids. The prototype integrates one service —
   EHS incident intake (`API_EHS_REPORT_INCIDENT_SRV`) via a same-origin proxy with a
   labelled cached-records fallback — because intake is the only SAP touchpoint the
   TO-BE process requires on day one.
2. **Severity method simplified:** the proposal's Severity and Impact Matrix is
   represented as a single transparent scoring function with three visible factors,
   keeping Duty Manager override with mandatory reason.
3. **No authentication:** production least-privilege/authentication (FURPS+) is
   represented by role-scoped navigation and a labelled role switcher, not a login.
4. **No live channels:** publication writes to the shared record with channel status
   instead of posting to AT channels.
