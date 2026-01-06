# FYN Timing — API & Event Registry (Generated)

- Schema: `fyn-timing.registry.v1`
- Generated at: `2026-01-05T06:54:19Z`
- Source: `{'zip': 'F.Y.N--main.zip', 'repo_root': 'F.Y.N--main', 'parsed_from': ['src/server.ts', 'src/modules/**/**.routes.ts']}`
- Endpoint count: `78`

## Auth Conventions

- **None**: Public endpoint (no auth middleware).
- **Firebase**: Bearer token verified; optional permission gate (RBAC).
- **Role**: Role-gated middleware (non-Firebase), typically expects request headers like `x-user-id`, `x-role` depending on implementation.

### Endpoint Auth Breakdown

| Auth | Count |
|------|------:|
| `firebase` | 71 |
| `none` | 3 |
| `role` | 4 |

## Pub/Sub Registry

### Topics

- `ar.events`
- `inventory.events`
- `notification.events`
- `pos.events`
- `reservation.events`
- `table.events`

### Subscriptions

- `notification-ar-sub`
- `notification-inventory-sub`
- `notification-pos-sub`
- `notification-reservation-sub`
- `notification-table-sub`

### Minimum IAM

- `publisher_min_role`: `roles/pubsub.publisher`
- `subscriber_min_role`: `roles/pubsub.subscriber`

## REST Endpoints

### Module: `ai`

#### `POST /api/v1/ai/suggestions/:id/review`

- Auth: Firebase (Bearer) + Permissions: `UPDATE_TABLE_STATE`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/ai/suggestions/generate/:tableId`

- Auth: Firebase (Bearer) + Permissions: `VIEW_TABLES`
- Inputs:
- Path params: `tableId`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `GET /api/v1/ai/suggestions/pending`

- Auth: Firebase (Bearer) + Permissions: `UPDATE_TABLE_STATE`
- Inputs:
- None
- Outputs:
- Status codes: (not enumerated in registry export)

### Module: `analytics`

#### `GET /api/v1/analytics/86/history`

- Auth: Firebase (Bearer) + Permissions: `VIEW_ALL_ANALYTICS`
- Inputs:
- Query: `endDate, limit`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `GET /api/v1/analytics/86/metrics`

- Auth: Firebase (Bearer) + Permissions: `VIEW_ALL_ANALYTICS`
- Inputs:
- Query: `endDate`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `GET /api/v1/analytics/86/suggestions`

- Auth: Firebase (Bearer) + Permissions: `VIEW_ALL_ANALYTICS`
- Inputs:
- Query: `endDate`
- Outputs:
- Status codes: (not enumerated in registry export)

### Module: `ar`

#### `GET /api/v1/ar/anchors`

- Auth: Firebase (Bearer)
- Inputs:
- None
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/ar/anchors`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_AR`
- Inputs:
- None
- Outputs:
- Status codes: `201`

#### `GET /api/v1/ar/models`

- Auth: Firebase (Bearer) + Permissions: `VIEW_AR_MODELS`
- Inputs:
- None
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/ar/models`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_AR`
- Inputs:
- None
- Outputs:
- Status codes: `201`

### Module: `audit`

#### `GET /api/v1/audit/`

- Auth: Firebase (Bearer) + Permissions: `VIEW_AUDIT_LOG`
- Inputs:
- Query: `action, endDate, limit, offset, startDate, targetEntity, targetId`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `GET /api/v1/audit/actor/:actorId`

- Auth: Firebase (Bearer) + Permissions: `VIEW_AUDIT_LOG`
- Inputs:
- Path params: `actorId`
- Query: `offset`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `GET /api/v1/audit/entity/:entityType/:entityId`

- Auth: Firebase (Bearer) + Permissions: `VIEW_AUDIT_LOG`
- Inputs:
- Path params: `entityId, entityType`
- Query: `offset`
- Outputs:
- Status codes: (not enumerated in registry export)

### Module: `guest`

#### `POST /api/v1/guests/`

- Auth: Firebase (Bearer) + Permissions: `CREATE_GUEST_PROFILE`
- Inputs:
- None
- Outputs:
- Status codes: `201`

#### `DELETE /api/v1/guests/:guestId/allergies/:allergyId`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_GUEST_ALLERGIES`
- Inputs:
- Path params: `allergyId, guestId`
- Outputs:
- Status codes: `204`

#### `PUT /api/v1/guests/:guestId/allergies/:allergyId`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_GUEST_ALLERGIES`
- Inputs:
- Path params: `allergyId, guestId`
- Body fields: `severity`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `DELETE /api/v1/guests/:guestId/preferences/:preferenceId`

- Auth: Firebase (Bearer) + Permissions: `UPDATE_GUEST_PROFILE`
- Inputs:
- Path params: `guestId, preferenceId`
- Outputs:
- Status codes: `204`

