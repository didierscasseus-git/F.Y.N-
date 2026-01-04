# TABLES AND STATES MODULE V1

# STATUS: AUTHORITATIVE

# VERSION: 1.0.0

## 1. TABLE STATE ENGINE

### 1.1 DATA MODEL

- **Table**: Static config (ID, Name, Capacity). Dynamic state (`currentState`, `activeOrderId`).
- **TableStateEvent**: Immutable ledger of all transitions.

### 1.2 THE STATE MACHINE (STRICT)

Allowed transitions are enforced by the engine. Silent state changes are **forbidden**.

| From State | To State | Allowed Roles | Notes |
| :--- | :--- | :--- | :--- |
| **Available** | Reserved, Seated | Host, Mgr | - |
| **Reserved** | Arrived, Seated | Host, Mgr | - |
| **Arrived** | Seated | Host, Mgr | - |
| **Seated** | Ordered, Available* | Server, Mgr | *Available if mistake |
| **Ordered** | Food In Prog | Server, Kitchen | Triggered by POS or Manual |
| **Food In Prog** | Food Served | Server, Kitchen | - |
| **Food Served** | Paying | Server, Mgr | - |
| **Paying** | Cleaning | Server, Mgr, Bus | - |
| **Cleaning** | Available | Host, Bus, Mgr | Cycle Complete |
| **ANY** | Out of Service | Manager, Admin | **Requires Reason Code** |

---

## 2. INTERACTION LAYER (3D / UI HOOKS)

### 2.1 MANUAL INPUT (TABLE CONTROL CARD)

When a user interacts with a table (via 3D Tap or 2D List):

1. **Get Context**: Retrieve `CurrentState`, `ActiveEvents` (Last 5).
2. **Determine Options**: Filter allowed `NextStates` based on `UserRole`.
3. **Submit Action**: `POST /api/table/:id/state` with `{ newState, reasonCode }`.

### 2.2 LOGGING PROTOCOL (EVENT GENERATION)

Every successful state change **MUST** generate a `TableStateEvent`.

**Event Structure**:

- `tableId`: UUID
- `previousState`: Enum
- `newState`: Enum
- `source`: MANUAL
- `actorId`: UUID
- `role`: String
- `timestamp`: DateTime
- `reasonCode`: String (Mandatory for 'Out Of Service' or overrides)

---

## 3. IMPLEMENTATION STUBS

```typescript
class TableStateEngine {
  
  async transition(
    tableId: string, 
    newState: TableState, 
    actor: StaffMember, 
    reason?: string
  ): Promise<void> {
    
    // 1. Fetch Current
    const table = await db.tables.get(tableId);
    
    // 2. Validate Transition
    if (!this.isValidTransition(table.currentState, newState, actor.role)) {
      throw new Error("Invalid Transition or Insufficient Permissions");
    }

    // 3. Persist State
    const oldState = table.currentState;
    table.currentState = newState;
    await db.tables.save(table);

    // 4. Log Event (Immutable)
    await db.tableEvents.create({
      tableId,
      previousState: oldState,
      newState,
      source: 'MANUAL',
      actorId: actor.id,
      role: actor.role,
      timestamp: new Date(),
      reasonCode: reason
    });
  }

  isValidTransition(from: State, to: State, role: Role): boolean {
    // Logic from Section 1.2 Matrix
    if (to === 'OUT_OF_SERVICE' && role !== 'MANAGER') return false;
    // ... strict checks
    return true;
  }
}
```
