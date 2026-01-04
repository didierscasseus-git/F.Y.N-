# ERROR AND FALLBACK POLICY V1

# STATUS: AUTHORITATIVE

# VERSION: 1.0.0

## 1. ERROR REGISTRY & CODALITY

All system errors must map to a standardized code and response structure.

| Error Code | HTTP | Description | UI Fallback |
| :--- | :--- | :--- | :--- |
| `ERR_AUTH_DENIED` | 403 | Insufficient Role Permissions | Show "Access Denied" Modal. |
| `ERR_SYNC_CONFLICT` | 409 | Version Mismatch (Optimistic Locking) | "Data updated by another user. Refreshing..." |
| `ERR_NETWORK_OFFLINE` | 503 | No Connectivity | Enable Read-Only Cache Mode. Queue Writes. |
| `ERR_VALIDATION_FAIL` | 400 | Input Logic Violation (e.g., Guest Name Empty) | Highlight Field Red. Show Message. |
| `ERR_AR_TRACKING_LOST` | N/A | AR Session Drift/Loss | Switch to 2D Map View immediately. |
| `ERR_CRITICAL_86` | 422 | Ordering 86'd Item | Block Action. Refresh Menu. |

---

## 2. STANDARD RESPONSES AND BEHAVIOR

### 2.1 NETWORK LOSS (OFFLINE MODE)

- **Detection**: Heartbeat check fails > 3 times.
- **State**: `SYSTEM_OFFLINE`.
- **Allowed Actions**:
  - Read cached data (Menu, Table Layout).
  - Draft Orders (Stored Locally).
- **Blocked Actions**:
  - Card Payments.
  - Finalizing Checks.
  - Syncing Inventory.
- **Recovery**: Auto-sync local write queue on reconnection.

### 2.2 PERMISSION DENIED

- **Non-Silent**: User MUST be informed why action failed.
- **Log**: Security Audit Log event generated.

### 2.3 AR FALLBACK (SAFETY)

- **Trigger**: Device reports low confidence or tracking loss.
- **Action**:
  1. Hide 3D Overlay (prevent misleading overlays).
  2. Display "Tracking Lost" Banner.
  3. Offer "Switch to List View" button.
- **Constraint**: Operations must never be blocked by AR failure. All AR features must have a 2D equivalent.

### 2.4 CONFLICTING UPDATES (CONCURRENCY)

- **Strategy**: Last-Write-Wins (LWW) for simple fields (Notes), but Version-Check (Optimistic Locking) for Criticals (Status, Inventory).
- **Resolution**: If Version Check fails, reject write and force client to `GET` fresh state.

---

## 3. IMPLEMENTATION STUB

```typescript
class ErrorHandler {
  handle(error: AppError, context: Context) {
    // 1. Log to System Monitor (Sentry/Datadog)
    logger.error(error);

    // 2. Return Standard Response keys
    return {
      code: error.code,
      message: auditSafeMessage(error), // Strip stack traces
      retryable: isRetryable(error.code)
    };
  }
}
```
