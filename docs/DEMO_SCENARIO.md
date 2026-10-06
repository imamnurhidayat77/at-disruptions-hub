# Demo Scenario — Route 70 (INC-1043)

## Purpose

Provide one deterministic end-to-end scenario for development, testing
and presentation. This script is the acceptance test for the prototype:
if it runs cleanly in under five minutes, the build is demo-ready.

## Canonical Test Data

| Field | Value |
|---|---|
| Incident ID | `INC-1043` |
| Route | 70 |
| Location | Newmarket (near Newmarket interchange) |
| Disruption type | Vehicle breakdown |
| Operator | Demo contractor account (Contractor role) |
| Detected / onset | 09:02 NZDT |
| Estimated delay | 25 minutes |
| Passenger impact | High |
| Major interchange affected | Yes |
| Severity (expected) | HIGH (system-recommended, Operations confirms) |
| Owner | Sarah Chen (AT Operations) |
| Comms channels | AT Mobile App, Website (prototype labels) |
| Root cause | Vehicle mechanical failure |
| Corrective action | Review operator early-notification procedure |
| Corrective owner | Operations Performance Manager |
| KPI target | First passenger publication ≤ 10 min after confirmation |

> Design PNGs show illustrative IDs (`BUS-2026-0142`, Dominion Road).
> Those are visual placeholders — the runnable demo always uses INC-1043
> / Route 70 / Newmarket.

## Starting State

- Role: Bus Contractor.
- Incident: not yet reported (fresh/reset demo state).
- Every screen shows `DEMO WORKSPACE · Synthetic data · No live
  connections`; all times NZDT.

---

## Scenario Script

### Step 1 — Contractor reports (09:02)

1. Select role **Bus Contractor**.
2. Open **Report disruption** (`Capture disruption`).
3. Enter: Route `70`, type `Vehicle breakdown`, location `Newmarket`,
   onset `09:02`, delay `25 min`, impact `High`, interchange `Yes`,
   plus a one-line description.
4. Submit to AT.

**Expected:** `INC-1043` created with `operationalStatus = REPORTED`;
timeline shows `09:02 — Operator submitted initial disruption
notification`; INC-1043 appears in the AT Operations incoming queue.

### Step 2 — Operations validates and assesses (09:03–09:05)

5. Switch role to **AT Operations** (data preserved).
6. Open INC-1043 from the incoming queue; validate/accept the
   notification (`REPORTED → VALIDATED/ACTIVE`, `confirmedAt`
   recorded — KPI clock starts).
7. Review the severity panel: system recommends **HIGH** with
   contributing factors shown (25-min delay, high impact, interchange
   affected) and a recommended action.
8. Confirm HIGH (no override needed for the scripted run); assign owner
   **Sarah Chen**.
9. Start recovery: mark `Operator contacted` and `Replacement vehicle
   requested` (`RECOVERY_IN_PROGRESS`).

**Expected:** severity HIGH + owner visible; timeline records each
Operations action with actor + timestamp.

### Step 3 — Customer Information publishes (~09:07, parallel track)

10. Switch role to **AT Customer Information** — *before* recovery
    finishes (proves parallel workflow).
11. Open the communication queue: INC-1043 listed as `REQUIRED`,
    timer counting down (e.g. `Not published · 07:00 left` style).
12. Open the composer: pre-filled template derived from incident data,
    e.g. *"Route 70 services are currently experiencing delays near
    Newmarket due to a vehicle breakdown. Please allow additional travel
    time while we work with the operator to restore normal services."*
13. Edit if needed, select channels (**AT Mobile App**, **Website**),
    preview, then **Approve & Publish** via the confirmation dialog
    (acknowledge "Demo publication only").
14. Publish at ~09:07–09:08.

**Expected:** `communicationStatus = PUBLISHED`, `firstPublishedAt`
recorded; timer stops; banner reads `Initial update published — target
achieved` with elapsed time (e.g. `8 min from confirmation`,
**< 10 min**); audit event recorded; dashboard KPIs update from the
timestamps (nothing hard-coded).

### Step 4 — Operations sees publication status

15. Switch back to **AT Operations**; open INC-1043.

**Expected:** read-only comms panel shows `Passenger Notice —
Published`, `Target — Met`, publication timestamp and channels.
Recovery checklist is untouched by the role switch.

### Step 5 — Restore, close, review (later, e.g. 09:42)

16. Operator confirms replacement vehicle on site (contractor update).
17. Operations marks **service restored** (`restoredAt` recorded,
    `RESTORED`).
18. Record root cause `Vehicle mechanical failure`, set **Review
    required = Yes**, add corrective action `Review operator
    early-notification procedure`, owner `Operations Performance
    Manager`, due date set.
19. **Close incident** via the confirmation dialog
    (`CLOSED`; dialog notes closure does not remove follow-up actions).

**Expected:** closed record retains timeline, publication evidence and
the open corrective action for the review screen.

---

## Demo Success Criteria

- [ ] Same INC-1043 visible across all three roles; no re-creation
      between role changes.
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
- [ ] Every screen carries the synthetic-data disclosure; publish/close
      dialogs carry the demo disclaimers.