#### `DELETE /api/v1/guests/:id`

- Auth: Firebase (Bearer) + Permissions: `DELETE_GUEST_PROFILE`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: `204`

#### `GET /api/v1/guests/:id`

- Auth: Firebase (Bearer) + Permissions: `VIEW_GUEST_PROFILE`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `PUT /api/v1/guests/:id`

- Auth: Firebase (Bearer) + Permissions: `UPDATE_GUEST_PROFILE`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `GET /api/v1/guests/:id/allergies`

- Auth: Firebase (Bearer) + Permissions: `VIEW_GUEST_ALLERGIES`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/guests/:id/allergies`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_GUEST_ALLERGIES`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: `201`

#### `GET /api/v1/guests/:id/preferences`

- Auth: Firebase (Bearer) + Permissions: `VIEW_GUEST_PROFILE`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/guests/:id/preferences`

- Auth: Firebase (Bearer) + Permissions: `UPDATE_GUEST_PROFILE`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: `201`

#### `GET /api/v1/guests/search`

- Auth: Firebase (Bearer) + Permissions: `VIEW_GUEST_PROFILE`
- Inputs:
- Query: `limit`
- Outputs:
- Status codes: (not enumerated in registry export)

### Module: `inventory`

#### `GET /api/v1/inventory/`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_INVENTORY`
- Inputs:
- None
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/inventory/`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_INVENTORY`
- Inputs:
- None
- Outputs:
- Status codes: `201`

#### `POST /api/v1/inventory/86`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_86_EVENTS`
- Inputs:
- Body fields: `reason`
- Outputs:
- Status codes: `201`

#### `POST /api/v1/inventory/86-engine/:id/confirm`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_86_EVENTS`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/inventory/86-engine/:id/reject`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_86_EVENTS`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `GET /api/v1/inventory/86-engine/can-order/:menuItemId`

- Auth: Firebase (Bearer) + Permissions: `VIEW_MENU`
- Inputs:
- Path params: `menuItemId`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `GET /api/v1/inventory/86-engine/pending`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_86_EVENTS`
- Inputs:
- None
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/inventory/86-engine/scan`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_86_EVENTS`
- Inputs:
- None
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/inventory/86/:id/resolve`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_86_EVENTS`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `GET /api/v1/inventory/86/active`

- Auth: Firebase (Bearer) + Permissions: `VIEW_MENU`
- Inputs:
- None
- Outputs:
- Status codes: (not enumerated in registry export)

#### `GET /api/v1/inventory/:id`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_INVENTORY`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/inventory/:id/adjust`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_INVENTORY`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `GET /api/v1/inventory/:id/history`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_INVENTORY`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

### Module: `menu`

#### `GET /api/v1/menu/`

- Auth: Firebase (Bearer) + Permissions: `VIEW_MENU`
- Inputs:
- None
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/menu/`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_MENU`
- Inputs:
- None
- Outputs:
- Status codes: `201`

#### `GET /api/v1/menu/:id`

- Auth: Firebase (Bearer) + Permissions: `VIEW_MENU`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `PUT /api/v1/menu/:id`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_MENU`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `GET /api/v1/menu/:id/ingredients`

- Auth: Firebase (Bearer) + Permissions: `VIEW_MENU_INGREDIENTS`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/menu/:id/ingredients`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_MENU`
- Inputs:
- Path params: `id`
- Body fields: `isOptional, quantityRequired, unit`
- Outputs:
- Status codes: `201`

#### `DELETE /api/v1/menu/:menuId/ingredients/:ingredientId`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_MENU`
- Inputs:
- Path params: `ingredientId, menuId`
- Outputs:
- Status codes: `204`

### Module: `notification`

#### `GET /api/v1/notifications/`

- Auth: Firebase (Bearer)
- Inputs:
- None
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/notifications/:id/read`

- Auth: Firebase (Bearer)
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

### Module: `order`

#### `POST /api/v1/orders/`

- Auth: Role-gated (headers/role middleware). Roles: `ADMIN, MANAGER, SERVER`
- Inputs:
- Body fields: `guestId`
- Headers: `x-role, x-user-id`
- Outputs:
- Status codes: `201`

#### `GET /api/v1/orders/:id`

- Auth: Role-gated (headers/role middleware). Roles: `ADMIN, EXPO, KITCHEN, MANAGER, SERVER`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: `200`

#### `POST /api/v1/orders/:id/fire`

- Auth: Role-gated (headers/role middleware). Roles: `ADMIN, MANAGER, SERVER`
- Inputs:
- Path params: `id`
- Headers: `x-role, x-user-id`
- Outputs:
- Status codes: `200`

#### `POST /api/v1/orders/:id/items`

- Auth: Role-gated (headers/role middleware). Roles: `ADMIN, MANAGER, SERVER`
- Inputs:
- Path params: `id`
- Body fields: `notes, quantity`
- Headers: `x-role, x-user-id`
- Outputs:
- Status codes: `200`

### Module: `pos`

#### `POST /api/v1/pos/webhook/:provider`

- Auth: None
- Inputs:
- Path params: `provider`
- Outputs:
- Status codes: `500`

### Module: `reservation`

#### `GET /api/v1/reservations/`

- Auth: Firebase (Bearer) + Permissions: `VIEW_RESERVATIONS`
- Inputs:
- Query: `endDate, status`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/reservations/`

