# INVENTORY MODULE V1

# STATUS: AUTHORITATIVE

# VERSION: 1.0.0

## 1. ENTITY DEFINITIONS

### 1.1 INVENTORY ITEM

- `id`: UUID
- `name`: String
- `sku`: String (Optional)
- `unit`: Enum (KG, L, COUNT, BOX)
- `currentStock`: Float
- `parLevel`: Float (Ideal stocking level)
- `reorderThreshold`: Float (Trigger for LOW_STOCK)
- `costPerUnit`: Decimal

### 1.2 INVENTORY ADJUSTMENT

- `id`: UUID
- `itemId`: UUID
- `delta`: Float (+/-)
- `reason`: Enum (RECEIPT, SALE, WASTE, SPOILAGE, THEFT, CORRECTION, 86_TRIGGER)
- `actorId`: UUID
- `timestamp`: DateTime

---

## 2. CORE FEATURES

### 2.1 STOCK MANAGEMENT

- **Manual Count**: Staff inputs new total. System calculates delta (`New - Old`) and logs adjustment.
- **Receiving**: Add stock from supplier invoice. Delta = `+Received`.
- **Waste Log**: Kitchen logs dropped/spoiled items. Delta = `-Amount`. Reason = `WASTE`.

### 2.2 THRESHOLD ALERTS

- **Logic**: After any update, Check `if currentStock <= reorderThreshold`.
- **Action**:
  - Raise `LOW_STOCK` Alert to Kitchen/Manager.
  - If `currentStock <= 0`, Trigger `86_CANDIDATE` (See Eighty-Six Engine).

### 2.3 POS DEPLETION (OPTIONAL)

If enabled:

- Map `MenuItem` -> `Reference<InventoryItem>[]` + `Quantities`.
- On `OrderSold`: Async job deducts theoretical usage.
- **Note**: Theoretical inventory rarely matches physical. Periodic manual counts are authoritative.

---

## 3. API STUBS

```typescript
class InventoryService {
  async adjustStock(
    itemId: string, 
    delta: number, 
    reason: AdjustmentReason, 
    actor: StaffMember
  ): Promise<void> {
    
    // 1. Get Item
    const item = await db.inventory.get(itemId);
    
    // 2. Update
    item.currentStock += delta;
    await db.inventory.save(item);
    
    // 3. Log History
    await db.adjustments.create({
      itemId, delta, reason, actorId: actor.id
    });

    // 4. Check Thresholds
    if (item.currentStock <= 0) {
      await eightySixEngine.evaluateStockOut(item.id);
    }
  }
}
```
