# GUEST PROFILE MODULE V1

# STATUS: AUTHORITATIVE

# VERSION: 1.0.0

## 1. ENTITY SPECIFICATIONS

### 1.1 GUEST PROFILE

- **Mutability**:
  - `Guest` can edit their own `name`, `preferences`.
  - `Staff` can edit `notes`, `VIP status`, `preferences`.
- **Validation**:
  - Name cannot be empty.
  - Email/Phone must be valid formats (if provided).

### 1.2 GUEST ALLERGY

- **Sensitivity**: HIGH.
- **Visibility**:
  - Hidden from `Guest` (in public views) to prevent confusion/panic? -> *Correction based on RBAC*: Guest can write (provisional), but reading verified data is Staff-only context usually, though Guests obviously know their own allergies. PRD Rule: "Visible only to Server, Kitchen, Manager" implies operational view.
- **Consent**:
  - `hasConsent`: Boolean flag required for storage.
  - `consentTimestamp`: Date required.

---

## 2. CRUD OPERATIONS (INTERFACE)

### 2.1 CREATE / REGISTER

`POST /api/guest/register`

- **Inputs**: Name, Contact (Optional), Preferences.
- **Logic**: Creates `GuestProfile`. Logs `CREATE` event.

### 2.2 UPDATE PROFILE

`PATCH /api/guest/:id`

- **Auth**: Self (Guest) or Staff.
- **Logic**: Updates fields. Logs `UPDATE` with diff.

### 2.3 MANAGE ALLERGIES (CRITICAL)

`POST /api/guest/:id/allergy`

- **Auth**: Self (Provisional) or Staff.
- **Inputs**: Allergen, Severity, Consent=TRUE.
- **Constraint**: If `Consent` is false, REJECT.
- **Logic**: Creates `GuestAllergy`. Logs with HIGH priority.

### 2.4 RETRIEVE PROFILE

`GET /api/guest/:id`

- **Auth**: Self (Guest) or Staff.
- **Output Filter**:
  - If Guest: Returns Self Profile + Preferences. (No Internal Notes).
  - If Staff: Returns Full Profile + Visit History + Allergies + Notes.

---

## 3. CONSENT MANAGEMENT

Records of consent must be immutable for liability reasons.

**ConsentRecord**

- `guestId`: UUID
- `dataScope`: Enum (ALLERGY, MARKETING, RETENTION)
- `granted`: Boolean
- `timestamp`: DateTime
- `method`: String (Digital Form, Verbal Staff Input)

---

## 4. MODULE IMPLEMENTATION STUBS

```typescript
class GuestService {
  async addAllergy(
    guestId: string, 
    allergen: string, 
    consent: boolean, 
    actor: Actor
  ): Promise<void> {
    
    // 1. Enforce Consent
    if (!consent) throw new Error("Explicit consent required for allergy data");

    // 2. Create Record
    const allergyRecord = {
      guestId,
      allergen,
      addedBy: actor.id,
      timestamp: new Date()
    };

    // 3. Persist
    await db.guestAllergies.create(allergyRecord);

    // 4. Audit
    await auditService.log({
      actorId: actor.id,
      action: 'CREATE',
      entity: 'GuestAllergy',
      entityId: allergyRecord.id,
      source: 'MANUAL'
    });
  }
}
```
