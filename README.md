# AT Disruption Hub

University functional prototype demonstrating an Integrated Disruption
Management Hub for Auckland Transport bus disruptions.

**Demo only — synthetic data, not a production Auckland Transport system.**

ONE incident, ONE shared record, THREE role-based experiences:

- **Bus Contractor** — reports disruptions, sends confirmed updates, responds to AT info requests.
- **AT Operations** — validates notifications (starts the 10-minute KPI clock), assesses severity (override needs a reason), assigns owner, coordinates recovery, closes incidents, tracks post-incident reviews.
- **AT Customer Information** — prepares, previews and publishes passenger notices; first publication stops the KPI clock.

## Run

Requires Node 18+.

```sh
npm install
npm run dev      # local demo at http://localhost:5173
npm run build    # typecheck + production build
npm run preview  # serve the production build
npm run typecheck
npm run test:sap # SAP mapper + error-handling tests (no network)
```

Demo state persists in `localStorage`. Use **Reset Demo** (Demo Role menu, top bar) to restore the canonical Route 70 scenario.

## Demo script (happy path)

1. **Contractor** (`/contractor/report`) reports a Route 70 breakdown → `REPORTED`.
2. **Operations** (`/operations/incoming`) accepts it → `VALIDATED`, KPI clock starts.
3. **Operations** severity wizard (`/operations/incident/:id/severity`) → confirm or override with reason → assign owner → workspace.
4. **Customer Information** (`/comms/queue` → composer) drafts and **publishes** within 10 minutes → KPI Achieved.
5. **Operations** completes recovery tasks, records actual restoration, closes with root cause + corrective actions.
6. **Reviews** (`/operations/reviews/:id`) — start review, complete corrective actions, review closes automatically.

## SAP integration (live data, optional)

Without credentials the app runs fully on labelled demo data. With credentials, opening **Operations → Incoming** automatically fetches up to 5 live records from the SAP EHS sandbox, enriches them, and turns them into linked `VALIDATED` incidents — no Sync button, no manual enrich form.

### Configuration (never commit secrets)

1. Copy `.env.example` to `.env.local`.
2. Fill in the two values:

| Variable | Value / where to get it |
|---|---|
| `SAP_API_BASE_URL` | Sandbox host origin (no service path): `https://sandbox.api.sap.com/s4hanacloud` |
| `SAP_API_KEY` | Your personal API key from the SAP Business Accelerator Hub (API_EHS_REPORT_INCIDENT_SRV). Get it from your SAP API portal account — **keep it in `.env.local` only, never in README, code, or git**. |
| `SAP_API_ENTITY_SET` | Optional, defaults to `A_Incident`. |

3. Restart the dev server (`npm run dev` reads env server-side at start).
4. Open **Operations → Incoming** — live records appear as intake candidates with a `SAP live` badge and real location data via `$expand=to_Location` (falls back automatically when the sandbox rejects it).

How it works:

- The browser only calls same-origin `/api/sap/*`. The Vite dev-server proxy (`server/sapProxy.ts`) attaches the `APIKey` header server-side.
- Service: `GET /sap/opu/odata/sap/API_EHS_REPORT_INCIDENT_SRV/A_Incident?$top=5&$format=json` (+ `$expand=to_Location` when accepted).
- `sapIncidentMapper.ts` normalises OData V2/V4 envelopes (including `/Date(...)/` payloads) into `SapIncidentReference`; missing fields become labelled demo defaults, never invented SAP data.
- Auto-intake (`AUTO_INTAKE_SAP`) merges live records over the seed, preserves already-linked history, and is idempotent across reloads. Sync failures keep the labelled demo fallback untouched.
- Analytics → SAP Integration panel shows connection state, last auto-sync, and the record table — status only, no manual actions.

Full details: `docs/SAP_INTEGRATION.md`.

## Scope (all phases complete)

- **Bus Contractor** (`/contractor`): overview with KPI cards, disruption report wizard with validation + draft autosave, incident detail + confirmed updates, demo-scenario prefill.
- **AT Operations** (`/operations`): KPI dashboard + needs-attention preview, incoming worklist with auto SAP intake, one-page severity + owner wizard, incident workspace (parallel recovery + comms tracks, timeline, SAP context, comms request), inline recovery editor, closure with root cause + corrective actions, reviews with stepper + add-corrective flow.
- **AT Customer Information** (`/comms`): KPI dashboard, communication queue with live timers, message composer with templates/preview/confirmation, publish + follow-up + correction-with-reason flows, published updates and template detail pages.
- Shared Fiori Horizon UI kit: `FioriButton` (one emphasized per view, all with icons), `DataTable` (sort + per-column filter + search + pagination), global search (incidents, reviews, SAP), per-incident unread tracking with New badges.
- One shared incident record across all roles (context + reducer, `localStorage` persistence, **Reset Demo**).

Route map: `/contractor`, `/contractor/report`, `/contractor/incident/:id`, `/operations`, `/operations/incoming`, `/operations/incident/:id`, `/operations/incident/:id/severity`, `/operations/incident/:id/close`, `/operations/reviews`, `/operations/reviews/:id`, `/operations/analytics`, `/comms`, `/comms/queue`, `/comms/incident/:id`, `/comms/published`, `/comms/published/:id`, `/comms/templates`, `/comms/templates/:kind`. Legacy `/operations/recovery` and `/operations/sap/:sapId` redirect into the workspace flow.

## Docs

- `AGENTS.md` — agent rules and architecture
- `PLAN.md` — phased implementation plan
- `docs/PRODUCT_REQUIREMENTS.md` — what the app must do
- `docs/DEMO_SCENARIO.md` — the end-to-end demo script
- `docs/SAP_INTEGRATION.md` — SAP API, auto-intake, and failure handling
- `design/` — approved UI screens (workflow reference)
