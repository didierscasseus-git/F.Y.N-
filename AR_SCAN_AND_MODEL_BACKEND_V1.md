# AR SCAN AND MODEL BACKEND V1

# STATUS: AUTHORITATIVE

# VERSION: 1.0.0

## 1. DATA ENTITIES

### 1.1 AR SCAN RECORD

- `id`: UUID
- `scannerStaffId`: UUID
- `timestamp`: DateTime
- `rawAssetUrl`: String (S3/Blob Path)
- `format`: Enum (LIDAR_POINT_CLOUD, PHOTOGRAMMETRY_IMAGES)
- `status`: Enum (UPLOADED, PROCESSING, REJECTED, PROCESSED)
- `processingLogs`: JSON

### 1.2 AR MODEL (THE OPTIMIZED ASSET)

- `id`: UUID
- `scanId`: UUID (Source)
- `modelUrl`: String (USDZ / GLB)
- `version`: Integer (SemVer or Incremental)
- `qualityScore`: Float (0-100, Coverage/Density)
- `isActive`: Boolean (Strictly ONE true per Venue)

### 1.3 AR ANCHOR (SPATIAL MAPPING)

- `id`: UUID
- `modelId`: UUID
- `tableId`: UUID (The Logical Table)
- `transform`: Matrix4x4 [x,y,z, rot...]
- `dimensions`: Vector3 [w,h,d]

---

## 2. WORKFLOWS

### 2.1 INGESTION & VALIDATION

1. **Upload**: Staff uploads scan data.
2. **Processing**: System converts/optimizes (External Pipeline).
3. **Validation (Automated)**:
   - Check file integrity.
   - Check basic bounding box (Is it room sized?).
   - If Valid -> Status: `PROCESSED`.
   - If Invalid -> Status: `REJECTED`.

### 2.2 ACTIVATION (MANUAL GATING)

- **Constraint**: `NO_AUTO_ACCEPT`.
- **Action**: Manager/Admin views the processed model.
- **Decision**: Click "Activate".
- **Effect**:
  - Sets `CurrentActiveModel.isActive = false`.
  - Sets `NewModel.isActive = true`.
  - Audits the switch.

### 2.3 SPATIAL ANCHORING

- Once a model is Active, Manager must "Pin" logical tables to the 3D mesh.
- **Tool**: Admin Spatial Editor.
- **Output**: Writes `ARAnchor` records.

---

## 3. ACCESS CONTROL

- **Staff**: Can Upload Scans. Can View Active Model (for navigation).
- **Guest**: **NO ACCESS**. Guests never download the raw geometry or point cloud (Privacy/IP).
- **Admin**: Can Delete Scans, Switch Active Versions.

---

## 4. IMPLEMENTATION STUBS

```typescript
class ArModelRegistry {
  async activateModel(modelId: string, actor: StaffMember): Promise<void> {
    const candidate = await this.get(modelId);
    
    // 1. Validate
    if (candidate.status !== 'PROCESSED') throw new Error("Model not ready");
    
    // 2. Deactivate Current
    const current = await this.findActive();
    if (current) {
      current.isActive = false;
      await this.save(current);
    }
    
    // 3. Activate New
    candidate.isActive = true;
    await this.save(candidate);
    
    // 4. Log
    await auditService.log({
      action: 'AR_MODEL_ACTIVATE',
      entityId: modelId,
      actorId: actor.id,
      meta: { previousModelId: current?.id }
    });
  }
}
```
