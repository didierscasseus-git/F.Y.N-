# BUILD GUARDRAILS & MANIFEST
# STATUS: AUTHORITATIVE
# VERSION: 1.0.0

## 1. SYSTEM CONSTRAINTS
- **Deterministic Output Only**: All system responses and generated artifacts must be strictly derived from the PRD.
- **No Feature Creation**: No features, schemas, or logic shall be implemented unless explicitly defined in the PRD.
- **No Renaming**: Entity names (e.g., GuestProfile, TableStateEvent) are immutable and must match the PRD exactly.
- **No Merging**: Modules defined as distinct (e.g., Inventory vs. Menu) must remain architecturally distinct.
- **Logging**: All write operations to the filesystem or database must be logged.

## 2. ERROR POLICY
- **No Silent Failures**: All errors, exceptions, and invalid states must produce a visible alert or log entry.
- **Strict Validation**: Inputs failing validation (Section 12, Section 8B) must be rejected, not coerced.
- **Audit Requirement**: Any override of a system blockage (e.g., Manager overriding an 86 state) requires an audit log entry with `actorId`, `role`, `timestamp`, and `reasonCode`.

## 3. BUILD MANIFEST (AUTHORIZED SCOPE)
The following sections of the request context are authorized for implementation:
- **Core PRD**: Sections 1-15 (Product Definition to MVP Lock)
- **Extension 8A**: Interactive 3D Table Control System
- **Extension 8B**: Automatic Table Status Recognition
- **Extension 8C**: POS-Driven Table Behavior
- **Extension 10A**: Menu Item 86 (Eighty-Six) Logic
- **Extension 11A**: Add-86 Analytics

## 4. MODULE REGISTRY (IMMUTABLE ENTITIES)
The following entities are registered and must not be renamed or modified:

### Core Entities
- `GuestProfile`
- `GuestPreference`
- `GuestAllergy`
- `GuestVisit`
- `Reservation`
- `WaitlistEntry`
- `Table`
- `TableStateEvent`
- `MenuItem`
- `MenuItemIngredient`
- `InventoryItem`
- `InventoryAdjustment`
- `StaffMember`
- `AnalyticsEvent`
- `ARScan`
- `ARModel`
- `ARAnchor`

### Operational Engines
- **Table Interaction System**: ENABLED (Manual + AI Hints)
- **Table State Engine**: ENABLED (Strict Transitions)
- **Eighty-Six Engine**: ENABLED (Binary State: AVAILABLE / EIGHTY_SIXED)
- **Analytics Engine**: ENABLED (Operational + Sales + 86 Metrics)
- **AR Navigation**: ENABLED (Modular / Optional)

## 5. GENERATION PROTOCOL
- Any generation of code, UI, or schema requires the token `CREATE` (Case Sensitive, All Caps).
- All generated artifacts must cross-reference the specific PRD section they implement.
