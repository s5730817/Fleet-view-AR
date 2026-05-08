# Fleet View AR

Fleet View AR is a fleet-maintenance application with a React + Vite frontend, an Express API backend, AR-assisted inspection flows, and an optional PostgreSQL-backed runtime.

Most project documentation now lives in the `docs/` folder:

- [docs/index.md](./docs/index.md): documentation index.
- [docs/running-the-project.md](./docs/running-the-project.md): install and run instructions for Linux, macOS, and Windows.
- [docs/project-components.md](./docs/project-components.md): main frontend, backend, database, AR, and offline components.
- [docs/data-structures.md](./docs/data-structures.md): core entities and payload shapes.
- [docs/user-stories.md](./docs/user-stories.md): role-based product workflows.
- [docs/postgres-ar-setup.md](./docs/postgres-ar-setup.md): PostgreSQL and AR quick-reference notes.

4. Start the backend so the frontend can reach `http://<server-ip>:5000` or your configured API URL.

5. On the device, open:

```text
https://<LAN-machine-IP>:8080
```

6. While still online on that LAN:

- log in as `manager` or `tech`
- wait for the dashboard to finish loading
- open the buses you need for the session
- open AR for the bus you want if you plan to use AR offline

7. After that preload step, you can disconnect from Wi-Fi and continue using the offline-safe parts of the app.

### What should work after disconnecting

- fleet overview for the visible depot scope
- bus detail for cached buses
- jobs list
- summary data
- AR for buses whose AR context was cached during preload
- offline-safe queued actions such as issue logging, comments, status progression, maintenance logs, and AR approval/fix flows

### What will not work offline

- login on a fresh device that has never authenticated online
- admin workflows
- actions that require fresh server truth and are intentionally blocked with `Offline, can not proceed`
- buses or AR contexts that were never cached on that device before disconnecting

## Demo Login Accounts

These accounts work in both mock mode and seeded PostgreSQL mode:

- `admin@test.com` / `password123`      - System Admin/office based
- `manager@test.com` / `password123`    - Maintanance Crew Manager/field+office based
- `tech1@test.com` / `password123`      - Tech/field based
- `tech2@test.com` / `password123`      - Tech/field based

## Showcase Demo Cases

The PostgreSQL seed includes dedicated showcase buses with predictable registrations so you can demonstrate each workflow quickly:

- `DMO-100` `Showcase Good`: healthy bus, routine service on schedule, no active issues.
- `DMO-101` `Showcase Open Reports`: non-blocking open report, near-end-of-life component, and routine service due soon.
- `DMO-102` `Showcase Approval`: component maintenance due today/overdue with no issue, so AR `Approve` can reset the part.
- `DMO-103` `Showcase Routine Overdue`: bus-level routine service overdue while components remain otherwise healthy.
- `DMO-104` `Showcase Blocking Faults`: active blocking reported faults that drive `Needs a fix!` and put the bus out of operation.
- `DMO-105` `Showcase Under Repair`: in-progress and awaiting-approval repairs, plus a replacement-needed tyre case.
- `DMO-106` `Showcase Unscheduled Lifecycle`: routine maintenance unscheduled and parts beyond life / beyond-life-approved.

The same seed also marks a few depot tools as `in_use` or `awaiting_return` so tool-tracking states are visible in AR demos.

## Demo Route

If you need a compact presenter flow, use this order:

1. Log in as `manager@test.com` and open `DMO-100` to show the clean baseline state.
2. Open `DMO-101` to show non-blocking open reports, near-end-of-life attention, and due-soon maintenance.
3. Open `DMO-102`, launch AR as `tech1@test.com`, and use `Approve` on the due part to show maintenance reset without creating an issue.
4. Open `DMO-103` to show that routine bus service alone can move the vehicle to `Requires Attention`.
5. Open `DMO-104` to show blocking reported faults and why the bus is out of operation.
6. Open `DMO-105`, then switch to `tech2@test.com` in AR to show `Fix`, `Under Repair`, `Awaiting Approval`, and replacement-needed scenarios.
7. Open `DMO-106` to show `Routine unscheduled`, `beyond_expected_life`, and `beyond_life_approved` lifecycle cases.

