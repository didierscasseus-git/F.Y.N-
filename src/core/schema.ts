import { z } from 'zod';

// --- ENUMS ---

export const RoleEnum = z.enum([
    'GUEST',
    'HOST',
    'SERVER',
    'KITCHEN',
    'EXPO',
    'MANAGER',
    'ADMIN',
    'SYSTEM',
    'POS'
]);

export const TableStateEnum = z.enum([
    'AVAILABLE',
    'RESERVED',
    'ARRIVED',
    'SEATED',
    'ORDERED',
    'FOOD_IN_PROGRESS',
    'FOOD_SERVED',
    'PAYING',
    'CLEANING',
    'OUT_OF_SERVICE'
]);

export const ReservationStatusEnum = z.enum([
    'BOOKED',
    'ARRIVED',
    'SEATED',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW'
]);

export const EightySixStateEnum = z.enum([
    'AVAILABLE',
    'EIGHTY_SIXED'
]);

export const ReservationDurationEnum = z.enum([
    'SHORT_60',
    'STD_90',
    'LONG_120'
]);

export const SourceEnum = z.enum([
    'MANUAL',
    'POS',
    'AI_SUGGESTED',
    'AI_SUGGESTED',
    'AI_AUTO'
]);

export const WaitlistStatusEnum = z.enum([
    'WAITING',
    'NOTIFIED',
    'SEATED',
    'POPPED',
    'CANCELLED'
]);

// --- ENTITY SCHEMAS ---

export const GuestProfileSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    phoneNumber: z.string().optional(),
    email: z.string().email().optional(),
    visitCount: z.number().int().default(0),
    vipStatus: z.boolean().default(false),
    optOut: z.boolean().default(false),
    createdAt: z.string().datetime(), // ISO string
    updatedAt: z.string().datetime()
});

export const GuestAllergySchema = z.object({
    id: z.string().uuid(),
    guestId: z.string().uuid(),
    allergen: z.string().min(1),
    severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING']),
    verifiedBy: z.string().uuid() // Staff ID
});

export const ReservationSchema = z.object({
    id: z.string().uuid(),
    guestId: z.string().uuid(),
    partySize: z.number().int().positive(),
    reservationTime: z.string().datetime(),
    duration: ReservationDurationEnum.default('STD_90'),
    status: ReservationStatusEnum,
    notes: z.string().optional(),
    source: z.enum(['PHONE', 'WEB', 'WALK_IN']),
    tags: z.array(z.string()).default([])
});

export const WaitlistEntrySchema = z.object({
    id: z.string().uuid(),
    guestId: z.string().uuid(),
    partySize: z.number().int().positive(),
    checkInTime: z.string().datetime(),
    status: WaitlistStatusEnum.default('WAITING'),
    estimatedWaitMinutes: z.number().int().nonnegative().default(0),
    notes: z.string().optional(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional()
});

export const TableSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    zone: z.string(),
    capacity: z.number().int().positive(),
    currentState: TableStateEnum,
    activeOrderId: z.string().optional(), // POS Link
    stateUpdatedAt: z.string().datetime()
});

export const TableStateEventSchema = z.object({
    id: z.string().uuid(),
    tableId: z.string().uuid(),
    previousState: TableStateEnum.optional(),
    newState: TableStateEnum,
    source: SourceEnum,
    actorId: z.string(),
    reasonCode: z.string().optional(),
    timestamp: z.string().datetime()
});

export const MenuItemSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    price: z.number().positive(),
    status: EightySixStateEnum,
    activeIngredientSetId: z.string().uuid().optional()
});

export const InventoryItemSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    currentStock: z.number(),
    reorderThreshold: z.number(),
    unit: z.string()
});

export const EightySixEventSchema = z.object({
    id: z.string().uuid(),
    menuItemId: z.string().uuid(),
    status: EightySixStateEnum,
    reason: z.string(),
    actorId: z.string(),
    timestamp: z.string().datetime()
});

export const AuditLogSchema = z.object({
    id: z.string().uuid(),
    timestamp: z.string().datetime(),
    actorId: z.string(),
    role: RoleEnum,
    action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'OVERRIDE']),
    entity: z.string(),
    entityId: z.string(),
    beforeState: z.record(z.any()).optional(),
    afterState: z.record(z.any()).optional(),
    source: SourceEnum,
    reasonCode: z.string().optional()
});

// --- TYPE INFERENCE ---
export type Role = z.infer<typeof RoleEnum>;
export type TableState = z.infer<typeof TableStateEnum>;
export type ReservationStatus = z.infer<typeof ReservationStatusEnum>;
export type GuestProfile = z.infer<typeof GuestProfileSchema>;
export type GuestAllergy = z.infer<typeof GuestAllergySchema>;
export type Reservation = z.infer<typeof ReservationSchema>;
export type WaitlistEntry = z.infer<typeof WaitlistEntrySchema>;
export type Table = z.infer<typeof TableSchema>;
export type TableStateEvent = z.infer<typeof TableStateEventSchema>;
export type MenuItem = z.infer<typeof MenuItemSchema>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type EightySixEvent = z.infer<typeof EightySixEventSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
