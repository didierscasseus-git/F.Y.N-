# TABLE STATUS SUGGESTION ENGINE V1

# STATUS: AUTHORITATIVE

# VERSION: 1.0.0

## 1. ENGINE CONFIGURATION

- **Default Mode**: `SUGGEST_ONLY` (Human confirmation required).
- **Auto-Advance**: Disabled by default. Can be enabled per transition type (e.g., Auto-Available after Payment).

## 2. SUGGESTION LOGIC

The engine evaluates signals periodically (every 30-60s) or on event triggers.

### 2.1 INPUT SIGNALS & WEIGHTS

| Signal Source | Event | Suggested State | Confidence |
| :--- | :--- | :--- | :--- |
| **Reservation** | Check-In (Arrived) | `RESERVED` -> `ARRIVED` | 0.9 |
| **POS** | New Check Opened | `ARRIVED` -> `SEATED` | 1.0 (High) |
| **POS** | First Item Ordered | `SEATED` -> `ORDERED` | 1.0 (High) |
| **POS** | Ticket Closed (Paid) | `ANY` -> `PAYING` | 1.0 (High) |
| **Time** | 90min Duration Exceeded | `SEATED` -> `PAYING`? | 0.4 (Low - Suggest Check) |
| **Staff** | "Bus requested" | `PAYING` -> `CLEANING` | 0.9 |

### 2.2 CONFLICT RESOLUTION

- If `Manual State` = 'OUT_OF_SERVICE', ignore all AI suggestions.
- If `POS State` conflicts with `Manual State` (e.g., POS says "Paid" but Table is "Ordered"), flag **CONFLICT**.
  - **Action**: Alert Manager. Do NOT auto-update.

---

## 3. DATA STRUCTURES

**SuggestionObject**

- `tableId`: UUID
- `suggestedState`: Enum
- `confidence`: Float (0.0 - 1.0)
- `reason`: String (e.g., "POS Check #1234 Closed")
- `evidence`: List<String> (Raw event IDs)

---

## 4. PROCESS FLOW

1. **Ingest**: Receive Event (POS, Timer, Manual).
2. **Evaluate**:
   - Check current state.
   - Match against allowed transitions (Strict Matrix).
   - Calculate confidence based on signal source.
3. **Output**:
   - If Confidence > Threshold AND Mode == AUTO: **Execute State Change**.
   - Else: **Emit Suggestion Notification**.

---

## 5. IMPLEMENTATION STUBS

```typescript
class StatusSuggestionEngine {
  
  async evaluate(tableId: string): Promise<Suggestion | null> {
    const table = await tableRepo.get(tableId);
    const lastPosEvent = await posService.getLastEvent(tableId);
    
    // Example: POS Auto-Detect
    if (lastPosEvent.type === 'CHECK_PAID' && table.currentState !== 'PAYING') {
      return {
        tableId,
        suggestedState: 'PAYING',
        confidence: 1.0,
        reason: 'POS Check Paid',
        evidence: [lastPosEvent.id]
      };
    }
    
    return null;
  }
}
```
