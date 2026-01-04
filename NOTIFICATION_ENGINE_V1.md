# NOTIFICATION ENGINE V1

# STATUS: AUTHORITATIVE

# VERSION: 1.0.0

## 1. ARCHITECTURE

The Notification Engine is a Pub/Sub system responsible for delivering time-sensitive alerts to specific Roles or Users.

### 1.1 MESSAGE STRUCTURE

- `id`: UUID
- `priority`: Enum (INFO, WARNING, CRITICAL)
- `channel`: Enum (IN_APP, PUSH, SMS, EMAIL)
- `target`:
  - `role`: (e.g., MANAGER)
  - `userId`: (Specific Staff)
- `payload`: JSON (Title, Body, ActionLink)
- `expiresAt`: DateTime
- `acknowledged`: Boolean

---

## 2. TRIGGER MAPPING

| Trigger Event | Priority | Target | Channel |
| :--- | :--- | :--- | :--- |
| **Allergy Conflict** | **CRITICAL** | Assigned Server + Kitchen | IN_APP (Modal) |
| **86 Event** | **CRITICAL** | All Servers + Hosts | IN_APP (Toast) |
| **Stock Low** | WARNING | Kitchen + Manager | IN_APP |
| **Table Conflict** | WARNING | Manager | IN_APP |
| **Waitlist Ready** | INFO | Guest | SMS / PUSH |
| **System Error** | WARNING | Admin | EMAIL |

---

## 3. QUEUE LOGIC

### 3.1 PRIORITY HANDLING

- **Critical (Interrupt)**: Must be displayed immediately (e.g., Full Screen Modal, Sound). Requires Acknowledgment to dismiss.
- **Warning (Toast)**: Appears but doesn't block UI. Persists in "Notification Tray".
- **Info (Badge)**: Increments a counter. Passive.

### 3.2 DELIVERY GUARANTEE

- **In-App**: Polling or Websocket. Stored in DB until `acknowledged` or `expired`.
- **Push/SMS**: Fire-and-forget via external provider (Twilio/FCM).

---

## 4. API STUBS

```typescript
class NotificationService {
  async dispatch(alert: AlertRequest): Promise<void> {
    
    // 1. Construct Message
    const msg = {
      ...alert,
      createdAt: new Date(),
      expiresAt: calculateExpiry(alert.priority)
    };

    // 2. Persist
    await db.notifications.create(msg);

    // 3. Real-Time Socket Push
    socketServer.to(alert.targetRole).emit('NEW_ALERT', msg);

    // 4. External Push (If configured)
    if (alert.channels.includes('PUSH')) {
      await pushProvider.send(msg);
    }
  }
}
```
