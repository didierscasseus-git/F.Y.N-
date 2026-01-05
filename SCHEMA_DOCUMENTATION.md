# F.Y.N Timing OS - Database Schema Documentation

## Version: 1.0.0

## Database: PostgreSQL

## PRD Compliance: DATA_MODEL_V1

---

## Schema Overview

The database implements all entities specified in the PRD with the following domains:

1. **Guest Domain** - Customer profiles, preferences, allergies, visits
2. **Operations Domain** - Reservations, waitlist, tables, state tracking
3. **Inventory & Menu Domain** - Menu items, ingredients, stock, 86 events
4. **Staff Domain** - Staff members with RBAC
5. **Analytics Domain** - Event tracking for analytics
6. **AR Domain** - 3D scanning and spatial mapping
7. **Audit Domain** - Append-only audit log

---

## Migration Files

### 001_create_guest_domain.sql

Creates guest-related tables with soft-delete and retention policy support.

**Tables:**

- `guest_profiles` - Main guest records with encryption support
- `guest_preferences` - Seating, menu, and service preferences
- `guest_allergies` - Allergen tracking with severity levels
- `guest_visits` - Historical visit records with spend tracking

**Features:**

- Soft delete via `deleted_at` timestamp
- Retention policy: INDEFINITE (default) or REQUEST_DELETE
- Opt-out flag for guests who don't want data stored
- Encrypted PII fields (phone_number, email)

### 002_create_operations_domain.sql

Creates operational tables for reservations and table management.

**Tables:**

- `reservations` - Booking records with status tracking
- `waitlist_entries` - Walk-in waitlist management
- `tables` - Physical table definitions with state
- `table_state_events` - Append-only state change history

**Features:**

- State machine enforcement via CHECK constraints
- AI suggestion tracking with confidence scores
- Manual override with actor tracking
- POS integration support

### 003_create_inventory_domain.sql

Creates inventory and menu management tables.

**Tables:**

- `menu_items` - Menu offerings with pricing
- `inventory_items` - Stock tracking with units
- `menu_item_ingredients` - Many-to-many with quantities
- `inventory_adjustments` - Append-only stock change log
- `eighty_six_events` - Append-only 86 event tracking

**Features:**

- Automatic 86 state tracking
- Stock level monitoring
- Ingredient versioning support
- Waste and restock tracking

### 004_create_staff_analytics_domains.sql

Creates staff and analytics tables.

**Tables:**

- `staff_members` - Staff profiles with RBAC
- `analytics_events` - Append-only event tracking

**Features:**

- Firebase Auth integration via `firebase_uid`
- Role-based access control
- Event correlation (staff, table, guest)
- JSONB data storage for flexible analytics

### 005_create_ar_domain.sql

Creates AR scanning and spatial mapping tables.

**Tables:**

- `ar_scans` - Scan session metadata
- `ar_models` - 3D model files and versions
- `ar_anchors` - Table-to-model spatial mapping

**Features:**

- Multi-format support (USDZ, GLB, OBJ)
- Model versioning with single active model constraint
- 4x4 transformation matrix storage
- LiDAR and photogrammetry support

### 006_create_audit_log.sql

Creates append-only audit log.

**Tables:**

- `audit_logs` - Complete system audit trail

**Features:**

- Append-only enforcement via triggers
- No updates or deletes allowed
- IP and user agent tracking
- JSONB field change tracking
- Helper function for easy logging

---

## Indexes Summary

### Performance Indexes

- Guest lookups by phone/email
- VIP guest filtering
- Table state queries
- Waitlist active entries
- Inventory stock levels
- Analytics time-series queries

### Referential Integrity

All foreign keys enforced with appropriate cascades:

- CASCADE for dependent data (preferences, allergies)
- RESTRICT for critical references (audit trail)
- SET NULL for optional references (soft deletes)

---

## Key Features

### Soft Delete Support

Tables supporting soft delete:

- `guest_profiles` (via `deleted_at`)

Soft-deleted records excluded from active indexes.

### Append-Only Tables

Tables that cannot be modified or deleted:

- `audit_logs`
- `table_state_events`
- `eighty_six_events`
- `inventory_adjustments`
- `analytics_events`

### Updated Timestamp Triggers

Auto-updating `updated_at` on:

- `guest_profiles`, `guest_allergies`
- `reservations`, `waitlist_entries`, `tables`
- `menu_items`, `inventory_items`
- `staff_members`
- `ar_scans`, `ar_anchors`

### Data Retention Policies

**guest_profiles.retention_policy:**

- `INDEFINITE` (default) - Retain forever unless guest requests deletion
- `REQUEST_DELETE` - Guest has requested deletion

**guest_profiles.opt_out:**

- `FALSE` (default) - Normal data collection
- `TRUE` - Guest has opted out of data collection

---

## Constraints and Validations

### Check Constraints

All enum-like fields enforced via CHECK constraints:

- Guest retention policies
- Preference categories
- Allergy severities
- Reservation statuses and sources
- Waitlist statuses and priorities
- Table states
- State event sources
- Menu item statuses
- Inventory item statuses
- Staff roles
- Audit log roles and actions
- AR scan statuses and methods
- AR model formats

### Unique Constraints

- Table names (must be unique)
- Staff Firebase UIDs
- Only one active AR model at a time

---

## Migration Execution

Run migrations using:

```bash
npm run migrate
```

Or via TypeScript:

```typescript
import { runMigrations } from './src/db/migrations';
await runMigrations();
```

Migrations are tracked in `schema_migrations` table and executed in order.

---

## Stack Lock Compliance

✅ **Database:** PostgreSQL
✅ **All PRD entities implemented**
✅ **Referential integrity enforced**
✅ **Audit logging enabled**
✅ **Retention policies supported**

---

## Notes

1. **PII Encryption**: `phone_number` and `email` fields marked for encryption at application layer
2. **POS Integration**: `active_order_id` supports external POS system references
3. **AI/ML Ready**: JSONB fields for evidence and metadata support flexible AI workflows
4. **Time-series Optimized**: Indexes on timestamp columns for analytics queries
5. **Scalability**: Connection pooling configured in connector layer
