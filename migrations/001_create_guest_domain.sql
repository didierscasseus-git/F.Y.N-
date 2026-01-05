-- Migration: 001_create_guest_domain
-- Description: Guest profiles, preferences, allergies, and visits

-- =====================================================
-- GUEST DOMAIN
-- =====================================================

-- GuestProfile table
CREATE TABLE guest_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone_number TEXT, -- Encrypted
    email TEXT, -- Encrypted
    visit_count INTEGER NOT NULL DEFAULT 0,
    last_visit TIMESTAMP,
    vip_status BOOLEAN NOT NULL DEFAULT FALSE,
    opt_out BOOLEAN NOT NULL DEFAULT FALSE,
    retention_policy VARCHAR(50) NOT NULL DEFAULT 'INDEFINITE' CHECK (retention_policy IN ('INDEFINITE', 'REQUEST_DELETE')),
    deleted_at TIMESTAMP, -- Soft delete support
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_guest_profiles_phone ON guest_profiles(phone_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_guest_profiles_email ON guest_profiles(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_guest_profiles_vip ON guest_profiles(vip_status) WHERE deleted_at IS NULL AND vip_status = TRUE;

-- GuestPreference table
CREATE TABLE guest_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('SEATING', 'MENU', 'SERVICE', 'OTHER')),
    preference_value TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_guest_preferences_guest ON guest_preferences(guest_id);
CREATE INDEX idx_guest_preferences_category ON guest_preferences(guest_id, category);

-- GuestAllergy table
CREATE TABLE guest_allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
    allergen VARCHAR(255) NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING')),
    verified_by UUID, -- FK to staff_members, added later
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_guest_allergies_guest ON guest_allergies(guest_id);
CREATE INDEX idx_guest_allergies_severity ON guest_allergies(guest_id, severity);

-- GuestVisit table
CREATE TABLE guest_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
    reservation_id UUID, -- FK to reservations, added later
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    party_size INTEGER NOT NULL,
    spend_amount DECIMAL(10, 2),
    table_id UUID, -- FK to tables, added later
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_guest_visits_guest ON guest_visits(guest_id);
CREATE INDEX idx_guest_visits_timestamp ON guest_visits(timestamp DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_guest_profiles_updated_at BEFORE UPDATE ON guest_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guest_allergies_updated_at BEFORE UPDATE ON guest_allergies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
