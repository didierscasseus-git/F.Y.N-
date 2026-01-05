-- Migration: 004_create_staff_analytics_domains
-- Description: Staff members and analytics events

-- =====================================================
-- STAFF DOMAIN
-- =====================================================

-- StaffMember table
CREATE TABLE staff_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('GUEST', 'HOST', 'SERVER', 'KITCHEN', 'MANAGER', 'ADMIN')),
    pin_hash VARCHAR(255), -- For local authentication
    firebase_uid VARCHAR(255) UNIQUE, -- Firebase Auth UID
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_staff_members_role ON staff_members(role) WHERE active = TRUE;
CREATE INDEX idx_staff_members_firebase ON staff_members(firebase_uid);

-- =====================================================
-- ANALYTICS DOMAIN
-- =====================================================

-- AnalyticsEvent table (append-only)
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data JSONB NOT NULL,
    staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    guest_id UUID REFERENCES guest_profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_analytics_events_type ON analytics_events(event_type, timestamp DESC);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp DESC);
CREATE INDEX idx_analytics_events_staff ON analytics_events(staff_id, timestamp DESC);

-- Triggers
CREATE TRIGGER update_staff_members_updated_at BEFORE UPDATE ON staff_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add foreign keys that reference staff_members
ALTER TABLE guest_allergies ADD CONSTRAINT fk_guest_allergies_staff
    FOREIGN KEY (verified_by) REFERENCES staff_members(id) ON DELETE SET NULL;

ALTER TABLE table_state_events ADD CONSTRAINT fk_table_state_events_staff
    FOREIGN KEY (actor_id) REFERENCES staff_members(id) ON DELETE SET NULL;

ALTER TABLE inventory_adjustments ADD CONSTRAINT fk_inventory_adjustments_staff
    FOREIGN KEY (actor_id) REFERENCES staff_members(id) ON DELETE SET NULL;

ALTER TABLE eighty_six_events ADD CONSTRAINT fk_eighty_six_events_staff
    FOREIGN KEY (actor_id) REFERENCES staff_members(id) ON DELETE SET NULL;
