# ANALYTICS CORE V1

# STATUS: AUTHORITATIVE

# VERSION: 1.0.0

## 1. OPERATIONAL METRICS

### 1.1 TABLE PERFORMANCE

- **Turn Time**: `Time(Cleaning->Available) - Time(Seated)`.
- **Utilization**: `% of Open Hours where State != AVAILABLE`.
- **By Zone/Server**: Segmented aggregations.

### 1.2 WAITLIST PERFORMANCE

- **Wait Time Actual**: `Time(Seated) - Time(Arrived)`.
- **Quote Accuracy**: `Actual - Quoted`.
  - Positive = Guest waited longer (Bad).
  - Negative = Guest seated early (Good/Neutral).

### 1.3 PREDICTION HEALTH

- **Algorithm Validated**: Compare `EtaEngine` output vs `ActualTurnTime`.
- **Bias Tracking**: Is the system consistently over/under estimating?

---

## 2. SALES METRICS (POS LINKED)

### 2.1 REVENUE

- **Gross/Net Sales**: Standard accountancy.
- **RevPASH**: Revenue Per Available Seat Hour (Industry Standard).
- **Check Average**: Per Cover / Per Table.

### 2.2 STAFF METRICS (RESTRICTED)

- **Sales Volume**: Total sales by Server.
- **Tip Rate**: (Optional/Sensitive).
- **Visibility**: Staff see OWN metrics only. Manager sees ALL.

---

## 3. PIPELINE ARCHITECTURE

### 3.1 EVENT STREAM

1. **Ingest**: Listen to `TableStateEvent`, `ReservationEvent`, `PosEvent`.
2. **Normalize**: Convert to standard `AnalyticsEvent` schema.
3. **Store**: Write to Time-Series optimized tabl/collection.

### 3.2 REAL-TIME VS BATCH

- **Live**: Dashboards (Current Wait, Open Tables) query live state.
- **Historical**: Trends (Turn times over month) query aggregated warehouse data.

```typescript
class AnalyticsPipeline {
  onTableStateChange(event: TableStateEvent) {
    if (event.newState === 'CLEANING') {
      // End of Turn detected
      const seatedEvent = this.findPreviousState(event.tableId, 'SEATED');
      const turnDuration = event.timestamp - seatedEvent.timestamp;
      
      this.storeMetric({
        type: 'TABLE_TURN_DURATION',
        value: turnDuration,
        tags: { tableId: event.tableId, serverId: event.actorId }
      });
    }
  }
}
```
