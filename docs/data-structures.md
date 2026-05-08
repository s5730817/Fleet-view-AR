# Data Structures

This document describes the main domain entities and response shapes used by Fleet View AR. The clearest shared contract is the TypeScript model file `frontend/src/types/fleet.ts`, backed by the backend route and service layer.

## User and Session

### User

Core user fields used across the app:

- `id`
- `name`
- `email`
- `role`: `admin`, `manager`, or `engineer`
- depot association when relevant to team visibility, assignments, and tool scope

### Auth Session

The auth flow is two-step:

1. `POST /api/auth/login` validates email/password and returns a `requires2FA` challenge.
2. `POST /api/auth/verify-2fa` returns:
   - `token`: Bearer token for protected API calls
   - `user`: signed-in user payload

## Fleet Hierarchy

### Bus

The `Bus` object is the main aggregate used by the dashboard and the bus detail page.

Key fields:

- `id`, `name`, `plateNumber`
- `depotId`, `depotName`
- `status`: `Good | Requires Attention | Out Of Operation`
- `mileage`, `year`, `model`
- `lastServiceDate`, `nextServiceDate`
- `issueIndicator`: summary of open and in-progress issues
- `componentIndicator`: aggregate component health summary
- `serviceIndicator`: upcoming or overdue service state
- `components`: array of bus parts/components

Relationship summary:

- one bus has many components
- one bus has many issues
- one bus can expose a bus-scoped AR context

### Bus Component

The `BusComponent` object represents a physical subsystem such as an engine or brake assembly.

Key fields:

- `id`, `code`, `name`, `icon`
- `markerCode`: AR marker identifier for this part within the current bus context
- `status`: human-readable status shown in the UI
- `statusState`: normalized display state
- `conditionState` and `conditionLabel`
- `lifecycleState` and `lifecycleLabel`
- `maintenanceIndicator`: due/overdue service state
- `activeIssueCount`, `inProgressIssueCount`
- `lastRepair`, `lastService`, `lastReplacement`, `lastInspected`
- `history`: maintenance and issue timeline
- `arInstructions`: text used in the AR workflow

### Service and Issue Indicators

The frontend uses normalized indicator objects so list and detail views can render consistent state:

- `BusIssueIndicator`
  - `state`: `none | open_reports | needs_fix | under_repair`
  - `label`
  - `activeCount`, `inProgressCount`
- `BusServiceIndicator`
  - `state`: `ok | due_soon | due_today | overdue | unscheduled`
  - `label`
  - `dueDate`, `daysUntilDue`
  - boolean flags such as `isDueSoon` and `isOverdue`
- `BusComponentIndicator`
  - aggregate counts for attention-needed components, replacements, overdue work, and open reports

## Faults and Maintenance History

### Fault / Issue

Faults represent reported issues against a part or bus context.

Common fields used in API tests and AR payloads:

- `id`
- `title`
- `description`
- `priority`: `low | medium | high`
- `status`: typically `reported`, `in_progress`, `awaiting_approval`, or `resolved`
- `source`: for example an AR-originated report
- related part or bus identifiers
- assignment details when routed to a technician

### Fault Update

Issue history is tracked as updates on a fault.

Common fields:

- `id`
- `update_type`: `comment`, `status_change`, `sign_off`, `progress`, or related workflow event
- `description`
- `created_by`
- `status_from`, `status_to` when the update records a transition

### Maintenance Entry

The `MaintenanceEntry` structure represents work performed on a bus component.

Key fields:

- `id`
- `date` / `createdAt`
- `type`: `service | repair | replacement | issue | comment | status_change | sign_off | progress`
- `description`
- `technician`
- `notes`

Maintenance history is attached to a component. Depending on the operation, it may also change issue state or component condition.

## Jobs, Team, and Notifications

### Job

Jobs are user-scoped work items surfaced through `/api/jobs`.

The project structure shows these relationships:

- jobs are assigned to users
- job visibility is filtered by the authenticated user
- job state contributes to dashboard and notification summaries

### Team Member

Team data supports:

- depot-scoped assignment lists
- self-assignment for admin/manager users when needed
- user-based technician attribution instead of free-text names

### Notification

Notifications are derived rather than stored as a full durable event stream.

Current behavior:

- generated from fleet state, jobs, issues, and a system item
- read/unread state is tracked per authenticated user in memory
- no database table currently persists notification state across server restarts

## AR-Specific Structures

### Bus AR Context

`BusARContext` is the main AR payload returned by the backend for a specific bus.

Top-level shape:

- `bus`
  - `id`, `name`, `plateNumber`, `depotId`, `depotName`, `status`
- `parts`: array of AR-visible bus parts
- `assignableUsers`: users available for issue assignment in that depot context
- `tools`: depot tool markers visible in AR

### AR Bus Part

`ARBusPart` extends the normal component view with AR-specific issue guidance:

- `id`, `code`, `name`, `markerCode`, `icon`
- component health and lifecycle fields
- `arInstructions`
- `issueTypeOptions`: valid issue templates for that part
- `activeIssues`: current issues affecting that part

### AR Issue Type Option

These templates drive the in-AR reporting workflow.

Key fields:

- `id`, `key`, `label`, `summary`
- `priority`
- `recommendedAction`: usually `repair` or `replacement`
- `guide`

### AR Guide

The guide object contains structured help for engineers:

- `title`
- `recommendedAction`
- `steps`
- `requiredToolTypes`

### AR Tool Marker

Depot tools visible in AR are represented by:

- `id`
- `name`
- `markerCode`
- `status`: such as `available`, `in_use`, or `awaiting_return`
- `depotName`

## Offline Queue Structures

The offline layer keeps pending work in a local operation queue managed by `SyncStatusContext` and the offline store.

The queue tracks:

- pending operations waiting for sync
- operations that require manager review
- per-bus pending/review counts
- last sync time and local resolution notes

This queue is used for a controlled subset of writes rather than full offline parity.