## How To Use The App

1. Log in.
2. Open a bus from the fleet view.
3. Use the bus overview to inspect part status and history.
4. Launch AR from the bus detail page.
5. In manager mode, point at a bus-part marker and use `Report Issue`.
6. In mechanic mode, point at the same part to see the linked issue, guide, and required tools.

Any issue logged or updated in AR is reflected in the part history on the bus overview screen.

## Marker Ranges Used In Demo

- Bus-part markers use the shared `20-39` range on every bus
- Tool markers use the shared `500-520` range in every depot
- The `40-499` block is intentionally left empty as growth space so bus parts and tools do not intersect

### Bus part marker layout

Every bus reuses the same part marker IDs.

The unique identifier is:

- `bus license plate + marker id`

Current shared part markers:

- `20` Engine
- `21` Brakes
- `22` Tires
- `23` Battery
- `24` Suspension
- `25` Cooling System
- `26` Transmission
- `27` Electrical System

Formula:

`markerId = 20 + partIndex`

Examples:

- `BUS-4521 + 20` means Engine on Bus 1
- `BUS-4522 + 20` also means Engine, but on Bus 2
- `BUS-4521 + 25` means Cooling System on Bus 1
- `BUS-4538 + 27` means Electrical Systems on Bus 18

This keeps the physical marker set reusable across the fleet instead of consuming a new global marker block for every bus.

Current tool markers in each depot:

1. `500` Diagnostic Scanner
2. `501` Torque Wrench
3. `502` Wrench
4. `503` Drill
5. `504` Brake Caliper Tool
6. `505` Hydraulic Jack
7. `506` Battery Tester
8. `507` Coolant Pressure Tester
9. `508` Multimeter

See ./markers

### Indicator Logic

Fleet and part indicators are derived from live part condition, issue state, lifecycle state, and routine maintenance dates.

Bus status:

- `Good`: no component is blocking service and routine bus service is not overdue.
- `Requires Attention`: at least one component needs attention, or routine bus service is overdue, but no component is currently blocking service.
- `Out Of Operation`: at least one component is under repair, needs a fix or replacement, or needs replacement immediately.

Component status:

- `Good`: no blocking issues, not out of life, and no overdue component-specific inspection rule.
- `Requires Attention`: used for non-blocking risk such as overdue component inspection, open reports that do not force the part offline, or lifecycle drift that is not yet a hard stop.
- `Replacement Recommended`: the part is beyond expected life, but not yet in a blocking failure state.
- `Needs Fix or Replacement`: the part has a blocking condition state from active issues.
- `Needs Replacement!`: the part is both beyond expected life and in a blocking condition.
- `Under Repair`: there is an active issue already in `in_progress` or `awaiting_approval`.

Issue indicators:

- `No active issues`: no open issues are linked to the bus.
- `Needs a fix!`: there are active issues and at least one linked part is already in a blocking condition state.
- `Under repair`: at least one linked issue is in `in_progress` or `awaiting_approval`.

Routine maintenance indicators:

- `Routine unscheduled`: no next service date is set.
- `Routine due in N days`: next service date exists and is more than 7 days away.
- `Routine due today`: next service date is today.
- `Routine overdue`: next service date is in the past.

Component-specific maintenance indicators:

- These are only meaningful when a part has an inspection interval from lifecycle policy data.
- They are computed from `last_inspected_at + inspection_interval_days`.
- An overdue component inspection raises the component to `Requires Attention`, but does not by itself force the bus `Out Of Operation`.

Condition and lifecycle states used internally:

- Condition state is now `good`, `repair_needed`, or `replace_recommended`.
- Lifecycle state is `within_expected_life`, `near_end_of_life`, `beyond_expected_life`, or `beyond_life_approved`.
