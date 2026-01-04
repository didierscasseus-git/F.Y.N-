# WAITLIST MODULE V1

# STATUS: AUTHORITATIVE

# VERSION: 1.0.0

## 1. CORE FUNCTIONALITY

### 1.1 DATA MODEL: WAITLIST ENTRY

- `id`: UUID
- `guestName`: String
- `phoneNumber`: String
- `partySize`: Integer
- `priority`: Enum (NORMAL, PRIORITY, VIP)
- `arrivalTime`: DateTime (Creation Time)
- `quotedWait`: Integer (Minutes)
- `status`: Enum (WAITING, NOTIFIED, SEATED, CANCELLED, NO_SHOW)
- `notes`: String

### 1.2 "ESTIMATE ONLY" PROTOCOL

- **System Constraint**: The system MUST NOT display guarantees.
- **UI Labeling**: All times displayed to Staff or Guests must be labeled "Est." or "Approx."
- **Calculation**:
  - `EstWait` = Function(ActiveTables, AvgTurnTime, QueueDepth, StaffLoad).
  - *This module handles the Queue logic; the ETA Algorithm is in the Timing Engine.*

---

## 2. WORKFLOWS

### 2.1 ADD WALK-IN

- **Actor**: Host.
- **Input**: Name, Size, Phone (Optional but recommended for SMS).
- **Logic**:
  - Appends to Queue.
  - Generates `AuditLog` (Action: WAITLIST_ADD).
- **VIP Handling**: If flagged `VIP` or `PRIORITY`, entry is conceptually "bumped" in sorting logic (weighted sort), but timestamp remains accurate for audit.

### 2.2 UPDATE STATUS

- **NOTIFY**: Triggers SMS (if configured). Updates State.
- **SEATED**: Converts to Table Assignment. Removes from Active Queue.
- **CANCELLED**: Guest leaves or calls off.
- **NO_SHOW**: Guest fails to return after Notification + Buffer.

### 2.3 AUDIT LOGGING

- **Critical Changes**:
  - Changing `quotedWait` (Did the host overpromise?).
  - Changing `priority` (Did someone cut the line?).
  - Deleting an entry (Anti-corruption).
- **Log Data**: `Actor`, `BeforeState`, `AfterState`, `Timestamp`.

---

## 3. IMPLEMENTATION STUBS

```typescript
class WaitlistService {
  async addToWaitlist(entry: CreateWaitlistDto, actor: StaffMember): Promise<WaitlistEntry> {
    const newEntry = {
      ...entry,
      id: uuid(),
      arrivalTime: new Date(),
      status: 'WAITING'
    };
    
    // Save
    await db.waitlist.create(newEntry);
    
    // Audit
    await auditService.log({
      action: 'WAITLIST_ADD',
      entity: 'WaitlistEntry',
      entityId: newEntry.id,
      actorId: actor.id,
      meta: { priority: entry.priority }
    });
    
    return newEntry;
  }
}
```