- Auth: Firebase (Bearer) + Permissions: `CREATE_RESERVATION`
- Inputs:
- None
- Outputs:
- Status codes: `201`

#### `GET /api/v1/reservations/:id`

- Auth: Firebase (Bearer) + Permissions: `VIEW_RESERVATIONS`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `PUT /api/v1/reservations/:id`

- Auth: Firebase (Bearer) + Permissions: `UPDATE_RESERVATION`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/reservations/:id/arrived`

- Auth: Firebase (Bearer) + Permissions: `UPDATE_RESERVATION`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/reservations/:id/cancel`

- Auth: Firebase (Bearer) + Permissions: `CANCEL_RESERVATION`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/reservations/:id/seated`

- Auth: Firebase (Bearer) + Permissions: `UPDATE_RESERVATION`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `GET /api/v1/reservations/guest/:guestId`

- Auth: Firebase (Bearer) + Permissions: `VIEW_RESERVATIONS`
- Inputs:
- Path params: `guestId`
- Outputs:
- Status codes: (not enumerated in registry export)

### Module: `safety`

#### `POST /api/v1/safety/crosscheck`

- Auth: Firebase (Bearer) + Permissions: `VIEW_GUEST_ALLERGIES`
- Inputs:
- Body fields: `menuItemId`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/safety/crosscheck/batch`

- Auth: Firebase (Bearer) + Permissions: `VIEW_GUEST_ALLERGIES`
- Inputs:
- Body fields: `menuItemIds`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `GET /api/v1/safety/safe-menu/:guestId`

- Auth: Firebase (Bearer) + Permissions: `VIEW_GUEST_ALLERGIES`
- Inputs:
- Path params: `guestId`
- Outputs:
- Status codes: (not enumerated in registry export)

### Module: `system`

#### `GET /health`

- Auth: None
- Inputs:
- None
- Outputs:
- Status codes: (not enumerated in registry export)

#### `GET /health-connectors`

- Auth: None
- Inputs:
- None
- Outputs:
- Status codes: (not enumerated in registry export)

### Module: `table`

#### `GET /api/v1/tables/`

- Auth: Firebase (Bearer) + Permissions: `VIEW_TABLES`
- Inputs:
- Query: `minCapacity`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/tables/`

- Auth: Firebase (Bearer) + Permissions: `OVERRIDE_TABLE_STATE`
- Inputs:
- None
- Outputs:
- Status codes: `201`

#### `GET /api/v1/tables/:id`

- Auth: Firebase (Bearer) + Permissions: `VIEW_TABLES`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `GET /api/v1/tables/:id/history`

- Auth: Firebase (Bearer) + Permissions: `VIEW_TABLES`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `PUT /api/v1/tables/:id/state`

- Auth: Firebase (Bearer) + Permissions: `UPDATE_TABLE_STATE`
- Inputs:
- Path params: `id`
- Body fields: `reservationId`
- Outputs:
- Status codes: (not enumerated in registry export)

### Module: `waitlist`

#### `GET /api/v1/waitlist/`

- Auth: Firebase (Bearer) + Permissions: `VIEW_WAITLIST`
- Inputs:
- None
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/waitlist/`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_WAITLIST`
- Inputs:
- None
- Outputs:
- Status codes: `201`

#### `GET /api/v1/waitlist/:id`

- Auth: Firebase (Bearer) + Permissions: `VIEW_WAITLIST`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `PUT /api/v1/waitlist/:id`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_WAITLIST`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/waitlist/:id/cancel`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_WAITLIST`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/waitlist/:id/notify`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_WAITLIST`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `POST /api/v1/waitlist/:id/seat`

- Auth: Firebase (Bearer) + Permissions: `MANAGE_WAITLIST`
- Inputs:
- Path params: `id`
- Outputs:
- Status codes: (not enumerated in registry export)

#### `GET /api/v1/waitlist/guest/:guestId`

- Auth: Firebase (Bearer) + Permissions: `VIEW_WAITLIST`
- Inputs:
- Path params: `guestId`
- Outputs:
- Status codes: (not enumerated in registry export)

