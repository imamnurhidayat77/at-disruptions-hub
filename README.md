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

## Phase 1 scope (current)

- Three demo roles (Bus Contractor, AT Operations, AT Customer
  Information) with a role switcher in the top navigation.
- One shared incident record (INC-1043, Route 70, Newmarket) plus two
  background records; role switching preserves state (persisted to
  `localStorage` — use **Reset demo** on any page to restore the seed).
- Prototype severity recommendation and 10-minute KPI are derived from
  shared domain functions, not hard-coded.
- No SAP integration (the repository reports the service as unavailable
  and continues with labelled demo data).

Role workflows (report / assess / publish) arrive in Phases 2–4.

## Docs

- `AGENTS.md` — agent rules and architecture
- `PLAN.md` — phased implementation plan
- `docs/PRODUCT_REQUIREMENTS.md` — what the app must do
- `docs/DEMO_SCENARIO.md` — the end-to-end demo script
- `design/` — approved UI screens (visual source of truth)
