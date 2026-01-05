# F.Y.N Timing OS - API & Event Registry

**Version**: 1.3.26  
**Generated**: 2026-01-04

---

## Pub/Sub Topics

### Published Topics

| Topic | Publisher | Event Types | Schema |
|-------|-----------|-------------|--------|
| `pos.events` | POS Module | `CHECK_OPENED`, `CHECK_PAID`, `ITEM_ORDERED`, `PAYMENT_RECEIVED` | PosEvent |
| `table.events` | Table Module | `TABLE_CREATED`, `TABLE_STATE_UPDATED` | Table |
| `reservation.events` | Reservation Module | `RESERVATION_CREATED`, `RESERVATION_UPDATED`, `RESERVATION_CANCELLED` | Reservation |
| `inventory.events` | Inventory Module | `INVENTORY_UPDATED`, `INVENTORY_LOW_STOCK`, `EIGHTY_SIX_CREATED`, `EIGHTY_SIX_RESOLVED` | InventoryItem |
| `notification.events` | Notification Module | `NOTIFICATION_CREATED` | Notification |
| `ar.events` | AR Module | `ANCHOR_CREATED`, `MODEL_UPLOADED` | ArAnchor / ArModel |

### Subscribed Topics

| Subscriber | Topics | Purpose |
|------------|--------|---------|
| Notification Engine | `pos.events`, `inventory.events`, `table.events`, `reservation.events`, `ar.events` | Generate real-time alerts |
| AI Suggestion Engine | `pos.events`, `table.events` | Table state predictions |

---

## REST API Endpoints

### Guest Module (`/api/v1/guests`)

#### `POST /api/v1/guests`

- **Description**: Create guest profile
- **Permission**: `CREATE_GUEST_PROFILE`
- **Input**:

  ```typescript
  {
    firstName: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
  }
  ```

- **Output**: `Guest`
- **Events**: None

#### `GET /api/v1/guests/search`

- **Description**: Search guests
- **Permission**: `VIEW_GUEST_PROFILE`
- **Input**: `?q=<query>&limit=<number>`
- **Output**: `{ guests: Guest[], count: number }`
- **Events**: None

#### `GET /api/v1/guests/:id`

- **Description**: Get guest by ID
- **Permission**: `VIEW_GUEST_PROFILE`
- **Input**: Path param `id`
- **Output**: `Guest`
- **Events**: None

#### `PUT /api/v1/guests/:id`

- **Description**: Update guest profile
- **Permission**: `UPDATE_GUEST_PROFILE`
- **Input**: Partial `Guest`
- **Output**: `Guest`
- **Events**: None

#### `DELETE /api/v1/guests/:id`

- **Description**: Soft delete guest
- **Permission**: `DELETE_GUEST_PROFILE`
- **Input**: Path param `id`
- **Output**: 204 No Content
- **Events**: None

#### `GET /api/v1/guests/:id/preferences`

- **Description**: Get guest preferences
- **Permission**: `VIEW_GUEST_PROFILE`
- **Input**: Path param `id`
- **Output**: `{ preferences: GuestPreference[] }`
- **Events**: None

#### `POST /api/v1/guests/:id/preferences`

- **Description**: Add preference
- **Permission**: `UPDATE_GUEST_PROFILE`
- **Input**: `{ preference: string }`
- **Output**: `GuestPreference`
- **Events**: None

#### `DELETE /api/v1/guests/:guestId/preferences/:preferenceId`

- **Description**: Remove preference
- **Permission**: `UPDATE_GUEST_PROFILE`  
- **Output**: 204 No Content
- **Events**: None

#### `GET /api/v1/guests/:id/allergies`

- **Description**: Get guest allergies
- **Permission**: `VIEW_GUEST_ALLERGIES`
- **Input**: Path param `id`
- **Output**: `{ allergies: GuestAllergy[] }`
- **Events**: None

#### `POST /api/v1/guests/:id/allergies`

- **Description**: Add allergy
- **Permission**: `MANAGE_GUEST_ALLERGIES`
- **Input**: `{ allergen: string, severity: AllergySeverity }`
- **Output**: `GuestAllergy`
- **Events**: None

#### `PUT /api/v1/guests/:guestId/allergies/:allergyId`

