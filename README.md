# AT Disruption Hub

University functional prototype demonstrating an Integrated Disruption
Management Hub for Auckland Transport bus disruptions.

**Demo only — synthetic data, no live connections, not a production
Auckland Transport system.**

## Run

Requires Node 18+.

```sh
npm install
npm run dev      # local demo at http://localhost:5173
npm run build    # typecheck + production build
npm run preview  # serve the production build
npm run typecheck
```

## Scope (all phases complete)

- **Bus Contractor** (`/contractor`): overview, disruption report form with
  validation, incident detail + confirmed updates.
- **AT Operations** (`/operations`): KPI dashboard + filterable queue,
  incoming validation (starts the 10-min clock), severity assessment with
  mandatory override reason, owner assignment, recovery task board,
  restoration, closure with root cause + corrective actions.
- **AT Customer Information** (`/comms`): communication queue, message
  composer with live countdown, channel selection, preview, confirmation
  dialog, simulated publish that stops the KPI clock.
- One shared incident record across all roles (context + reducer,
  `localStorage` persistence, **Reset demo** on dashboards).
- No SAP integration: the adapter boundary reports the live source as
  unavailable with a visible retry/failure state; the demo continues on
  labelled synthetic data.

Route map: `/contractor`, `/contractor/report`, `/contractor/incident/:id`,
`/operations`, `/operations/incident/:id`, `/comms`, `/comms/incident/:id`.

## Docs

- `AGENTS.md` — agent rules and architecture
- `PLAN.md` — phased implementation plan
- `docs/PRODUCT_REQUIREMENTS.md` — what the app must do
- `docs/DEMO_SCENARIO.md` — the end-to-end demo script
- `design/` — approved UI screens (visual source of truth)
