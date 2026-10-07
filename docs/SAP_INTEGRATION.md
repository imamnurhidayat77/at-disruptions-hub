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

No SAP property name is assumed from documentation alone. The proxy
requests entity set `A_Incident` (attested by SAP's official EHS incident
integration guide, which also attests base path
`<host>/sap/opu/odata/sap/API_EHS_REPORT_INCIDENT_SRV/` and navigation
properties `to_Persons` / `to_Attachments`). The frontend mapper
(`src/services/sap/sapIncidentMapper.ts`) accepts OData V2, OData V4,
bare arrays and single objects, and reads identifier/title/description/
status/date values through a documented candidate-key list — first match
wins, anything absent stays `null`, and the untouched original entry is
kept in `rawSource`. Exact sandbox properties are recorded here once a
live response is observed (none observed yet — see Status below).

### Auckland Transport fields kept in the prototype

`route`, `operator`, `vehicleOrServiceId`, `location`, `disruptionType`,
`passengerImpact`, `estimatedDelayMinutes`, `severity`, `owner`,
`communicationStatus`, `firstPublishedAt`, `estimatedRestorationAt`,
`selectedChannels`, `recoveryStatus`, timeline/audit events. None of
these are mapped from SAP fields and none are sent to SAP.

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

## Status (07 Oct 2026)

**BLOCKED — SAP credentials / sandbox required.** All code paths above
are implemented and unit-tested, but no live request has returned data
because no sandbox URL or API key has been supplied. Do not mark Phase 7
complete until a real response is observed and its fields recorded in
"Adaptation" above.
