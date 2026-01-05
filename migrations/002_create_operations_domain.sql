-- Migration: 002_create_operations_domain
-- Description: Reservations, waitlist, tables, and table state events

-- =====================================================
-- OPERATIONS DOMAIN
-- =====================================================

-- Reservation table
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guest_profiles(id) ON DELETE RESTRICT,
    party_size INTEGER NOT NULL,
    reservation_time TIMESTAMP NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 90,
    status VARCHAR(50) NOT NULL CHECK (status IN ('BOOKED', 'ARRIVED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
    notes TEXT,
    source VARCHAR(50) NOT NULL CHECK (source IN ('PHONE', 'WEB', 'WALK_IN')),
    confirmation_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reservations_guest ON reservations(guest_id);
CREATE INDEX idx_reservations_time ON reservations(reservation_time);
CREATE INDEX idx_reservations_status ON reservations(status) WHERE status IN ('BOOKED', 'ARRIVED');

-- WaitlistEntry table
CREATE TABLE waitlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_name VARCHAR(255) NOT NULL,
    party_size INTEGER NOT NULL,
    phone_number VARCHAR(50),
    arrival_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    quoted_wait_time INTEGER, -- Minutes
    estimated_seating_time TIMESTAMP,
    status VARCHAR(50) NOT NULL CHECK (status IN ('WAITING', 'NOTIFIED', 'SEATED', 'CANCELLED', 'NO_SHOW')),
    priority VARCHAR(50) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'VIP', 'HIGH')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_waitlist_status ON waitlist_entries(status) WHERE status = 'WAITING';
CREATE INDEX idx_waitlist_arrival ON waitlist_entries(arrival_time);
CREATE INDEX idx_waitlist_priority ON waitlist_entries(priority, arrival_time) WHERE status = 'WAITING';

-- Table table
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    zone VARCHAR(100) NOT NULL,
    capacity INTEGER NOT NULL,
    is_combinable BOOLEAN NOT NULL DEFAULT FALSE,
    is_accessible BOOLEAN NOT NULL DEFAULT FALSE,
    current_state VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE' CHECK (
        current_state IN (
            'AVAILABLE', 'RESERVED', 'SEATED', 'ORDERED', 
            'FOOD_IN_PROGRESS', 'FOOD_SERVED', 'PAYING', 
            'CLEANING', 'OUT_OF_SERVICE'
        )
    ),
    state_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active_order_id VARCHAR(255), -- POS reference
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tables_state ON tables(current_state);
CREATE INDEX idx_tables_zone ON tables(zone);
CREATE INDEX idx_tables_capacity ON tables(capacity);

-- TableStateEvent table (append-only)
CREATE TABLE table_state_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE RESTRICT,
    previous_state VARCHAR(50),
    new_state VARCHAR(50) NOT NULL,
    source VARCHAR(50) NOT NULL CHECK (source IN ('MANUAL', 'POS', 'AI_SUGGESTED', 'AI_AUTO')),
    actor_id UUID, -- FK to staff_members, added later
    reason_code VARCHAR(100),
    confidence DECIMAL(3, 2), -- AI confidence 0.00-1.00
    evidence JSONB, -- Evidence for AI suggestions
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_table_state_events_table ON table_state_events(table_id, timestamp DESC);
CREATE INDEX idx_table_state_events_source ON table_state_events(source, timestamp DESC);

-- Triggers
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_waitlist_entries_updated_at BEFORE UPDATE ON waitlist_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add foreign keys that reference tables
ALTER TABLE guest_visits ADD CONSTRAINT fk_guest_visits_reservation
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL;

ALTER TABLE guest_visits ADD CONSTRAINT fk_guest_visits_table
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL;