- **Description**: Update allergy severity
- **Permission**: `MANAGE_GUEST_ALLERGIES`
- **Input**: `{ severity: AllergySeverity }`
- **Output**: `GuestAllergy`
- **Events**: None

#### `DELETE /api/v1/guests/:guestId/allergies/:allergyId`

- **Description**: Remove allergy
- **Permission**: `MANAGE_GUEST_ALLERGIES`
- **Output**: 204 No Content
- **Events**: None

---

### Reservation Module (`/api/v1/reservations`)

#### `POST /api/v1/reservations`

- **Description**: Create reservation
- **Permission**: `CREATE_RESERVATION`
- **Input**:

  ```typescript
  {
    guestId: string;
    partySize: number;
    reservationTime: string; // ISO datetime
    specialRequests?: string;
  }
  ```

- **Output**: `Reservation`
- **Events Published**: `reservation.events` → `RESERVATION_CREATED`

#### `GET /api/v1/reservations/:id`

- **Description**: Get reservation by ID
- **Permission**: `VIEW_RESERVATIONS`
- **Input**: Path param `id`
- **Output**: `Reservation`
- **Events**: None

#### `GET /api/v1/reservations/guest/:guestId`

- **Description**: Get guest reservations
- **Permission**: `VIEW_RESERVATIONS`
- **Input**: Path param `guestId`
- **Output**: `{ reservations: Reservation[], count: number }`
- **Events**: None

#### `GET /api/v1/reservations`

- **Description**: Get reservations by date range
- **Permission**: `VIEW_RESERVATIONS`
- **Input**: `?startDate=<ISO>&endDate=<ISO>&status=<optional>`
- **Output**: `{ reservations: Reservation[], count: number }`
- **Events**: None

#### `PUT /api/v1/reservations/:id`

- **Description**: Update reservation
- **Permission**: `UPDATE_RESERVATION`
- **Input**: Partial `Reservation`
- **Output**: `Reservation`
- **Events Published**: `reservation.events` → `RESERVATION_UPDATED`

#### `POST /api/v1/reservations/:id/cancel`

- **Description**: Cancel reservation
- **Permission**: `CANCEL_RESERVATION`
- **Input**: Path param `id`
- **Output**: `Reservation` (status: CANCELLED)
- **Events Published**: `reservation.events` → `RESERVATION_CANCELLED`

#### `POST /api/v1/reservations/:id/arrived`

- **Description**: Mark as arrived
- **Permission**: `UPDATE_RESERVATION`
- **Input**: Path param `id`
- **Output**: `Reservation` (status: ARRIVED)
- **Events Published**: `reservation.events` → `RESERVATION_UPDATED`

#### `POST /api/v1/reservations/:id/seated`

- **Description**: Mark as seated
- **Permission**: `UPDATE_RESERVATION`
- **Input**: Path param `id`
- **Output**: `Reservation` (status: SEATED)
- **Events Published**: `reservation.events` → `RESERVATION_UPDATED`

---

### Table Module (`/api/v1/tables`)

#### `POST /api/v1/tables`

- **Description**: Create table (Manager/Admin only)
- **Permission**: `OVERRIDE_TABLE_STATE`
- **Input**:

  ```typescript
  {
    number: string;
    capacity: number;
    section?: string;
  }
  ```

- **Output**: `Table`
- **Events Published**: `table.events` → `TABLE_CREATED`

#### `GET /api/v1/tables`

- **Description**: Get all tables (filterable)
- **Permission**: `VIEW_TABLES`
- **Input**: `?state=<TableState>&minCapacity=<number>`
- **Output**: `{ tables: Table[], count: number }`
- **Events**: None

#### `GET /api/v1/tables/:id`

- **Description**: Get table by ID
- **Permission**: `VIEW_TABLES`
- **Input**: Path param `id`
- **Output**: `Table`
- **Events**: None

#### `PUT /api/v1/tables/:id/state`

- **Description**: Update table state (role-based transitions)
- **Permission**: `UPDATE_TABLE_STATE`
- **Input**:

  ```typescript
  {
    state: TableState;
    reservationId?: string;
  }
  ```

- **Output**: `Table`
- **Events Published**: `table.events` → `TABLE_STATE_UPDATED`

#### `GET /api/v1/tables/:id/history`

