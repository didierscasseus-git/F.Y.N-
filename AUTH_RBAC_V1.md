# AUTHENTICATION & RBAC POLICY V1

# STATUS: AUTHORITATIVE

# VERSION: 1.0.0

## 1. ROLE DEFINITIONS

The system recognizes the following distinct roles. No user may hold multiple role tokens simultaneously in a single session.

### 1.1 EXTERNAL

- **Guest**: Access limited to self-profile (read/write), self-reservation (read/create/cancel), and publicly available menu data (excluding ingredients/allergens unless explicitly granted).

### 1.2 INTERNAL (STAFF)

- **Host**: Front-of-house management. Focus on Reservations, Waitlist, Table status (view/set).
- **Server**: Table service. Focus on Orders, Table status, Guest preferences/allergies.
- **Kitchen / Expo**: Back-of-house. Focus on Orders, Ingredients, 86 states, Allergies.
- **Manager**: Operational oversight. Access to all operational data, overrides, staff analytics (aggregate).
- **Admin / Owner**: System configuration, user management, full audit access, sensitive data control.

---

## 2. PERMISSION MATRIX

| DOMAIN | RESOURCE | ACTION | GUEST | HOST | SERVER | KITCHEN | MANAGER | ADMIN |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Guest** | GuestProfile (Self) | Read/Write | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | GuestProfile (Others) | Read | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| | GuestProfile (Others) | Write | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| | GuestAllergy | Read | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| | GuestAllergy | Write | ✅* | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Ops** | Reservation | Read | ✅ (Self) | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Reservation | Write | ✅ (Self) | ✅ | ✅ | ❌ | ✅ | ✅ |
| | Waitlist | Read | ✅ (Self) | ✅ | ✅ | ❌ | ✅ | ✅ |
| | Waitlist | Write | ✅ (Add Self) | ✅ | ❌ | ❌ | ✅ | ✅ |
| | Table | Read Status | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Table | Set Status | ❌ | ✅ (Ltd) | ✅ (Ltd) | ✅ (Ltd) | ✅ | ✅ |
| **Menu** | MenuItem | Read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Ingredients | Read | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| | 86 State | Set | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| | 86 State | Override | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Inv** | Inventory | Read | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| | Inventory | Adjust | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Data** | Analytics (Self) | Read | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Analytics (Agg) | Read | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| | Audit Logs | Read | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Sys** | Users/Roles | Manage | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

*\*GuestAllergy writes by Guests are provisional and require staff verification.*

---

## 3. FIELD-LEVEL RESTRICTIONS

### 3.1 GUEST PROFILE

- **PII (Phone/Email)**:
  - **Guest**: Read/Write Self.
  - **Host/Server/Manager**: Read-Only.
  - **Admin**: Read-Only (Audited).
- **VIP Status**:
  - **Guest**: Hidden.
  - **Staff**: Read-Only.
  - **Manager/Admin**: Read/Write.

### 3.2 MENU & INVENTORY

- **Internal Notes / Ingredients**:
  - **Guest**: STRICTLY HIDDEN.
  - **Staff**: Visible.

### 3.3 ANALYTICS

- **Performance Scores**:
  - **Staff**: Visible only for *OWN* `staffId`.
  - **Manager**: Visible for all staff.

---

## 4. ENFORCEMENT MECHANISM

### 4.1 INTERCEPTOR

All API calls and tool invocations must pass through an `AuthInterceptor` that:

1. Validates the session token.
2. Extracts `actorId` and `role`.
3. Checks the `PermissionMatrix` against the requested resource and action.
4. Returns `403 FORBIDDEN` if unauthorized.
5. Logs the access attempt (Success or Failure) to `AuditLog`.

### 4.2 OVERRIDES

Manager/Admin overrides on operational constraints (e.g., forcing a table status, un-86ing an item without stock) must:

1. Require a valid Manager/Admin token.
2. Require a non-empty `reasonCode`.
3. Log the event specifically as an `OVERRIDE` action.
