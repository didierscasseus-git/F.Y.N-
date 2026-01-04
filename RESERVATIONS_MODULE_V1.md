# RESERVATIONS MODULE V1

# STATUS: AUTHORITATIVE

# VERSION: 1.0.0

## 1. ENTITY & LIFECYCLE

### 1.1 DATA STRUCTURE

- `id`: UUID
- `guestId`: UUID (Required Link to GuestProfile)
- `partySize`: Integer
- `reservationTime`: DateTime
- `durationEnum`: Enum (SHORT_60, STD_90, LONG_120)
- `status`: LifecycleState
- `notes`: String
- `tags`: List<String> (e.g., "Birthday", "Window")

### 1.2 LIFECYCLE STATE MACHINE

- **BOOKED**: Initial state.
- **ARRIVED**: Guest check-in at Host Stand.
- **SEATED**: Table assigned + Guest seated.
- **COMPLETED**: Meal finished / Paid.
- **CANCELLED**: Terminated before arrival.
- **NO_SHOW**: Missed grace period without contact.

### 1.3 TRANSITION RULES

- `BOOKED` -> `ARRIVED`: Manual Host Action.
- `ARRIVED` -> `SEATED`: Linked to Table Assignment.
- `BOOKED` -> `NO_SHOW`: Automated trigger after Grace Period.
- `ANY` -> `CANCELLED`: Manual or Guest Action.
- `SEATED` -> `COMPLETED`: POS "Check Closed" event or Manual.

---

## 2. BUSINESS LOGIC ENGINE

### 2.1 GRACE PERIOD MONITOR

- **Config**: `GRACE_PERIOD_MINUTES = 30` (User Override).
- **Logic**:
  - Periodic Job checks `BOOKED` reservations where `reservationTime + gracePeriod < NOW`.
  - Action: Update status to `NO_SHOW`.
  - Log: `System` actor, Reason: "Grace Period Exceeded".
  - Notification: Optional alert to Manager.

### 2.2 GUEST PROFILE LINKAGE (STRICT)

- A reservation **MUST** be linked to a valid `GuestProfile`.
- If a new guest walks in or calls, a `GuestProfile` (min: Name) must be created first or inline.

### 2.3 CANCELLATION

- **Guest-Facing**: Simple "One-Click" cancellation link via SMS/Email.
- **Staff-Facing**: Quick action on Host Dashboard.
- **Constraint**: Cancellation reason required for Staff actions (e.g., "Guest Called", "Mistake").

---

## 3. AUDIT & LOGGING

- **Creation**: Log Source (Web, Phone, Walk-in).
- **State Changes**:
  - `ARRIVED`: Log timestamp (Wait time calc start).
  - `SEATED`: Log table ID + timestamp (Wait time calc end).
  - `CANCELLED/NO_SHOW`: Log reason.
- **Edits**: Any change to Party Size or Time triggers a log entry and optional re-confirmation.

---

## 4. API / INTERFACE STUBS

```typescript
class ReservationService {
  async checkInGuest(reservationId: string, actor: StaffMember): Promise<void> {
    const res = await this.get(reservationId);
    
    if (res.status !== 'BOOKED') throw new Error("Invalid State");
    
    // Update State
    res.status = 'ARRIVED';
    res.arrivalTime = new Date();
    await this.save(res);

    // Audit
    await auditService.log({
      action: 'CHECK_IN_GUEST',
      entity: 'Reservation',
      entityId: res.id,
      actorId: actor.id,
      source: 'MANUAL'
    });
  }

  async runNoShowJob(): Promise<void> {
    const expired = await db.reservations.findExpired(30); // 30 min grace
    for (const res of expired) {
      res.status = 'NO_SHOW';
      await this.save(res);
      await auditService.log({
        actorId: 'SYSTEM',
        action: 'AUTO_NO_SHOW',
        entityId: res.id
      });
    }
  }
}
```
