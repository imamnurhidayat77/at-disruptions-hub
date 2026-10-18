# Demo Scenario — Route 70 (INC-1043)

## Purpose

Provide one deterministic end-to-end scenario for development, testing
and presentation. This script is the acceptance test for the prototype:
if it runs cleanly in under five minutes, the build is demo-ready.

The staged version below runs in **2:30 with three presenters, strictly
sequential** (no back-and-forth): IMAM (Steps 1–3, 1:05) → MUSA
(Steps 4–6, 1:15) → DOHYUN (Steps 7–8, 0:10). One laptop, handed over
twice, each presenter speaking only their own block.

## Canonical Test Data

| Field | Value |
|---|---|
| Incident ID | `INC-1043` |
| Route | 70 |
| Location | Newmarket (near Newmarket interchange) |
| Disruption type | Vehicle breakdown |
| Operator | City Bus Operator (Contractor role) |
| Detected / onset | 09:02 NZDT |
| Estimated delay | 25 minutes |
| Passenger impact | High |
| Major interchange affected | Yes |
| Severity (expected) | HIGH (system-recommended, Operations confirms) |
| Owner | Sarah Chen (AT Operations) |
| Comms channels | AT Mobile App, Website (prototype labels) |
| Root cause | Vehicle mechanical failure |
| Corrective action | Review operator early-notification procedure |
| Corrective owner | Any roster owner, e.g. Sarah Chen |
| KPI target | First passenger publication ≤ 10 min after confirmation |

> Design PNGs show illustrative IDs (`BUS-2026-0142`, Dominion Road).
> Those are visual placeholders — the runnable demo always uses INC-1043
> / Route 70 / Newmarket.

## Starting State

- Role: Bus Contractor.
- Incident: not yet reported (fresh/reset demo state). Note: opening
  Operations → Incoming auto-creates incidents from SAP intake (live
  `VALIDATED` records, or `CLOSED` demo archives without credentials) —
  this does not affect the canonical INC-1043 contractor flow below.
- Disclosure: footer bar (`AT Disruption Hub · All times NZDT`), per-dialog
  demo disclaimers on publish/close/confirm actions, and Live/Demo badges
  on SAP-sourced data; all times NZDT.

---

## Scenario Script (staged: IMAM → MUSA → DOHYUN, 2:30 total)

Setup: Reset Demo done, role = Bus Contractor, Contractor Overview on
screen. Timer starts on IMAM's first line.

### IMAM — Step 1 Report (0:00–0:30, BUS CONTRACTOR)

1. "Route 70, broken down at Newmarket" — open **Report Disruption**.
2. Use demo values, type a one-line description (min. 10 characters).
3. Submit to AT.

**Expected:** `INC-1043` created with `operationalStatus = REPORTED`;
timeline shows `09:02 — Operator submitted initial disruption
notification`; INC-1043 appears in the AT Operations incoming queue.

### IMAM — Step 2 Validate (0:30–0:50, AT OPERATIONS)

4. Switch role to **AT Operations** (data preserved).
5. Open INC-1043 from the incoming queue; **Accept & Assess** the
   notification (`REPORTED → VALIDATED`, `confirmedAt`
   recorded — KPI clock starts).

### IMAM — Step 3 Assess and assign (0:50–1:05, AT OPERATIONS)

6. Complete the one-page assessment wizard: Step 1 confirms the
   system-recommended **HIGH** with contributing factors shown (25-min
   delay, high impact, interchange affected) and a recommended action;
   Step 2 assigns owner **Sarah Chen** (no override needed for the
   scripted run). Workspace opens with the KPI timer running.
7. Hand over the laptop: "Over to Musa."

**Expected:** severity HIGH + owner visible; timeline records each
Operations action with actor + timestamp.

### MUSA — Step 4 Recover and inform (1:05–1:25, OPERATIONS · CUSTOMER INFO)

8. State the parallel tracks (recovery checklist on one side, comms
   `REQUIRED` on the other), then switch role to **Customer
   Information** and open the communication queue: INC-1043 listed as
   `REQUIRED` with the countdown running.

### MUSA — Step 5 Publish (~1:25–1:50, CUSTOMER INFORMATION)

9. Open the composer: pre-filled template derived from incident data,
   e.g. *"Route 70 services are currently experiencing delays near
   Newmarket due to a vehicle breakdown. Please allow additional travel
   time while we work with the operator to restore normal services."*
10. Change nothing, keep channels (**AT Mobile App**, **Website**),
    preview, then **Approve & Publish** via the confirmation dialog.
11. Publish at ~09:07–09:08.

**Expected:** `communicationStatus = PUBLISHED`, `firstPublishedAt`
recorded; timer stops with elapsed time (e.g. `8 min from confirmation`,
**< 10 min**); audit event recorded; dashboard KPIs update from the
timestamps (nothing hard-coded).

### MUSA — Step 6 Restore and review (1:50–2:20, AT OPERATIONS)

12. Switch back to **AT Operations**; open INC-1043. Read-only comms
    panel shows `Passenger Notice — Published`, `Target — Met`;
    recovery checklist is untouched by the role switch.
13. Tick all recovery tasks, enter the actual restoration time,
    **Complete Recovery** (`RESTORED`).
14. Record root cause `Vehicle mechanical failure`, keep **Review
    required = Yes** (mandatory for HIGH), keep the default corrective
    action (`Review operator early-notification procedure`), owner
    **Sarah Chen** (or any roster owner).
15. **Close incident** via the confirmation dialog
    (`CLOSED`; dialog notes closure does not remove follow-up actions).
16. Open **Reviews** (`/operations/reviews/:id`): **Start review**, mark
    the corrective action done — the review completes automatically.
    Hand over the laptop.

**Expected:** closed record retains timeline, publication evidence and
the corrective action; completing the review leaves the stepper showing
all steps done.

### DOHYUN — Step 7 Overview KPIs (2:20–2:25, AT OPERATIONS · OVERVIEW)

17. Show Operations Overview: active incidents, average first
    communication, share within target — all derived from timestamps.

### DOHYUN — Step 8 Analytics (2:25–2:30, AT OPERATIONS · ANALYTICS)

18. Show Analytics: performance by severity, where delays concentrate.
    Close: "One record, three roles."

---

## Demo Success Criteria

- [ ] Same INC-1043 visible across all three roles; no re-creation
      between role changes.
- [ ] Single laptop handoff IMAM → MUSA → DOHYUN with no back-and-forth;
      each presenter speaks only their own block, total ≤ 2:30.
- [ ] Severity HIGH recommended and confirmed; override path (with
      mandatory reason) exists even though unused in the scripted run.
- [ ] First communication time derived from `confirmedAt → 
      firstPublishedAt` and shown as **< 10 minutes / Target met**.
- [ ] Operations sees published comms status immediately after role switch.
- [ ] Recovery and communication visibly progress in parallel.
- [ ] Restoration timestamp, root cause, review flag and corrective
      action persist after closure.
- [ ] Full run completes twice consecutively from reset without manual
      data repair, with no blocking console errors.
- [ ] Footer disclosure, per-dialog demo disclaimers, and SAP Live/Demo
      badges are visible where applicable.
