/**
 * RBAC SYSTEM
 * 
 * Role-based access control with field-level permissions.
 * STACK LOCK: FIREBASE_AUTH
 */

export enum Role {
    GUEST = 'GUEST',
    HOST = 'HOST',
    SERVER = 'SERVER',
    KITCHEN = 'KITCHEN',
    MANAGER = 'MANAGER',
    ADMIN = 'ADMIN'
}

export enum Permission {
    // Guest Profile
    VIEW_GUEST_PROFILE = 'VIEW_GUEST_PROFILE',
    CREATE_GUEST_PROFILE = 'CREATE_GUEST_PROFILE',
    UPDATE_GUEST_PROFILE = 'UPDATE_GUEST_PROFILE',
    DELETE_GUEST_PROFILE = 'DELETE_GUEST_PROFILE',
    VIEW_GUEST_ALLERGIES = 'VIEW_GUEST_ALLERGIES',
    MANAGE_GUEST_ALLERGIES = 'MANAGE_GUEST_ALLERGIES',

    // Reservations
    VIEW_RESERVATIONS = 'VIEW_RESERVATIONS',
    CREATE_RESERVATION = 'CREATE_RESERVATION',
    UPDATE_RESERVATION = 'UPDATE_RESERVATION',
    CANCEL_RESERVATION = 'CANCEL_RESERVATION',

    // Waitlist
    VIEW_WAITLIST = 'VIEW_WAITLIST',
    MANAGE_WAITLIST = 'MANAGE_WAITLIST',

    // Tables
    VIEW_TABLES = 'VIEW_TABLES',
    UPDATE_TABLE_STATE = 'UPDATE_TABLE_STATE',
    OVERRIDE_TABLE_STATE = 'OVERRIDE_TABLE_STATE',

    // Menu & Inventory
    VIEW_MENU = 'VIEW_MENU',
    VIEW_MENU_INGREDIENTS = 'VIEW_MENU_INGREDIENTS', // Staff-only
    MANAGE_MENU = 'MANAGE_MENU',
    MANAGE_INVENTORY = 'MANAGE_INVENTORY',
    MANAGE_86_EVENTS = 'MANAGE_86_EVENTS',

    // Analytics
    VIEW_OWN_ANALYTICS = 'VIEW_OWN_ANALYTICS',
    VIEW_ALL_ANALYTICS = 'VIEW_ALL_ANALYTICS',

    // AR
    MANAGE_AR = 'MANAGE_AR',
    VIEW_AR_MODELS = 'VIEW_AR_MODELS',
    MANAGE_AR_SCANS = 'MANAGE_AR_SCANS',

    // Audit
    VIEW_AUDIT_LOG = 'VIEW_AUDIT_LOG'
}

/**
 * Permission Matrix
 * Defines which roles have which permissions
 */