- **Description**: Get table state history
- **Permission**: `VIEW_TABLES`
- **Input**: Path param `id`
- **Output**: `{ events: TableStateEvent[], count: number }`
- **Events**: None

---

### Inventory Module (`/api/v1/inventory`)

#### `POST /api/v1/inventory`

- **Description**: Add inventory item
- **Permission**: `MANAGE_INVENTORY`
- **Input**:

  ```typescript
  {
    name: string;
    unit: string;
    currentQuantity: number;
    reorderLevel: number;
    reorderQuantity: number;
  }
  ```

- **Output**: `InventoryItem`
- **Events**: None

#### `GET /api/v1/inventory`

- **Description**: Get all inventory
- **Permission**: `MANAGE_INVENTORY`
- **Input**: None
- **Output**: `InventoryItem[]`
- **Events**: None

#### `PUT /api/v1/inventory/:id/adjust`

- **Description**: Adjust inventory quantity
- **Permission**: `MANAGE_INVENTORY`
- **Input**:

  ```typescript
  {
    quantityChange: number;
    reason: string;
  }
  ```

- **Output**: `InventoryItem`
- **Events Published**:
  - `inventory.events` → `INVENTORY_UPDATED`
  - `inventory.events` → `INVENTORY_LOW_STOCK` (if below reorder level)

#### `POST /api/v1/inventory/86`

- **Description**: Create 86 entry (item unavailable)
- **Permission**: `MANAGE_86_EVENTS`
- **Input**:

  ```typescript
  {
    inventoryItemId: string;
    reason?: string;
  }
  ```

- **Output**: `EightySixEvent`
- **Events Published**: `inventory.events` → `EIGHTY_SIX_CREATED`

#### `POST /api/v1/inventory/86/:id/resolve`

- **Description**: Resolve 86 entry
- **Permission**: `MANAGE_86_EVENTS`
- **Input**: Path param `id`
- **Output**: `EightySixEvent`
- **Events Published**: `inventory.events` → `EIGHTY_SIX_RESOLVED`

---

### POS Module (`/api/v1/pos`)

#### `POST /api/v1/pos/webhook/:provider`

- **Description**: Ingest POS provider webhook
- **Permission**: None (signature validation via adapter)
- **Input**: Provider-specific webhook payload
- **Output**: `PosEvent`
- **Events Published**: `pos.events` → (various event types)

---

### Notification Module (`/api/v1/notifications`)

#### `GET /api/v1/notifications`

- **Description**: Get notifications for authenticated user
- **Permission**: Auth required (no specific permission)
- **Input**: `?unread=<boolean>`
- **Output**: `Notification[]`
- **Events**: None
- **Events Consumed**:
  - `pos.events`
  - `inventory.events`
  - `table.events`
  - `reservation.events`
  - `ar.events`

#### `POST /api/v1/notifications/:id/read`

- **Description**: Mark notification as read
- **Permission**: Auth required
- **Input**: Path param `id`
- **Output**: 200 OK
- **Events**: None

---

### AR Module (`/api/v1/ar`)

#### `POST /api/v1/ar/models`

- **Description**: Register 3D model
- **Permission**: `MANAGE_AR`
- **Input**:

  ```typescript
  {
    name: string;
    url: string;
    format: 'GLB' | 'USDZ' | 'OBJ' | 'PLY';
  }
  ```

- **Output**: `ArModel`
- **Events Published**: `ar.events` → `MODEL_UPLOADED`

#### `GET /api/v1/ar/models`

- **Description**: List 3D models
- **Permission**: `VIEW_AR_MODELS`
- **Input**: None
- **Output**: `ArModel[]`
- **Events**: None

#### `POST /api/v1/ar/anchors`

- **Description**: Map table to AR anchor
- **Permission**: `MANAGE_AR`
- **Input**:

  ```typescript
  {
    tableId: string;
    cloudAnchorId?: string;
    localTransform?: number[]; // 4x4 matrix (16 elements)
    confidence?: number;
  }
  ```

- **Output**: `ArAnchor`
- **Events Published**: `ar.events` → `ANCHOR_CREATED`

#### `GET /api/v1/ar/anchors`

- **Description**: Get all AR anchors (or filter by table)
- **Permission**: Auth required
- **Input**: `?tableId=<optional>`
- **Output**: `ArAnchor[]`
- **Events**: None

---

