# SAP Integration

## Selected API

**API_EHS_REPORT_INCIDENT_SRV** — "Environment, Health, and Safety Incident
- Create, Read" (SAP Business Accelerator Hub).

## Course API Category

EHS / Compliance.

## Course Description

Safety incident reporting, risk assessments, corrective actions.

## Fit to Proposed Solution

**Partial Fit — Option 2.**

The A2 solution requires management of public-transport *service
disruptions* (bus breakdowns, delays, recovery coordination, passenger
communication). The supplied SAP API is designed around *EHS safety
incident reporting* (workplace incidents, involved persons, attachments).
It is the closest available incident-management capability in the pool,
but it is not an Auckland Transport production disruption-management API
and is never presented as one.

Therefore the prototype uses an **adapter/wrapper**: SAP-shaped data is
normalised into small `SapIncidentReference` objects for display, while
all Auckland Transport workflow runs on the unchanged internal
`Incident` domain model.

The business process remains:

Bus Contractor → AT Operations → AT Customer Information → Recovery / Review

while SAP integration demonstrates the technical incident-service
integration capability in parallel.

## Adaptation

### SAP fields actually used

Spec source: supplied `API_EHS_REPORT_INCIDENT_SRV` OpenAPI v1.0.0
(EHS Incident - Create, Read; communication scenario SAP_COM_0369;
sandbox server
`https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_EHS_REPORT_INCIDENT_SRV`).

The proxy requests entity set `A_Incident` with an explicit spec-exact
`$select` (plus `$top=5`, `$format=json`):

`IncidentID`, `IncidentUUID`, `IncidentUTCDateTime`, `IncidentTitle`,
`IncidentStatus`, `IncidentLocationDescription`,
`IncidentDescriptionOfEvents`, `IncidentCategory`, `EHSLocationUUID`.

The frontend mapper (`src/services/sap/sapIncidentMapper.ts`) reads
those keys first (OData V2 `{d:{results}}`, OData V4 `{value}`,
bare arrays and single objects all accepted):

- id ← `IncidentID`, then `IncidentUUID`
- title ← `IncidentTitle`
- description ← `IncidentDescriptionOfEvents`, then `IncidentLocationDescription`
- status ← `IncidentStatus`
- created ← `IncidentUTCDateTime` (OData `/Date(...)/` or ISO)
- category ← `IncidentCategory`; location text ← `IncidentLocationDescription`

Anything absent stays `null`, and the untouched original entry is
kept in `rawSource`. Related entity sets exist in the spec
(`A_Incident(...)/to_Persons`, `/to_Attachments`, `/to_Location`, plus
value helps `C_EHSLocationValueHelp`, `C_EHSPersonValueHelp`) but the
prototype GETs the incident list only. Exact live sandbox VALUES are
recorded here once a live response is observed (none observed yet —
see Status below).

### Auckland Transport fields kept in the prototype

`route`, `operator`, `vehicleOrServiceId`, `location`, `disruptionType`,
`passengerImpact`, `estimatedDelayMinutes`, `severity`, `owner`,
`communicationStatus`, `firstPublishedAt`, `estimatedRestorationAt`,
`selectedChannels`, `recoveryStatus`, timeline/audit events. None of
these are mapped from SAP fields and none are sent to SAP.

### Demo enrichment of SAP references (07 Oct 2026)

Because the EHS sandbox carries no bus-operation data, the prototype
adapter attaches the missing operational fields as explicitly labelled
DEMO data: `src/services/sap/sapDemoEnrichment.ts`
(`enrichSapReference` / `enrichSapReferences`).

- Honesty boundary: SAP fields are never modified and `rawSource` passes
  through untouched; demo values live ONLY under the nested `demo` key
  (`source: 'demo'`), never as top-level fields — so demo data can never
  be mistaken for an SAP response.
- Deterministic per `sapId` (stable across re-syncs): 5 coherent
  Auckland-flavoured scenarios (Route 70/Newmarket/breakdown/25-min,
  Route 18/Great North Road/road-blocked/40-min, Route 22N/vehicle
  unavailable/15-min, Route 75/congestion/12-min, Route 95B/breakdown/
  20-min; operator always "Demo Bus Operator").
- Severity is a *suggestion* computed with the single shared domain rule
  `assessSeverity` — never a final AT severity.
- Enriched data is display-only in Operations → Analytics → SAP
  Integration (columns badged `Demo`); it never enters the shared AT
  incident store and is never sent to SAP.

## Authentication

- Env vars (dev-server side only): `SAP_API_BASE_URL` (S/4 host, no
  trailing service path), `SAP_API_KEY`, optional `SAP_API_ENTITY_SET`
  (default `A_Incident`).
- Configure via `.env.local` (see `.env.example`). `.env*` files are
  git-ignored and never committed.
- The browser calls same-origin `/api/sap/*` only. The Vite dev-server
  proxy (`server/sapProxy.ts`) attaches the `APIKey` header server-side
  (the documented SAP Business Accelerator Hub sandbox convention).
- Verified: no `SAP_API_*` reference and no key material exists in
  `src/` (checked by test + `grep`).

## Failure Handling

- Not configured → HTTP 503 `NOT_CONFIGURED` → UI shows "Not configured"
  and the Route 70 demo runs untouched.
- Upstream error / unreachable → HTTP 502 → UI shows "SAP Incident
  Service is temporarily unavailable." App state is preserved; no
  incidents are created, modified or deleted (sync results live only in
  the panel's local state, never in the incident store — enforced by a
  structural test).
- Demo fallback is always the explicitly labelled local prototype data;
  failed SAP responses are never backfilled with demo data.

## Demo Steps

