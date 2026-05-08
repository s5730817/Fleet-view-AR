# User Stories

This document translates the current implementation into product-facing user stories. The stories are grouped by role and by the workflows that appear in the frontend routes and backend APIs.

## Engineer Stories

### Authentication and Session

- As an engineer, I can sign in with my email and password, complete a 2FA step, and receive a session token for the protected application.
- As an engineer, I can reopen the app in supported offline scenarios if I previously authenticated online on the same device and my offline session is still valid.

### Fleet and Issue Reporting

- As an engineer, I can open the dashboard and navigate to a specific bus.
- As an engineer, I can inspect a bus's components, maintenance indicators, and recent history from the bus detail page.
- As an engineer, I can report a new fault against a bus part with a title, description, priority, and source.
- As an engineer, I am auto-assigned to issues that I report instead of manually choosing an assignee.
- As an engineer, I can add issue updates such as comments, progress notes, and sign-off entries.

### Maintenance Execution

- As an engineer, I can log service, repair, and replacement work against a component history timeline.
- As an engineer, I can record technician attribution through my user identity instead of relying on free-text names.
- As an engineer, I can keep working through a selected subset of offline-safe writes and let the app sync them later.

### AR Workflow

- As an engineer, I can launch AR for a specific bus and see bus-scoped parts rather than a global part catalog.
- As an engineer, I can scan a part marker and view issue-type options, repair guidance, active issues, and required tool hints.
- As an engineer, I can use AR to create issue reports that link back to the relevant bus part.

### Jobs and Notifications

- As an engineer, I can view my assigned jobs from the jobs page.
- As an engineer, I can review notifications derived from faults, jobs, and fleet state.

## Manager Stories

### Operational Oversight

- As a manager, I can review dashboard and summary metrics that reflect fleet health, service state, and job progress.
- As a manager, I can inspect bus detail views to understand which components need attention or are out of operation.

### Assignment and Review

- As a manager, I can assign or reassign reported issues to depot staff.
- As a manager, I can review offline-synced work items that require manager attention before they are considered resolved.
- As a manager, I can read sign-off notes and status transitions attached to an issue history.

### Offline Depot Use

- As a manager, I can prepare the offline working set while online, then continue using supported read and write workflows when connectivity drops.
- As a manager, I can monitor pending and review-required offline operations per bus.

### Team and Tools

- As a manager, I can view the depot team context used for issue assignment.
- As a manager, I can check depot tool visibility through the tool tracker and AR context.

## Admin Stories

### System Administration

- As an admin, I can access the same protected fleet, issue, summary, team, and notification surfaces as other authenticated users.
- As an admin, I can manage or inspect team-level data and assign work when necessary.
- As an admin, I can assign work to myself when the depot assignment list needs to include the acting admin.

### Connectivity Expectations

- As an admin, I remain online-only and do not use the partial offline workflow intended for depot staff.

## Shared Device and Setup Stories

- As a field user, I can configure a device for HTTPS access so camera and AR features work over a secure origin.
- As a field user, I can trust the local development CA on a laptop or phone and then connect over LAN to prepare an offline session.
- As a user on a local demo stack, I can run the system either in mock mode or against PostgreSQL-backed data.

## System-Level Workflow Summary

The implemented product flows combine into a simple lifecycle:

1. A user signs in through password + 2FA.
2. The user opens the dashboard or jumps to a bus.
3. The user inspects components, issues, and maintenance state.
4. The user reports faults, logs maintenance, or uses AR for part-scoped guidance.
5. Managers or admins review assignments, summaries, and notifications.
6. Supported offline operations sync back when connectivity returns.
