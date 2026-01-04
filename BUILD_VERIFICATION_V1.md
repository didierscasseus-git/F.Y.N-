# BUILD VERIFICATION V1

# STATUS: AUTHORITATIVE

# VERSION: 1.0.0

## 1. VERIFICATION PROTOCOL

This document defines the acceptance tests required to certify the system build.

### 1.1 PERMISSIONS (RBAC) TEST

- [ ] **GUEST**:
  - Attempt to read OTHER GuestProfile -> Must return 403.
  - Attempt to view Ingredients -> Must return 403 or filtered view.
  - Attempt to Write Table State -> Must return 403.
- [ ] **SERVER**:
  - Attempt to view Staff Analytics (Other) -> Must return 403.
  - Attempt to 86 Item -> Must return 403 (Kitchen/Mgr only).
- [ ] **MANAGER**:
  - Attempt to Override Table State -> Must Succeed + Log Reason.

### 1.2 AUDIT LOGGING TEST

- [ ] **Trigger**: Change Guest Allergy (Add 'Peanut').
- [ ] **Verify**: `AuditLog` table contains new record.
  - `Entity`: GuestAllergy
  - `Action`: CREATE
  - `Actor`: StaffID
  - `Timestamp`: Close to Now()

### 1.3 TABLE STATE MACHINE TEST

- [ ] **Valid**: Manual move `SEATED` -> `ORDERED`. (Expect Success).
- [ ] **Invalid**: Manual move `SEATED` -> `RESERVED` (Backward jump). (Expect Error 400).
- [ ] **Override**: Manager moves `SEATED` -> `OUT_OF_SERVICE`. (Expect Success + Audit Log).

### 1.4 86 ENGINE TEST

- [ ] **Trigger**: Set Item X Status = `EIGHTY_SIXED`.
- [ ] **Verify**:
  - Menu API returns Item X as Unavailable.
  - Order API rejects new order for Item X.
- [ ] **Recovery**: Set Item X Status = `AVAILABLE`. Verify Order API accepts.

### 1.5 ALLERGY CROSS-CHECK TEST

- [ ] **Setup**: Guest has 'SHELLFISH'. Item has 'SHRIMP'.
- [ ] **Action**: Add Item to Order.
- [ ] **Expect**:
  - Response is BLOCKING ALERT.
  - Payload contains "Conflict: Shrimp vs Shellfish".
- [ ] **Override**:
  - Server sends "Override: Guest confirmed ok".
  - **Expect**: Order Created + Audit Log of Risk.

---

## 2. REPORT GENERATION

Run the automated test suite implementing the above logic.
Output Format:

```json
{
  "buildVersion": "1.0.0",
  "timestamp": "2026-01-03T...",
  "tests": {
    "rbac": "PASS",
    "audit": "PASS",
    "stateMachine": "PASS",
    "eightySix": "PASS",
    "allergy": "PASS"
  },
  "status": "CERTIFIED_READY"
}
```