export const PERMISSION_MATRIX: Record<Role, Permission[]> = {
    [Role.GUEST]: [
        Permission.VIEW_GUEST_PROFILE,
        Permission.UPDATE_GUEST_PROFILE,
        Permission.VIEW_MENU,
        Permission.CREATE_RESERVATION,
        Permission.UPDATE_RESERVATION,
        Permission.CANCEL_RESERVATION
    ],

    [Role.HOST]: [
        Permission.VIEW_GUEST_PROFILE,
        Permission.CREATE_GUEST_PROFILE,
        Permission.UPDATE_GUEST_PROFILE,
        Permission.VIEW_MENU,
        Permission.VIEW_RESERVATIONS,
        Permission.CREATE_RESERVATION,
        Permission.UPDATE_RESERVATION,
        Permission.VIEW_WAITLIST,
        Permission.MANAGE_WAITLIST,
        Permission.VIEW_TABLES,
        Permission.UPDATE_TABLE_STATE, // Limited states
        Permission.VIEW_OWN_ANALYTICS
    ],

    [Role.SERVER]: [
        Permission.VIEW_GUEST_PROFILE,
        Permission.CREATE_GUEST_PROFILE,
        Permission.UPDATE_GUEST_PROFILE,
        Permission.VIEW_GUEST_ALLERGIES,
        Permission.MANAGE_GUEST_ALLERGIES,
        Permission.VIEW_MENU,
        Permission.VIEW_MENU_INGREDIENTS, // Staff-only
        Permission.VIEW_RESERVATIONS,
        Permission.VIEW_WAITLIST,
        Permission.VIEW_TABLES,
        Permission.UPDATE_TABLE_STATE,
        Permission.VIEW_OWN_ANALYTICS
    ],

    [Role.KITCHEN]: [
        Permission.VIEW_GUEST_ALLERGIES,
        Permission.VIEW_MENU,
        Permission.VIEW_MENU_INGREDIENTS, // Staff-only
        Permission.VIEW_TABLES,
        Permission.UPDATE_TABLE_STATE, // Food states only
        Permission.MANAGE_86_EVENTS,
        Permission.MANAGE_INVENTORY,
        Permission.VIEW_OWN_ANALYTICS
    ],

    [Role.MANAGER]: [
        Permission.VIEW_GUEST_PROFILE,
        Permission.CREATE_GUEST_PROFILE,
        Permission.UPDATE_GUEST_PROFILE,
        Permission.DELETE_GUEST_PROFILE,
        Permission.VIEW_GUEST_ALLERGIES,
        Permission.MANAGE_GUEST_ALLERGIES,
        Permission.VIEW_MENU,
        Permission.VIEW_MENU_INGREDIENTS,
        Permission.MANAGE_MENU,
        Permission.VIEW_RESERVATIONS,
        Permission.CREATE_RESERVATION,
        Permission.UPDATE_RESERVATION,
        Permission.CANCEL_RESERVATION,
        Permission.VIEW_WAITLIST,
        Permission.MANAGE_WAITLIST,
        Permission.VIEW_TABLES,
        Permission.UPDATE_TABLE_STATE,
        Permission.OVERRIDE_TABLE_STATE,
        Permission.MANAGE_86_EVENTS,
        Permission.MANAGE_INVENTORY,
        Permission.VIEW_OWN_ANALYTICS,
        Permission.VIEW_ALL_ANALYTICS,
        Permission.MANAGE_AR,
        Permission.VIEW_AR_MODELS,
        Permission.MANAGE_AR_SCANS,
        Permission.VIEW_AUDIT_LOG
    ],

    [Role.ADMIN]: [
        // Admin has all permissions
        ...Object.values(Permission)
    ]
};

/**
 * Check if a role has a permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
    const rolePermissions = PERMISSION_MATRIX[role];
    return rolePermissions.includes(permission);
}

/**
 * Check if a role can access a field
 */
export function canAccessField(role: Role, entity: string, field: string): boolean {
    // Ingredients are staff-only
    if (field.toLowerCase().includes('ingredient')) {
        return [Role.SERVER, Role.KITCHEN, Role.MANAGER, Role.ADMIN].includes(role);
    }

    // Allergies are restricted
    if (field.toLowerCase().includes('allerg')) {
        return hasPermission(role, Permission.VIEW_GUEST_ALLERGIES);
    }

    // Staff analytics restricted
    if (entity === 'analytics' && field.includes('staff')) {
        return hasPermission(role, Permission.VIEW_ALL_ANALYTICS);
    }

    return true;
}

/**
 * Get allowed table states for a role
 */
export function getAllowedTableStates(role: Role): string[] {
    switch (role) {
        case Role.HOST:
            return ['AVAILABLE', 'RESERVED', 'SEATED'];
        case Role.SERVER:
            return ['SEATED', 'ORDERED', 'FOOD_SERVED', 'PAYING', 'CLEANING'];
        case Role.KITCHEN:
            return ['ORDERED', 'FOOD_IN_PROGRESS', 'FOOD_SERVED'];
        case Role.MANAGER:
        case Role.ADMIN:
            return ['AVAILABLE', 'RESERVED', 'SEATED', 'ORDERED', 'FOOD_IN_PROGRESS',
                'FOOD_SERVED', 'PAYING', 'CLEANING', 'OUT_OF_SERVICE'];
        default:
            return [];
    }
}

/**
 * Check if user can view analytics for a specific staff member
 */
export function canViewStaffAnalytics(
    viewerRole: Role,
    viewerStaffId: string,
    targetStaffId: string
): boolean {
    // Managers and admins can view all
    if (hasPermission(viewerRole, Permission.VIEW_ALL_ANALYTICS)) {
        return true;
    }

    // Others can only view their own
    return viewerStaffId === targetStaffId;
}
