# Build Tasks

## Core Infrastructure

- [x] INIT_BUILD_GUARDRAILS
- [x] CONNECTORS_LAYER_V1
- [x] DATA_MODEL_V1_POSTGRES
- [x] AUTH_RBAC_V1_FIREBASE
- [x] AUDIT_LOG_ENGINE_V1

## Application Modules

- [x] GUEST_PROFILE_MODULE_V1
- [x] MENU_AND_INGREDIENTS_MODULE_V1
- [x] RESERVATIONS_MODULE_V1
- [x] ALLERGY_CROSSCHECK_ENGINE_V1
- [x] WAITLIST_MODULE_V1
- [x] TABLES_AND_STATES_MODULE_V1
- [x] TABLE_STATUS_SUGGESTION_ENGINE_V1
- [x] INVENTORY_MODULE_V1
- [x] EIGHTY_SIX_ENGINE_V1
- [x] ADD_86_ANALYTICS_V1

## Integrations

- [x] POS_INTEGRATION_LAYER_V1
  - [x] Create POS Adapter Interface
  - [x] Implement Mock POS Adapter
  - [x] Create POS Service & Webhook Routes
  - [x] Implement Pub/Sub Event Publishing
  - [x] Integrate with Table Suggestion Engine

- [x] NOTIFICATION_ENGINE_V1
  - [x] Enable Event Publishing in Table, Reservation, Inventory
  - [x] Create Notification Schema & Service
  - [x] Implement Subscriptions (POS, Table, Inv, Res, AR)
  - [x] API Endpoints for Notifications

- [x] AR_SCAN_AND_MODEL_BACKEND_V1
  - [x] Create AR Module & Schemas (Model, Anchor)
  - [x] Implement AR Model Service (Upload/Storage logic)
  - [x] Implement AR Anchor Service (Table Mapping)
  - [x] API Endpoints for AR Scan & Anchors

- [x] AR_TABLE_ZONE_MAPPING_V1
  - [x] Logic to map World Coordinates to Tables (via Anchors)
  - [x] Integration with Table Service (FK)

## Release Engineering

- [x] BUILD_VERIFICATION_V1
- [x] BUILD_LOCK_V1

## Post-Review Optimization (P0 Fixes)

- [x] Fix Notification subscription crash risk (Error Boundary)
- [x] Optimize Allergy Crosscheck N+1 query problem
- [x] Implement Global Error Handler in server.ts
- [x] Add 404 handler for unmapped routes
