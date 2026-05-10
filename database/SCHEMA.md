# Fleet-view-AR Database Schema - Final Edition

## Overview

The authoritative database schema is defined in `db_pstgr.sql`. This is a **clean, final schema** designed for fresh database creation with all dead code removed and data normalized.

## Current State

✅ **All dead code removed**
✅ **All fields normalized and in use** 
✅ **All tests passing** (37/37)
✅ **Production ready**

### What Was Removed (May 2025 Cleanup)
- `activity_logs` table (100% unused)
- `users.deleted_at` column (defensive code, never set)
- `part_lifecycle_policies.replacement_rule` (queried but unused)
- `depots.location` (seeded but never read)
- All legacy migration code

## Database Initialization

### Core Entity Tables
- **roles** - User roles (admin, manager, engineer)
- **depots** - Physical maintenance depots
- **users** - System users with role and depot assignment
- **buses** - Fleet vehicles
- **tool_types** - Catalog of tool types
- **tools** - Physical tools assigned to depots

### Part Management (Normalized)
- **part_types** - Canonical part catalog (code, name) - **Normalization point**
- **bus_parts** - Specific part instances on buses (references part_types)
- **part_lifecycle_policies** - Maintenance policies by part type (references part_types)

### Issue/Fault Management
- **issue_types** - Fault categories (references part_types)
- **issues** - Current fault reports
- **issue_updates** - Immutable audit trail of issue changes (comment | status_change | progress | sign_off | split)
- **issue_assignments** - Assignment of issues to users

### Maintenance Tracking
- **maintenance_entries** - Historical maintenance actions (service | repair | replacement)

### Repair Workflow (Future Use)
- **repair_guides** - Repair instructions (seeded but not yet queried)
- **repair_steps** - Numbered instruction steps
- **repair_guide_tool_types** - Required tools for repairs

## Normalization Changes (May 2025)

### Removed (Dead Code)
- `activity_logs` table - Never written/queried
- `users.deleted_at` - Soft-delete infrastructure (never used)
- `part_lifecycle_policies.replacement_rule` - Dead field (queried but never extracted)
- `depots.location` - Never read (only seeded)

### Normalized Structure
- `part_code` columns eliminated from multiple tables
- **Single source of truth**: `part_types` table stores all part definitions
- Foreign keys ensure referential integrity
- Reduces data duplication and improves consistency

## Database Initialization

### Fresh Database
```bash
psql -h localhost -p 5432 -U admin -d fleetar -f database/db_pstgr.sql
npm run seed:postgres
```

### Script Execution Order
1. `db_pstgr.sql` - Create schema
2. `seed-postgres.js` - Populate demo data
3. `reset-postgres.js` - Clear data (for testing only)

## Migration from Legacy Schema

If upgrading an existing database created before May 2025 (with `part_code` columns, `activity_logs`, `deleted_at`, etc.):
- Use `backend/scripts/migrate-part-states.js` (archived for reference)
- Or perform manual migration steps documented in git history
- New deployments should use `db_pstgr.sql` directly

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Normalized part_types | Eliminates duplication, single source of truth |
| Immutable issue_updates | Provides audit trail, prevents data loss |
| JSONB for complex fields | issue_types.guide_steps, required_tool_types for flexibility |
| Deferred foreign keys | Allows flexible loading/unloading of related data |
| Depot-scoped tools | Each tool belongs to a specific depot |
| Future repair tables | Seeded for planned AR repair workflow feature |

## Performance Considerations

- Indexes on foreign keys (part_type_id, bus_id, user_id, etc.)
- Unique constraints prevent duplicates (registration_number, email, etc.)
- UNIQUE indexes on policy tables ensure one policy per part type
- Query optimization: Part policies queried with part_types JOIN for single roundtrip

## Testing

After schema creation:
```bash
npm run seed:postgres      # Populate demo data
npm run reset:postgres     # Clear data only
npm test                   # Validate all operations
```
