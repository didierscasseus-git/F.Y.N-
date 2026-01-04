# MENU AND INGREDIENTS MODULE V1

# STATUS: AUTHORITATIVE

# VERSION: 1.0.0

## 1. DATA STRUCTURE

### 1.1 MENU ITEM

- `id`: UUID
- `name`: String
- `description`: String (Public)
- `price`: Decimal
- `timingEstimate`: Int (Minutes)
- `activeIngredientSetId`: UUID (Links to specific version of ingredients)

### 1.2 INGREDIENT SET (VERSIONED)

- `id`: UUID
- `menuItemId`: UUID
- `version`: Integer
- `ingredients`: List<MenuItemIngredient>
- `effectiveDate`: DateTime
- `authorId`: UUID (Kitchen/Manager)

### 1.3 PERMISSIONS

- **Public/Guest**: Can view `name`, `description`, `price`. **CANNOT** view `ingredients` directly (only filtered warnings).
- **Kitchen/Manager**: Full Read/Write access.
- **Server**: Read access to ingredients (for customer query).

---

## 2. CRUD OPERATIONS

### 2.1 CREATE / UPDATE ITEM

`POST /api/menu/item`

- **Role**: Manager/Admin.
- **Logic**: Creates base item.

### 2.2 UPDATE INGREDIENTS (VERSIONED)

`POST /api/menu/item/:id/ingredients`

- **Role**: Kitchen/Manager.
- **Input**: List of `{ inventoryItemId, quantity, unit, isOptional }`.
- **Logic**:
  1. Does NOT overwrite old set.
  2. Creates NEW `IngredientSet` with logical increment `version`.
  3. Updates `MenuItem.activeIngredientSetId`.
  4. Logs change.

### 2.3 GET ITEM DETAILS

`GET /api/menu/item/:id`

- **Role Interceptor**:
  - If `GUEST`: Returns clean JSON (Name, Price, Desc).
  - If `STAFF`: Returns detailed JSON (Name, Price, Desc, **Ingredients**, **StockStatus**).

---

## 3. ALLERGEN TAGGING

- Ingredients are linked to `InventoryItem` records.
- `InventoryItem` has a field `allergenTags` (Array of Enums: PEANUT, DAIRY, SHELLFISH, etc.).
- When retrieving ingredients for a Menu Item, the system dynamically aggregates all tags from the constituent inventory items.

## 4. AUDIT

- Any change to an ingredient definition is a **SAFETY CRITICAL** event.
- Must log: `Actor`, `OldVersion`, `NewVersion`, `Time`.

```typescript
// Example: Aggregating Allergens
function getItemAllergens(item: MenuItem): Allergen[] {
  const ingredients = getActiveIngredientSet(item.id);
  const tags = new Set<Allergen>();
  
  for (const ing of ingredients) {
    const inventoryItem = getInventoryItem(ing.inventoryItemId);
    inventoryItem.allergenTags.forEach(tag => tags.add(tag));
  }
  
  return Array.from(tags);
}
```
