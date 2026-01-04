# ALLERGY CROSS-CHECK ENGINE V1

# STATUS: AUTHORITATIVE

# VERSION: 1.0.0

## 1. CORE LOGIC DETECTOR

The Cross-Check Engine intercepts every `OrderEvent` where items are added to a check associated with a `GuestProfile` that has known `GuestAllergies`.

### 1.1 MATCHING ALGORITHM

1. **Inputs**:
   - `SelectedMenuItem` (contains list of `Ingredient`s)
   - `GuestProfile` (contains list of `Allergy` tags)
2. **Process**:
   - Iterate through all ingredients of the item.
   - Compare ingredient tags against guest allergy tags.
   - **MATCH FOUND** if set intersection is not empty.
3. **Outcome**:
   - No Match -> Allow order to proceed silently.
   - Match -> BLOCK interaction, RAISE ALERT.

---

## 2. ALERT LIFECYCLE (MANDATORY FLOW)

If a match is detected, the system enters a blocking state for that item.

### PHASE 1: SERVER INTERVENTION

- **UI State**: "DANGER: ALLERGY CONFLICT DETECTED"
- **Details**: "Guest is allergic to [X]. Item contains [Y]."
- **Action Required**:
  - `CONFIRM_REMOVAL` (Remove item from order) OR
  - `OVERRIDE_WITH_MODIFICATION` (e.g., "No peanuts")
- **Constraint**: Cannot proceed to "Send to Kitchen" until resolved.

### PHASE 2: KITCHEN ACKNOWLEDGMENT

- **Trigger**: Order sent with an overridden allergy conflict.
- **UI State (KDS)**: Flashing/Red Alert on Ticket.
- **Details**: "ALLERGY ALERT: TABLE 4 - [ALLERGEN]"
- **Action Required**:
  - `ACKNOWLEDGE_SAFE_PREP` (Chef confirms safe preparation).
- **Constraint**: Ticket state cannot move to "FOOD_READY" until acknowledged.

### PHASE 3: AUDIT

- Every step (Detection, Server Override, Kitchen Ack) is logged.
- Metadata: `Actor`, `Timestamp`, `SpecificConflict`.

---

## 3. IMPLEMENTATION STUBS

```typescript
class AllergyCrossCheckService {
  
  async validateOrder(orderItems: MenuItem[], guest: GuestProfile): Promise<ValidationResult> {
    const conflicts: Conflict[] = [];

    for (const item of orderItems) {
      const itemIngredients = await inventoryService.getIngredients(item.id);
      
      for (const ingredient of itemIngredients) {
        if (guest.allergies.includes(ingredient.allergenTag)) {
          conflicts.push({
            item: item.name,
            allergen: ingredient.allergenTag,
            severity: guest.getAllergySeverity(ingredient.allergenTag)
          });
        }
      }
    }

    if (conflicts.length > 0) {
      await auditService.log({
        action: 'ALLERGY_CONFLICT_DETECTED',
        entity: 'Order',
        reasonCode: JSON.stringify(conflicts)
      });
      return { valid: false, conflicts };
    }

    return { valid: true };
  }
}
```
