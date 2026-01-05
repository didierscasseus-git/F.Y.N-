-- Migration: 006_create_audit_log
-- Description: Append-only audit log for all system actions

-- =====================================================
-- AUDIT LOG (APPEND-ONLY)
-- =====================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('GUEST', 'HOST', 'SERVER', 'KITCHEN', 'MANAGER', 'ADMIN', 'SYSTEM')),
    action VARCHAR(50) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'ACCESS')),
    target_entity VARCHAR(100) NOT NULL,
    target_id UUID,
    field_changes JSONB, -- { "field": { "old": value, "new": value } }
    reason_code VARCHAR(100),
    meta JSONB, -- Additional contextual data
    source_ip INET,
    user_agent TEXT
);

-- Indexes for audit queries
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, timestamp DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(target_entity, target_id, timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, timestamp DESC);

-- Prevent updates and deletes on audit log (append-only enforcement)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only. Modifications are not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_log_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER prevent_audit_log_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- Helper function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log_entry(
    p_actor_id UUID,
    p_role VARCHAR(50),
    p_action VARCHAR(50),
    p_target_entity VARCHAR(100),
    p_target_id UUID,
    p_field_changes JSONB DEFAULT NULL,
    p_reason_code VARCHAR(100) DEFAULT NULL,
    p_meta JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        actor_id,
        role,
        action,
        target_entity,
        target_id,
        field_changes,
        reason_code,
        meta
    ) VALUES (
        p_actor_id,
        p_role,
        p_action,
        p_target_entity,
        p_target_id,
        p_field_changes,
        p_reason_code,
        p_meta
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;