### Safety Module (`/api/v1/safety`)

#### `POST /api/v1/safety/crosscheck`

- **Description**: Check if menu item is safe for guest
- **Permission**: `VIEW_GUEST_ALLERGIES`
- **Input**:

  ```typescript
  {
    guestId: string;
    menuItemId: string;
  }
  ```

- **Output**: `CrosscheckResult` (safe, matches, highRiskDetected)
- **Events**: None

#### `POST /api/v1/safety/crosscheck/batch`

- **Description**: Batch crosscheck menu items
- **Permission**: `VIEW_GUEST_ALLERGIES`
- **Input**:

  ```typescript
  {
    guestId: string;
    menuItemIds: string[];
  }
  ```

- **Output**: `Record<string, CrosscheckResult>`
- **Events**: None

#### `GET /api/v1/safety/safe-menu/:guestId`

- **Description**: Get all safe menu items for guest
- **Permission**: `VIEW_GUEST_ALLERGIES`
- **Input**: Path param `guestId`
- **Output**: `{ guestId, safeMenuItemIds: string[], count: number }`
- **Events**: None

---

### AI Module (`/api/v1/ai`)

#### `GET /api/v1/ai/suggestion/:tableId`

- **Description**: Get table state suggestion (AI-powered)
- **Permission**: `VIEW_TABLES`
- **Input**: Path param `tableId`
- **Output**: `TableStateSuggestion` (suggestedState, confidence, evidence)
- **Events**: None
- **Events Consumed**: `pos.events` (for evidence)

---

### Waitlist Module (`/api/v1/waitlist`)

#### `POST /api/v1/waitlist`

- **Description**: Add guest to waitlist
- **Permission**: `MANAGE_WAITLIST`
- **Input**:

  ```typescript
  {
    guestId: string;
    partySize: number;
    estimatedWaitMinutes?: number;
  }
  ```

- **Output**: `WaitlistEntry`
- **Events**: None

#### `GET /api/v1/waitlist`

- **Description**: Get active waitlist
- **Permission**: `VIEW_WAITLIST`
- **Input**: None
- **Output**: `WaitlistEntry[]`
- **Events**: None

#### `POST /api/v1/waitlist/:id/notify`

- **Description**: Notify guest (SMS stub)
- **Permission**: `MANAGE_WAITLIST`
- **Input**: Path param `id`
- **Output**: 200 OK
- **Events**: None

#### `POST /api/v1/waitlist/:id/remove`

- **Description**: Remove from waitlist
- **Permission**: `MANAGE_WAITLIST`
- **Input**: Path param `id`
- **Output**: 200 OK
- **Events**: None

---

### Audit Module (`/api/v1/audit`)

#### `GET /api/v1/audit`

- **Description**: Query audit logs (Manager/Admin only)
- **Permission**: `VIEW_AUDIT_LOG`
- **Input**: Query params (actorId, targetEntity, startDate, endDate, limit, offset)
- **Output**: `AuditLogEntry[]`
- **Events**: None

---

### Analytics Module (`/api/v1/analytics`)

#### `GET /api/v1/analytics/86`

- **Description**: Get 86 event analytics
- **Permission**: `VIEW_ALL_ANALYTICS`
- **Input**: `?startDate=<ISO>&endDate=<ISO>`
- **Output**: Analytics summary (itemFrequency, totalEvents, etc.)
- **Events**: None

---

## Permissions Matrix

