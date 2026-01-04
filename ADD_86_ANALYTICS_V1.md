# ADD-86 ANALYTICS V1

# STATUS: AUTHORITATIVE

# VERSION: 1.0.0

## 1. METRIC DEFINITIONS

### 1.1 FREQUENCY & DURATION

- **Count**: Total `EightySixEvent`s per `MenuItem` per `Shift`.
- **Duration**: `Time(Un-86) - Time(Confirmed 86)`. Measures "Out of Stock" downtime.

### 1.2 OPERATIONAL RESPONSE

- **Response Time**: `Time(Confirmation) - Time(Trigger)`. Measures management agility.
- **Override Rate**: `Count(Overrides) / Count(Triggers)`. High rate implies faulty sensors or poor inventory data.

### 1.3 BUSINESS IMPACT (POS LINKED)

- **Lost Sales (Est)**: `DurationHours * AvgSalesPerHour(Item)`. Theoretical revenue loss.
- **Inventory Accuracy**: Compare `SystemStock` at Trigger vs `PhysicalCount` (if performed).

---

## 2. PRIVACY & VISIBILITY

- **Scope**: Aggregated Dashboards are **Restricted**.
- **Role**: `MANAGER` and `ADMIN` only.
- **Staff Impact**: Explicitly **EXCLUDED** from Staff Performance Scores. Use for supply chain optimization, not discipline.

---

## 3. AGGREGATION JOBS

### 3.1 NIGHTLY BATCH

Job `Aggregate86Metrics` runs at 04:00 Local.

1. Fetch all `EightySixEvent`s from previous trading day.
2. Group by `MenuItemId`.
3. Calculate sums/avgs.
4. Persist to `AnalyticsWarehouse`.

---

## 4. API ENDPOINTS

### 4.1 REPORTING

`GET /api/analytics/reports/86-impact`

- **Params**: `startDate`, `endDate`.
- **Auth**: Manager+.
- **Response**: JSON Breakdown of top 86'd items, total lost revenue.

```typescript
// Metric Calculation Logic
function calculateLostSales(item: MenuItem, durationHours: number): number {
  const avgHourlyVelocity = analytics.getVelocity(item.id);
  return avgHourlyVelocity * item.price * durationHours;
}
```
