-- Migration: 005_create_ar_domain
-- Description: AR scanning, models, and anchors

-- =====================================================
-- AR & SPATIAL DOMAIN
-- =====================================================

-- ARScan table
CREATE TABLE ar_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE RESTRICT,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    device_metadata JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'REJECTED', 'ACTIVE')),
    scan_method VARCHAR(50) NOT NULL CHECK (scan_method IN ('LIDAR', 'PHOTOGRAMMETRY')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ar_scans_staff ON ar_scans(staff_id);
CREATE INDEX idx_ar_scans_status ON ar_scans(status);
CREATE INDEX idx_ar_scans_timestamp ON ar_scans(timestamp DESC);

-- ARModel table
CREATE TABLE ar_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES ar_scans(id) ON DELETE RESTRICT,
    file_url TEXT NOT NULL,
    format VARCHAR(50) NOT NULL CHECK (format IN ('USDZ', 'GLB', 'OBJ')),
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ar_models_scan ON ar_models(scan_id);
CREATE INDEX idx_ar_models_active ON ar_models(is_active) WHERE is_active = TRUE;
CREATE UNIQUE INDEX idx_ar_models_active_unique ON ar_models(is_active) WHERE is_active = TRUE;

-- ARAnchor table
CREATE TABLE ar_anchors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES ar_models(id) ON DELETE RESTRICT,
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE RESTRICT,
    transform_matrix JSONB NOT NULL, -- 4x4 transformation matrix
    confidence DECIMAL(3, 2), -- 0.00-1.00
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ar_anchors_model ON ar_anchors(model_id);
CREATE INDEX idx_ar_anchors_table ON ar_anchors(table_id);
CREATE UNIQUE INDEX idx_ar_anchors_table_unique ON ar_anchors(table_id);

-- Triggers
CREATE TRIGGER update_ar_scans_updated_at BEFORE UPDATE ON ar_scans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ar_anchors_updated_at BEFORE UPDATE ON ar_anchors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