| Permission | Roles |
|-----------|-------|
| `VIEW_GUEST_PROFILE` | HOST, SERVER, MANAGER, ADMIN |
| `CREATE_GUEST_PROFILE` | HOST, SERVER, MANAGER, ADMIN |
| `UPDATE_GUEST_PROFILE` | HOST, SERVER, MANAGER, ADMIN |
| `DELETE_GUEST_PROFILE` | MANAGER, ADMIN |
| `VIEW_GUEST_ALLERGIES` | SERVER, KITCHEN, MANAGER, ADMIN |
| `MANAGE_GUEST_ALLERGIES` | SERVER, MANAGER, ADMIN |
| `VIEW_RESERVATIONS` | HOST, SERVER, MANAGER, ADMIN |
| `CREATE_RESERVATION` | GUEST, HOST, MANAGER, ADMIN |
| `UPDATE_RESERVATION` | HOST, MANAGER, ADMIN |
| `CANCEL_RESERVATION` | GUEST, HOST, MANAGER, ADMIN |
| `VIEW_WAITLIST` | HOST, MANAGER, ADMIN |
| `MANAGE_WAITLIST` | HOST, MANAGER, ADMIN |
| `VIEW_TABLES` | HOST, SERVER, KITCHEN, MANAGER, ADMIN |
| `UPDATE_TABLE_STATE` | HOST, SERVER, KITCHEN, MANAGER, ADMIN |
| `OVERRIDE_TABLE_STATE` | MANAGER, ADMIN |
| `VIEW_MENU` | ALL |
| `VIEW_MENU_INGREDIENTS` | SERVER, KITCHEN, MANAGER, ADMIN |
| `MANAGE_MENU` | MANAGER, ADMIN |
| `MANAGE_INVENTORY` | KITCHEN, MANAGER, ADMIN |
| `MANAGE_86_EVENTS` | KITCHEN, MANAGER, ADMIN |
| `VIEW_OWN_ANALYTICS` | HOST, SERVER, KITCHEN, MANAGER, ADMIN |
| `VIEW_ALL_ANALYTICS` | MANAGER, ADMIN |
| `MANAGE_AR` | MANAGER, ADMIN |
| `VIEW_AR_MODELS` | MANAGER, ADMIN |
| `VIEW_AUDIT_LOG` | MANAGER, ADMIN |

---

## Event Flow Diagram

```
┌─────────────┐
│  POS System │
└──────┬──────┘
       │ webhook
       ▼
┌─────────────────┐        ┌──────────────────┐
│  POS Service    │───────▶│  pos.events      │
└─────────────────┘        └────────┬─────────┘
                                    │
                           ┌────────┴────────┐
                           │                 │
                           ▼                 ▼
                   ┌───────────────┐  ┌──────────────┐
                   │ Notification  │  │ AI Suggestion│
                   │   Engine      │  │   Engine     │
                   └───────┬───────┘  └──────────────┘
                           │
                           ▼
                   ┌───────────────────┐
                   │notification.events│
                   └───────────────────┘

┌─────────────────┐        ┌──────────────────┐
│ Table Service   │───────▶│ table.events     │────┐
└─────────────────┘        └──────────────────┘    │
                                                    │
┌─────────────────┐        ┌──────────────────┐    │
│Reservation Svc  │───────▶│reservation.events│────┤
└─────────────────┘        └──────────────────┘    │
                                                    │
┌─────────────────┐        ┌──────────────────┐    │
│ Inventory Svc   │───────▶│inventory.events  │────┤
└─────────────────┘        └──────────────────┘    │
                                                    │
┌─────────────────┐        ┌──────────────────┐    │
│   AR Service    │───────▶│   ar.events      │────┘
└─────────────────┘        └──────────────────┘    
                                    │
                                    ▼
                           ┌───────────────┐
                           │ Notification  │
                           │   Engine      │
                           └───────────────┘
```

---

## Schema Definitions (Key Types)

### Guest

```typescript
{
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Reservation

```typescript
{
  id: string;
  guestId: string;
  partySize: number;
  reservationTime: Date;
  status: 'PENDING' | 'CONFIRMED' | 'ARRIVED' | 'SEATED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  specialRequests?: string;
  createdAt: Date;
}
```

### Table

```typescript
{
  id: string;
  number: string;
  capacity: number;
  section?: string;
  currentState: TableState;
  currentReservationId?: string;
}
```

### TableState

```typescript
'AVAILABLE' | 'RESERVED' | 'SEATED' | 'ORDERED' | 'FOOD_IN_PROGRESS' 
| 'FOOD_SERVED' | 'PAYING' | 'CLEANING' | 'OUT_OF_SERVICE'
```

### Notification

```typescript
{
  id: string;
  type: 'SYSTEM' | 'ALERT' | 'REMINDER' | 'MESSAGE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  recipientRole?: Role;
  recipientId?: string;
  read: boolean;
  data?: any;
  createdAt: string;
}
```

### ArAnchor

```typescript
{
  id: string;
  tableId: string;
  cloudAnchorId?: string;
  localTransform?: number[]; // 4x4 matrix
  confidence: number;
  createdAt: string;
}
```

---

**End of Registry**
