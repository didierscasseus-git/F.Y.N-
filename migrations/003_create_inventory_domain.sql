-- Migration: 003_create_inventory_domain
-- Description: Menu items, ingredients, inventory, and 86 events

-- =====================================================
-- INVENTORY & MENU DOMAIN
-- =====================================================

-- MenuItem table
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    prep_time_estimate INTEGER, -- Minutes
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'EIGHTY_SIXED')),
    is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
    active_ingredient_set_id UUID, -- For versioning
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_menu_items_status ON menu_items(status);
CREATE INDEX idx_menu_items_category ON menu_items(category);

-- InventoryItem table
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
    minimum_sellable_quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'IN_STOCK' CHECK (status IN ('IN_STOCK', 'LOW', 'OUT')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_items_status ON inventory_items(status);
CREATE INDEX idx_inventory_items_stock ON inventory_items(current_stock);

-- MenuItemIngredient table (junction with quantities)
CREATE TABLE menu_item_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    quantity_required DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    is_optional BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_menu_item_ingredients_menu ON menu_item_ingredients(menu_item_id);
CREATE INDEX idx_menu_item_ingredients_inventory ON menu_item_ingredients(inventory_item_id);

-- InventoryAdjustment table (append-only)
CREATE TABLE inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    adjustment_amount DECIMAL(10, 2) NOT NULL, -- Positive or negative
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('WASTE', 'RESTOCK', 'CORRECTION', 'POS_SALE')),
    actor_id UUID, -- FK to staff_members, added later
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX idx_inventory_adjustments_item ON inventory_adjustments(inventory_item_id, timestamp DESC);
CREATE INDEX idx_inventory_adjustments_reason ON inventory_adjustments(reason, timestamp DESC);

-- EightySixEvent table (append-only)
CREATE TABLE eighty_six_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL CHECK (status IN ('AVAILABLE', 'EIGHTY_SIXED')),
    reason TEXT NOT NULL,
    actor_id UUID, -- FK to staff_members, added later
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_eighty_six_events_menu ON eighty_six_events(menu_item_id, timestamp DESC);
CREATE INDEX idx_eighty_six_events_status ON eighty_six_events(status, timestamp DESC);

-- Triggers
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
