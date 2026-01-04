# AUDIT LOG ENGINE V1

# STATUS: AUTHORITATIVE

# VERSION: 1.0.0

## 1. COMPONENT DEFINITION: AUDIT WRITER

The `AuditLogWriter` is a singleton service responsible for persisting immutable audit records to the `AuditLog` table/collection. It MUST be invoked synchronously or reliably asynchronously (guaranteed delivery) for every critical state mutation.

### 1.1 LOG SCHEMA MAPPING

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique Log ID |
| `timestamp` | ISO8601 | Server-side clock time |
| `actorId` | String | User ID or 'SYSTEM' or 'POS' |
| `role` | Enum | The role authority used for the action |
| `action` | Enum | CREATE, UPDATE, DELETE, VIEW (Sensitive), OVERRIDE |
| `entity` | String | e.g., 'GuestProfile', 'Table', 'MenuItem' |
| `entityId` | UUID | ID of the mutated record |
| `beforeState` | JSON | Snapshot before change (Null for Create) |
| `afterState` | JSON | Snapshot after change (Null for Delete) |
| `source` | Enum | MANUAL, POS, AI_SUGGESTED, AI_AUTO |
| `reasonCode` | String | Required for Overrides |

### 1.2 SCOPE OF LOGGING (MANDATORY)

1. **Guest Data**: Profile edits, PII access, Allergy updates/views.
2. **Operations**: Table state changes, Reservation modifications.
3. **Menu/Inv**: Ingredient changes, Stock adjustments, **86/Un-86 events**.
4. **System**: Login/Logout, Role changes.
5. **POS**: All ingested POS events.

---

## 2. QUERY INTERFACE (MANAGER/ADMIN)

### 2.1 ACCESS CONTROL

- **Reader**: `AuditLogReader` service.
- **Permission**: Strict `MANAGER` or `ADMIN` role required. `STAFF` cannot view logs.

### 2.2 QUERY FILTERS

The interface must support filtering by:

- Time Range (Start/End)
- Actor (Staff ID)
- Entity Type (e.g., "Show all table changes")
- Action Type (e.g., "Show all OVERRIDES")
- Specific Entity ID

### 2.3 DATA RETENTION

- **Production**: Live queryable logs kept for minimum 90 days.
- **Archive**: Cold storage indefinite (unless purged by policy).

---

## 3. IMPLEMENTATION STUBS (PSEUDO-CODE)

```typescript
interface AuditRecord {
  actorId: string;
  role: Role;
  action: ActionType;
  entity: string;
  entityId: string;
  beforeState?: any;
  afterState?: any;
  source: SourceType;
  reasonCode?: string;
}

class AuditService {
  async log(record: AuditRecord): Promise<void> {
    // 1. Validate required fields
    if (!record.actorId || !record.action) throw new Error("Invalid Audit Record");
    
    // 2. Persist to storage
    await db.auditLogs.create({
      ...record,
      timestamp: new Date()
    });
  }

  async query(filters: AuditFilters, userRole: Role): Promise<AuditLog[]> {
    // 1. Enforce RBAC
    if (userRole !== Role.MANAGER && userRole !== Role.ADMIN) {
      throw new Error("Unauthorized: Audit Access Denied");
    }
    
    // 2. Execute Query
    return db.auditLogs.find(filters);
  }
}
```