## Permissions Matrix

| Permission | Endpoints |
|-----------|-----------|
| `CANCEL_RESERVATION` | POST /api/v1/reservations/:id/cancel |
| `CREATE_GUEST_PROFILE` | POST /api/v1/guests/ |
| `CREATE_RESERVATION` | POST /api/v1/reservations/ |
| `DELETE_GUEST_PROFILE` | DELETE /api/v1/guests/:id |
| `MANAGE_86_EVENTS` | GET /api/v1/inventory/86-engine/pending;<br>POST /api/v1/inventory/86;<br>POST /api/v1/inventory/86-engine/:id/confirm;<br>POST /api/v1/inventory/86-engine/:id/reject;<br>POST /api/v1/inventory/86-engine/scan;<br>POST /api/v1/inventory/86/:id/resolve |
| `MANAGE_AR` | POST /api/v1/ar/anchors;<br>POST /api/v1/ar/models |
| `MANAGE_GUEST_ALLERGIES` | DELETE /api/v1/guests/:guestId/allergies/:allergyId;<br>POST /api/v1/guests/:id/allergies;<br>PUT /api/v1/guests/:guestId/allergies/:allergyId |
| `MANAGE_INVENTORY` | GET /api/v1/inventory/;<br>GET /api/v1/inventory/:id;<br>GET /api/v1/inventory/:id/history;<br>POST /api/v1/inventory/;<br>POST /api/v1/inventory/:id/adjust |
| `MANAGE_MENU` | DELETE /api/v1/menu/:menuId/ingredients/:ingredientId;<br>POST /api/v1/menu/;<br>POST /api/v1/menu/:id/ingredients;<br>PUT /api/v1/menu/:id |
| `MANAGE_WAITLIST` | POST /api/v1/waitlist/;<br>POST /api/v1/waitlist/:id/cancel;<br>POST /api/v1/waitlist/:id/notify;<br>POST /api/v1/waitlist/:id/seat;<br>PUT /api/v1/waitlist/:id |
| `OVERRIDE_TABLE_STATE` | POST /api/v1/tables/ |
| `UPDATE_GUEST_PROFILE` | DELETE /api/v1/guests/:guestId/preferences/:preferenceId;<br>POST /api/v1/guests/:id/preferences;<br>PUT /api/v1/guests/:id |
| `UPDATE_RESERVATION` | POST /api/v1/reservations/:id/arrived;<br>POST /api/v1/reservations/:id/seated;<br>PUT /api/v1/reservations/:id |
| `UPDATE_TABLE_STATE` | GET /api/v1/ai/suggestions/pending;<br>POST /api/v1/ai/suggestions/:id/review;<br>PUT /api/v1/tables/:id/state |
| `VIEW_ALL_ANALYTICS` | GET /api/v1/analytics/86/history;<br>GET /api/v1/analytics/86/metrics;<br>GET /api/v1/analytics/86/suggestions |
| `VIEW_AR_MODELS` | GET /api/v1/ar/models |
| `VIEW_AUDIT_LOG` | GET /api/v1/audit/;<br>GET /api/v1/audit/actor/:actorId;<br>GET /api/v1/audit/entity/:entityType/:entityId |
| `VIEW_GUEST_ALLERGIES` | GET /api/v1/guests/:id/allergies;<br>GET /api/v1/safety/safe-menu/:guestId;<br>POST /api/v1/safety/crosscheck;<br>POST /api/v1/safety/crosscheck/batch |
| `VIEW_GUEST_PROFILE` | GET /api/v1/guests/:id;<br>GET /api/v1/guests/:id/preferences;<br>GET /api/v1/guests/search |
| `VIEW_MENU` | GET /api/v1/inventory/86-engine/can-order/:menuItemId;<br>GET /api/v1/inventory/86/active;<br>GET /api/v1/menu/;<br>GET /api/v1/menu/:id |
| `VIEW_MENU_INGREDIENTS` | GET /api/v1/menu/:id/ingredients |
| `VIEW_RESERVATIONS` | GET /api/v1/reservations/;<br>GET /api/v1/reservations/:id;<br>GET /api/v1/reservations/guest/:guestId |
| `VIEW_TABLES` | GET /api/v1/tables/;<br>GET /api/v1/tables/:id;<br>GET /api/v1/tables/:id/history;<br>POST /api/v1/ai/suggestions/generate/:tableId |
| `VIEW_WAITLIST` | GET /api/v1/waitlist/;<br>GET /api/v1/waitlist/:id;<br>GET /api/v1/waitlist/guest/:guestId |

## Notes

- This file is generated from `registry.json` and is intended to be the canonical D1 export.
- Response bodies are not fully typed here; only required input fields are listed (best-effort extraction).
