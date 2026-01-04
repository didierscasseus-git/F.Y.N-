# EIGHTY-SIX ENGINE V1

# STATUS: AUTHORITATIVE

# VERSION: 1.0.0

## 1. LOGIC & STATES

**The 86 Engine controls the availability of Menu Items.**

### 1.1 STATES

- **AVAILABLE**: Standard state.
- **EIGHTY_SIXED**: Item is strictly unavailable.

### 1.2 TRIGGERS (Automated & Manual)

1. **Zero Stock**: Inventory Engine reports `qty <= 0`.
2. **Missing Component**: 1 of N required ingredients is Out of Stock.
3. **Manual Trigger**: Chef clicks "86" on KDS.
4. **Waste Event**: Spillage reported > Remaining Stock.

---

## 2. WORKFLOW: THE 86 EVENT

### 2.1 EVENT GENERATION

When a trigger fires:

1. **Create Event**: `EightySixEvent` (Status: PENDING).
2. **Broadcast**: Alert Kitchen Display System (KDS) & Manager.
3. **Temporary Lock**: (Optional) Pause ordering for that item for 60s to allow confirmation.

### 2.2 CONFIRMATION

- **Action**: Kitchen/Manager must `CONFIRM` or `OVERRIDE`.
- **CONFIRM**:
  - Status -> EIGHTY_SIXED.
  - Update all active Menus (Real-time sync).
  - Push "Item Unavailable" to POS/Servers.
- **OVERRIDE**:
  - Requires `ReasonCode` (e.g., "Found emergency stock").
  - Status -> AVAILABLE.
  - Log Override.

### 2.3 EFFECT OF 86 STATE

- **Menus**: Item Greyed out / Removed.
- **POS**: Block generic ordering.
- **Waitlist**: Warn guests if pre-ordering (if applicable).

### 2.4 UN-86 (RECOVERY)

- **Constraint**: `AUTO_UN_86 = DISABLED`.
- **Logic**: Even if stock > 0, Human must manually set state back to `AVAILABLE`.
- **Reason**: Physical stock update might be an error; Chef decides when to sell again.

---

## 3. IMPLEMENTATION STUBS

```typescript
class EightySixEngine {
  
  async trigger86(menuItemId: string, reason: string, source: Actor): Promise<void> {
    
    // 1. Create Event
    const event = {
      id: uuid(),
      menuItemId,
      timestamp: new Date(),
      status: 'ACTIVE',
      reason
    };

    // 2. Propagate
    await eventBus.publish('MENU_ITEM_86', event);
    
    // 3. Update Menu State
    await menuRepo.updateStatus(menuItemId, 'EIGHTY_SIXED');
    
    // 4. Log
    await auditService.log({
      action: 'ITEM_86',
      entity: 'MenuItem',
      reasonCode: reason,
      source: 'MANUAL'
    });
  }
}
```
