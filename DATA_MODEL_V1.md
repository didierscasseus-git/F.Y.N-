# DATA MODEL V1

# STATUS: AUTHORITATIVE

# VERSION: 1.0.0

## 1. CORE SYSTEM SCHEMAS

### 1.1 AUDIT & SECURITY

**AuditLog**

- `id`: UUID (Primary Key)
- `timestamp`: DateTime (Required)
- `actorId`: String (Reference: StaffMember.id or System)
- `role`: String (Enum: Guest, Host, Server, Kitchen, Manager, Admin, System)
- `action`: String (Create, Update, Delete)
- `targetEntity`: String (Entity Name)
- `targetId`: UUID (Reference: Entity.id)
- `fieldChanges`: JSON (OldValue, NewValue)
- `reasonCode`: String (Optional)
- `meta`: JSON (Contextual data)

---

## 2. GUEST DOMAIN

**GuestProfile**

- `id`: UUID (PK)
- `name`: String
- `phoneNumber`: String (Encrypted)
- `email`: String (Encrypted)
- `visitCount`: Integer (Default: 0)
- `lastVisit`: DateTime
- `vipStatus`: Boolean
- `optOut`: Boolean (Default: False)
- `retentionPolicy`: Enum (INDEFINITE, REQUEST_DELETE)
- `createdAt`: DateTime
- `updatedAt`: DateTime

**GuestPreference**

- `id`: UUID (PK)
- `guestId`: UUID (FK: GuestProfile.id)
- `category`: Enum (SEATING, MENU, SERVICE, OTHER)
- `preferenceValue`: String
- `note`: String

**GuestAllergy**

- `id`: UUID (PK)
- `guestId`: UUID (FK: GuestProfile.id)
- `allergen`: String
- `severity`: Enum (MILD, MODERATE, SEVERE, LIFE_THREATENING)
- `verifiedBy`: UUID (FK: StaffMember.id)

**GuestVisit**

- `id`: UUID (PK)
- `guestId`: UUID (FK: GuestProfile.id)
- `reservationId`: UUID (Optional FK)
- `timestamp`: DateTime
- `partySize`: Integer
- `spendAmount`: Decimal (POS-linked)
- `tableId`: UUID (Optional FK)

---

## 3. OPERATIONS DOMAIN

**Reservation**

- `id`: UUID (PK)
- `guestId`: UUID (FK: GuestProfile.id)
- `partySize`: Integer
- `reservationTime`: DateTime
- `durationMinutes`: Integer (Est.)
- `status`: Enum (BOOKED, ARRIVED, SEATED, COMPLETED, CANCELLED, NO_SHOW)
- `notes`: String
- `source`: Enum (PHONE, WEB, WALK_IN)
- `confirmationSent`: Boolean

**WaitlistEntry**

- `id`: UUID (PK)
- `guestName`: String
- `partySize`: Integer
- `phoneNumber`: String
- `arrivalTime`: DateTime
- `quotedWaitTime`: Integer (Minutes)
- `estimatedSeatingTime`: DateTime
- `status`: Enum (WAITING, NOTIFIED, SEATED, CANCELLED, NO_SHOW)
- `priority`: Enum (NORMAL, VIP, HIGH)

**Table**

- `id`: UUID (PK)
- `name`: String (e.g., "T12")
- `zone`: String
- `capacity`: Integer
- `isCombinable`: Boolean
- `isAccessible`: Boolean
- `currentState`: Enum (AVAILABLE, RESERVED, SEATED, ORDERED, FOOD_IN_PROGRESS, FOOD_SERVED, PAYING, CLEANING, OUT_OF_SERVICE)
- `stateUpdatedAt`: DateTime
- `activeOrderId`: UUID (Optional, POS Link)

**TableStateEvent**

- `id`: UUID (PK)
- `tableId`: UUID (FK: Table.id)
- `previousState`: Enum
- `newState`: Enum
- `source`: Enum (MANUAL, POS, AI_SUGGESTED, AI_AUTO)
- `actorId`: UUID (Optional FK: StaffMember.id)
- `timestamp`: DateTime
- `confidence`: Float (0.0 - 1.0, for AI)
- `evidence`: JSON (POS events, etc.)

---

## 4. INVENTORY & MENU DOMAIN

**MenuItem**

- `id`: UUID (PK)
- `name`: String
- `category`: String
- `price`: Decimal
- `prepTimeEstimate`: Integer (Minutes)
- `status`: Enum (AVAILABLE, EIGHTY_SIXED)
- `isTaxable`: Boolean

**MenuItemIngredient**

- `id`: UUID (PK)
- `menuItemId`: UUID (FK: MenuItem.id)
- `inventoryItemId`: UUID (FK: InventoryItem.id)
- `quantityRequired`: Float
- `unit`: String
- `isOptional`: Boolean

**InventoryItem**

- `id`: UUID (PK)
- `name`: String
- `currentStock`: Float
- `minimumSellableQuantity`: Float (Threshold)
- `unit`: String
- `status`: Enum (IN_STOCK, LOW, OUT)

**InventoryAdjustment**

- `id`: UUID (PK)
- `inventoryItemId`: UUID (FK: InventoryItem.id)
- `adjustmentAmount`: Float (+/-)
- `reason`: Enum (WASTE, RESTOCK, CORRECTION, POS_SALE)
- `actorId`: UUID (FK: StaffMember.id)
- `timestamp`: DateTime

---

## 5. STAFF & ANALYTICS

**StaffMember**

- `id`: UUID (PK)
- `name`: String
- `role`: Enum (HOST, SERVER, KITCHEN, MANAGER, ADMIN)
- `pinHash`: String
- `active`: Boolean

**AnalyticsEvent**

- `id`: UUID (PK)
- `eventType`: String (e.g., TABLE_TURN, 86_ITEM, REVENUE)
- `timestamp`: DateTime
- `data`: JSON
- `staffId`: UUID (Optional)

---

## 6. AR & SPATIAL DOMAIN

**ARScan**

- `id`: UUID (PK)
- `staffId`: UUID (FK: StaffMember.id)
- `timestamp`: DateTime
- `deviceMetadata`: JSON
- `status`: Enum (PENDING, PROCESSED, REJECTED, ACTIVE)
- `scanMethod`: Enum (LIDAR, PHOTOGRAMMETRY)

**ARModel**

- `id`: UUID (PK)
- `scanId`: UUID (FK: ARScan.id)
- `fileUrl`: String (Path to USDZ/GLB)
- `format`: Enum (USDZ, GLB, OBJ)
- `version`: Integer
- `isActive`: Boolean

**ARAnchor**

- `id`: UUID (PK)
- `modelId`: UUID (FK: ARModel.id)
- `tableId`: UUID (FK: Table.id)
- `transformMatrix`: Matrix4x4 (Position/Rotation/Scale)
- `confidence`: Float

---

## 7. RELATIONSHIP & INTEGRITY CONSTRAINTS

1. **Strict FK Integrity**: Deleting a `GuestProfile` cascades to `GuestPreference`, `GuestAllergy`. `GuestVisit` refers to `GuestProfile` but respects retention policy.
2. **Audit Requirement**: All `INSERT`, `UPDATE`, `DELETE` operations on any entity within GUEST, OPERATIONS, or INVENTORY domains must write a corresponding `AuditLog` entry.
3. **Table State**: `Table.currentState` updates must generate a `TableStateEvent`.
4. **Inventory**: `InventoryItem.currentStock` updates must generate an `InventoryAdjustment`.
5. **Privacy**: `GuestProfile` PII (Phone, Email) must be encrypted at rest.