1. Start the app (`npm run dev`). Route 70 flow works with or without SAP.
2. As AT Operations, open **Analytics** → **SAP Integration**.
3. Without credentials: Status shows "Not configured"; Sync shows the
   guidance message. This *is* the honest demo until credentials exist.
4. With credentials (`SAP_API_BASE_URL` + `SAP_API_KEY` in `.env.local`,
   restart dev server): Status becomes "Connected" after sync; **Sync SAP
   Incidents** retrieves up to 5 records; the table shows SAP Incident /
   Description / Status / Created / Source(SAP); **View SAP Details**
   expands the normalised view.
5. `npm run test:sap` proves mapper + error handling without a network.

## SAP Intake (Figma "05 SAP Integration", Oct 2026)

User-supplied Figma frames define an intake workflow on top of the
adapter boundary above. Until a live sandbox returns candidates, the
intake runs on explicitly labelled demo seed (`buildSapSeed`, 5
records mirroring the Figma rows 123456–123460):

- Operations → **Incoming** worklist mixes contractor notifications
  with SAP-source candidates (intake routes "Contractor alert" /
  "SAP EHS intake"), each with a Figma intake status (Awaiting AT
  Assessment / Needs Enrichment / Not Linked / Linked).
- **Enrich** opens the assessment page: SAP fields render read-only,
  AT adds operational information, **Create AT Disruption** produces
  ONE linked shared incident (VALIDATED, KPI clock running) — never
  a second incident. The candidate is marked linked.
- The linked incident workspace shows a **SAP source context** card
  (SAP ID/UUID/status/last sync + the separation note). SAP Status
  stays source-system state; AT status is managed separately.
- The existing sync panel (Analytics) is unchanged and remains the
  live-source probe; demo candidates are never presented as live data.

## Automatic intake (no clicks, no forms)

SAP intake is fully automatic — there is no Sync button and no enrich
form. Opening Operations → **Incoming** fetches up to 5 live records and
treats every one as a finished incident: each record completes directly
as a CLOSED shared archive (`AUTO_INTAKE_SAP`, one atomic dispatch),
with the remaining lifecycle filled from deterministic dummy data:

- `fetchLiveEnriched` (`sapIncidentService.ts`) — fetch + enrich only.
  Null when SAP is unconfigured/unreachable; the labelled demo seed then
  goes through the identical automatic path.
- `referenceToCandidate` (`sapIncidentMapper.ts`) completes every field
  the worklist needs (derived or explicit labelled default); OData
  `/Date(...)/` payloads are normalised to ISO via `toIsoDate` so a bad
  timestamp can never blank a view (formatters also render `—` instead
  of throwing).
- `buildArchivedIncident` (`domain/intake.ts`) — deterministic Auckland
  dummy scenarios per SAP ID (5 rute/lokasi/tipe/delay/impact koheren; ID
  sama → skenario sama; `dummyScenarioFor` + `disruptionTypeFor`).
  Severity comes from the real `assessSeverity` rules, owner from the
  roster, publish/recovery/review timestamps stagger from `receivedAt`.
  Operator always `SAP EHS Import` (contractor views stay clean). Result:
  CLOSED + PUBLISHED + RESTORED, corrective DONE, 12-event timeline.
- `autoIntakeSap` (AppStore) skips already-linked records, so refreshes
  never duplicate; linked history survives via `mergeCandidates`. When live
  SAP connects, the fresh live set replaces the unlinked demo seed (seed
  stays only as the unreachable fallback).
- The manual enrich page (`/operations/sap/:sapId`) is deleted; intake
  rows link straight to the created archive. The Analytics → SAP
  Integration panel is status + records only.

## Status (07 Oct 2026)

**CONNECTED — live sandbox response observed (07 Oct 2026).** With
`SAP_API_BASE_URL=https://sandbox.api.sap.com/s4hanacloud` plus a valid
sandbox `APIKey` in git-ignored `.env.local` (key never committed, never
in `src/`), `GET
…/API_EHS_REPORT_INCIDENT_SRV/A_Incident?$top=5&$format=json` returns
HTTP 200 with an OData V2 envelope (`d.results`, 5 records). The
dev-server proxy (`/api/sap/incidents`) forwards the same 5 records and
`/api/sap/status` flips to `connected` with `lastCount: 5`. No code
changes were needed — the existing proxy `$select` and mapper keys
matched the live payload verbatim.

Observed live VALUES (`$top=5`, default ordering):

| IncidentID | IncidentTitle (truncated) | IncidentStatus | IncidentCategory | IncidentUTCDateTime |
|---|---|---|---|---|
| 2 | Incident Based on Injury/Illness Log Entry ID: 1 | 02 | 001 | /Date(1687755600000+0000)/ (2023-06-26) |
| 3 | Slip from ladder | 02 | 002 | /Date(1687839153000+0000)/ (2023-06-27) |
| 4 | slippery floor | 02 | 003 | /Date(1687839177000+0000)/ (2023-06-27) |
| 11 | An employee is not wearing heat resistant gloves… | 02 | 003 | /Date(1638187860000+0000)/ (2021-11-29) |
| 12 | Employee lifts a heavy metal plate… | 02 | 003 | /Date(1591874040000+0000)/ (2020-06-11) |

Notes: all 5 records return empty-string `IncidentLocationDescription`
and `IncidentDescriptionOfEvents` (mapper normalises these to `null`,
never invented); `IncidentLatitudeMeasure`/`IncidentLongitudeMeasure`
are `"0.000000000000"`; navigation properties (`to_Persons`,
`to_Attachments`, `to_Location`) are deferred URIs, not expanded — the
prototype GETs the incident list only. The sandbox is EHS safety
data (Option-2 partial fit), so AT-specific fields (route, severity,
owner, comms) stay demo-local and SAP references render read-only with
a SAP badge in Operations → Analytics → SAP Integration.
