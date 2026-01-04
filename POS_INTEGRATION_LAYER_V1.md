# POS INTEGRATION LAYER V1

# STATUS: AUTHORITATIVE

# VERSION: 1.0.0

## 1. DESIGN PHILOSOPHY

This layer provides a **Provider-Agnostic Adapter** pattern. The core system (States, Inventory, Analytics) listens to normalized internal events, not external provider webhooks directly.

## 2. EVENT MAPPING (NORMALIZATION)

We define a standard `PosEvent` interface that all specific adapters (Toast, Square, Micros, etc.) must implement.

| Internal Event | Description | Mapping Triggers |
| :--- | :--- | :--- |
| `CHECK_OPENED` | New bill started | Suggest `SEATED` |
| `ORDER_SENT` | Items fired to kitchen | Suggest `ORDERED`, Deduct `Inventory` |
| `KITCHEN_ACK` | Chef accepts ticket | Suggest `FOOD_IN_PROGRESS` |
| `ITEMS_SERVED` | Runner delivers | Suggest `FOOD_SERVED` |
| `PAY_INIT` | Card dip / Cash drop | Suggest `PAYING` |
| `PAY_COMPLETE` | Balance = 0 | Suggest `CLEANING` |

---

## 3. ADAPTER INTERFACE DEFINITION

```typescript
interface PosAdapter {
  /**
   * Connect to provider stream/webhook
   */
  connect(config: PosConfig): Promise<ConnectionStatus>;

  /**
   * Push 86 status to POS (Reverse Sync)
   */
  syncItemAvailability(itemId: string, status: 'AVAILABLE' | '86'): Promise<void>;

  /**
   * Standardized Event Stream
   */
  on(event: 'CHECK_OPENED', handler: (payload: CheckPayload) => void): void;
  on(event: 'ORDER_SENT', handler: (payload: OrderPayload) => void): void;
  // ... etc
}

interface OrderPayload {
  externalOrderId: string;
  tableIdentifier: string; // Name or ID
  items: Array<{
    sku: string;
    quantity: number;
    modifiers: string[];
    price: number;
  }>;
  timestamp: Date;
  staffId: string;
}
```

## 4. INTEGRITY RULES

1. **Idempotency**: POS webhooks may fire multiple times. The Adapter must filter duplicates using `externalEventsId`.
2. **Table Mapping**: POS tables (often strings "T12") must be mapped to system UUIDs. If mapping fails, Event is logged to `DeadLetterQueue` for manual Manager review.
3. **No Assumptions**: If a payload field is missing, do not infer. Pass `null` or error.

---

## 5. REVERSE SYNC (SYSTEM -> POS)

- **Primary Use**: Pushing 86/Sold-Out status to prevent sales.
- **Latency**: Critical. Must be close to real-time (<5s).
- **Failure Handling**: If POS API rejects the update, Alert Manager immediately ("POS Sync Failed: Stop Selling X").
