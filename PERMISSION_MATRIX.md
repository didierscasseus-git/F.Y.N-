# Auth & RBAC Permission Matrix

## Version: 1.0.0

## Module: AUTH_RBAC_V1_FIREBASE

---

## Roles

| Role | Description |
|------|-------------|
| GUEST | End users accessing the system for reservations |
| HOST | Front-of-house staff managing reservations and waitlist |
| SERVER | Service staff handling orders and guest interactions |
| KITCHEN | Kitchen and expo staff managing food preparation |
| MANAGER | Restaurant managers with oversight capabilities |
| ADMIN | System administrators with full access |

---

## Permission Matrix

### Guest Profile Permissions

| Permission | GUEST | HOST | SERVER | KITCHEN | MANAGER | ADMIN |
|-----------|-------|------|--------|---------|---------|-------|
| VIEW_GUEST_PROFILE | ✓ (self) | ✓ | ✓ | ✗ | ✓ | ✓ |
| CREATE_GUEST_PROFILE | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| UPDATE_GUEST_PROFILE | ✓ (self) | ✓ | ✓ | ✗ | ✓ | ✓ |
| DELETE_GUEST_PROFILE | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| VIEW_GUEST_ALLERGIES | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ |
| MANAGE_GUEST_ALLERGIES | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ |

### Reservations & Waitlist

| Permission | GUEST | HOST | SERVER | KITCHEN | MANAGER | ADMIN |
|-----------|-------|------|--------|---------|---------|-------|
| VIEW_RESERVATIONS | ✓ (self) | ✓ | ✓ | ✗ | ✓ | ✓ |
| CREATE_RESERVATION | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ |
| UPDATE_RESERVATION | ✓ (self) | ✓ | ✗ | ✗ | ✓ | ✓ |
| CANCEL_RESERVATION | ✓ (self) | ✗ | ✗ | ✗ | ✓ | ✓ |
| VIEW_WAITLIST | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ |
| MANAGE_WAITLIST | ✗ | ✓ | ✗ | ✗ | ✓ | ✓ |

### Table Management

| Permission | GUEST | HOST | SERVER | KITCHEN | MANAGER | ADMIN |
|-----------|-------|------|--------|---------|---------|-------|
| VIEW_TABLES | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| UPDATE_TABLE_STATE | ✗ | ✓* | ✓* | ✓* | ✓ | ✓ |
| OVERRIDE_TABLE_STATE | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |

*Limited to specific states based on role

### Menu & Inventory

| Permission | GUEST | HOST | SERVER | KITCHEN | MANAGER | ADMIN |
|-----------|-------|------|--------|---------|---------|-------|
| VIEW_MENU | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| VIEW_MENU_INGREDIENTS | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ |
| MANAGE_MENU | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| MANAGE_INVENTORY | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| MANAGE_86_EVENTS | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |

### Analytics

| Permission | GUEST | HOST | SERVER | KITCHEN | MANAGER | ADMIN |
|-----------|-------|------|--------|---------|---------|-------|
| VIEW_OWN_ANALYTICS | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| VIEW_ALL_ANALYTICS | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |

### AR & Audit

| Permission | GUEST | HOST | SERVER | KITCHEN | MANAGER | ADMIN |
|-----------|-------|------|--------|---------|---------|-------|
| VIEW_AR_MODELS | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| MANAGE_AR_SCANS | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| VIEW_AUDIT_LOG | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |

---

## Table State Permissions by Role

### HOST

- AVAILABLE
- RESERVED
- SEATED

### SERVER

- SEATED
- ORDERED
- FOOD_SERVED
- PAYING
- CLEANING

### KITCHEN

- ORDERED
- FOOD_IN_PROGRESS
- FOOD_SERVED

### MANAGER / ADMIN

- All states including OUT_OF_SERVICE

---

## Field-Level Restrictions

### Ingredients (Staff-Only)

- **Allowed Roles:** SERVER, KITCHEN, MANAGER, ADMIN
- **Blocked Roles:** GUEST, HOST
- **PRD Reference:** Section 5 - "Ingredients entered by kitchen staff only"

### Allergies (Restricted Access)

- **Allowed Roles:** SERVER, KITCHEN, MANAGER, ADMIN
- **Blocked Roles:** GUEST, HOST
- **PRD Reference:** Section 5 - "Visible only to Server, Kitchen, Manager"

### Staff Analytics (Self-Only)

- **Self Access:** All staff roles can view their own analytics
- **Full Access:** MANAGER, ADMIN can view all staff analytics
- **PRD Reference:** Section 11 - "Staff see only their own metrics"

---

## API Usage Examples

### Require Permission

```typescript
import { requirePermission, Permission } from './core/auth';

router.get('/reservations',
  requireAuth,
  requirePermission(Permission.VIEW_RESERVATIONS),
  getReservations
);
```

### Require Role

```typescript
import { requireRole, Role } from './core/connectors/firebaseAuth';

router.post('/menu/86',
  requireAuth,
  requireRole(Role.KITCHEN, Role.MANAGER, Role.ADMIN),
  create86Event
);
```

### Self or Admin Access

```typescript
import { requireSelfOrAdmin } from './core/auth';

router.get('/staff/:staffId/analytics',
  requireAuth,
  requireSelfOrAdmin(req => req.params.staffId),
  getStaffAnalytics
);
```

### Field Filtering

```typescript
import { filterFields, Role } from './core/auth';

const menuItem = await getMenuItem(id);
const filteredItem = filterFields(user.role, 'menu', menuItem);
res.json(filteredItem);
```

---

## PRD Compliance

✅ **Section 2:** Role-based access control enforced
✅ **Section 5:** Ingredient staff-only restriction
✅ **Section 5:** Allergy visibility restrictions
✅ **Section 11:** Staff analytics self-only policy
✅ **Section 13:** Field-level permissions

---

## Testing

Run permission tests:

```bash
npm test -- rbac.test
```

All permission rules are unit tested with PRD compliance verification.
