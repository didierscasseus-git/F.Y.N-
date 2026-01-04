# AR TABLE ZONE MAPPING V1

# STATUS: AUTHORITATIVE

# VERSION: 1.0.0

## 1. MAPPING CONCEPT

Mapping connects the **Logical World** (Databases, IDs, Reservations) to the **Physical World** (AR Model, Coordinates).

### 1.1 DATA OBJECTS

- **Anchor**: Point (X,Y,Z) + Orientation (Quat) in the Model space.
- **LogicalTarget**: `TableID` or `ZoneID`.

---

## 2. ZONING TOOLS

### 2.1 ZONE DEFINITION

- Zones are defined as **Spatial Polygons** (on floor plane) or **Volumes**.
- Staff tool: "Draw Zone".
- Output: List of Vertex Coordinates relative to Model Origin.
- **Rule**: Zones cannot overlap for "Table Assignment" purposes (A table belongs to exactly one Zone).

### 2.2 TABLE PINNING (ANCHORING)

- **Process**:
  1. Admin opens AR View on device.
  2. Selects Logical Table "T12" from list.
  3. Walks to physical table T12.
  4. Places virtual marker on table center.
  5. System saves `ARAnchor` { modelId, tableId, transform }.
- **Validation**:
  - Distance check (Warning if T12 is placed 50 meters away from T11, if they are logically grouped).
  - Duplicate check (One anchor per Table per Model).

---

## 3. RUNTIME RESOLUTION

When the App runs:

1. Load Active `ARModel`.
2. Fetch all `ARAnchors` for this Model.
3. For each Anchor, look up current `TableState` (Available, Seated, etc.).
4. **Project** 2D UI elements (Status Cards) into 3D space at Anchor Query.

---

## 4. INTEGRITY

- **ID Sync**: If `TableID: T99` is deleted from Operations DB, the corresponding `ARAnchor` must be flagged "ORPHANED" or deleted.
- **Model Swap**: When switching Active AR Models, Mapping **DOES NOT** carry over automatically (Coordinate systems differ). Anchors must be re-created or migrated using referencing landmarks.

```typescript
interface ZoneDefinition {
  zoneId: string;
  modelId: string;
  boundaryVertices: Vector3[]; // [x,0,z] usually
  heightCeiling: number;
}
```
