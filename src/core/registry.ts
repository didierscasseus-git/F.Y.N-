/**
 * MODULE REGISTRY
 * 
 * Central registry for all system modules.
 * Enforces PRD compliance and stack lock.
 */

export enum ModuleStatus {
    NOT_STARTED = 'NOT_STARTED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    LOCKED = 'LOCKED'
}

export interface ModuleDefinition {
    id: string;
    name: string;
    prdSection: string;
    status: ModuleStatus;
    dependencies: string[];
    endpoints: string[];
    resources: string[];
    stackComponents: {
        database?: 'POSTGRESQL';
        events?: 'PUBSUB';
        auth?: 'FIREBASE_AUTH';
        analytics?: 'BIGQUERY';
    };
}

/**
 * STACK LOCK - Enforced technology constraints
 */
export const STACK_LOCK = {
    DB: 'POSTGRESQL',
    EVENTS: 'PUBSUB',
    AUTH: 'FIREBASE_AUTH',
    ANALYTICS: 'BIGQUERY'
} as const;

/**
 * MODULE REGISTRY
 */
export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
    GUEST_PROFILE: {
        id: 'GUEST_PROFILE',
        name: 'Guest Profile Module',
        prdSection: 'Section 4',
        status: ModuleStatus.NOT_STARTED,
        dependencies: ['AUTH_RBAC', 'AUDIT_LOG'],
        endpoints: ['/api/v1/guests'],
        resources: ['GuestProfile', 'GuestPreference', 'GuestAllergy'],
        stackComponents: {
            database: 'POSTGRESQL',
            auth: 'FIREBASE_AUTH'
        }
    },

    ALLERGY_CROSSCHECK: {
        id: 'ALLERGY_CROSSCHECK',
        name: 'Allergy Crosscheck Engine',
        prdSection: 'Section 5',
        status: ModuleStatus.NOT_STARTED,
        dependencies: ['GUEST_PROFILE', 'MENU_INGREDIENTS'],
        endpoints: ['/api/v1/allergies/check'],
        resources: ['GuestAllergy', 'MenuItemIngredient'],
        stackComponents: {
            database: 'POSTGRESQL',
            events: 'PUBSUB'
        }
    },

    RESERVATIONS: {
        id: 'RESERVATIONS',
        name: 'Reservations Module',
        prdSection: 'Section 6',
        status: ModuleStatus.NOT_STARTED,
        dependencies: ['GUEST_PROFILE', 'TABLES'],
        endpoints: ['/api/v1/reservations'],
        resources: ['Reservation'],
        stackComponents: {
            database: 'POSTGRESQL',
            events: 'PUBSUB'
        }
    },

    WAITLIST: {
        id: 'WAITLIST',
        name: 'Waitlist Module',
        prdSection: 'Section 7',
        status: ModuleStatus.NOT_STARTED,
        dependencies: ['GUEST_PROFILE', 'TABLES'],
        endpoints: ['/api/v1/waitlist'],
        resources: ['WaitlistEntry'],
        stackComponents: {
            database: 'POSTGRESQL',
            events: 'PUBSUB'
        }
    },

    TABLES_AND_STATES: {
        id: 'TABLES_AND_STATES',
        name: 'Tables and States Module',
        prdSection: 'Sections 8, 8A, 8B, 8C',
        status: ModuleStatus.NOT_STARTED,
        dependencies: ['AUDIT_LOG'],
        endpoints: ['/api/v1/tables', '/api/v1/tables/:id/state'],
        resources: ['Table', 'TableStateEvent'],
        stackComponents: {
            database: 'POSTGRESQL',
            events: 'PUBSUB',
            analytics: 'BIGQUERY'
        }
    },

    EIGHTY_SIX: {
        id: 'EIGHTY_SIX',
        name: '86 Engine',
        prdSection: 'Sections 10, 10A',
        status: ModuleStatus.NOT_STARTED,
        dependencies: ['INVENTORY', 'MENU_INGREDIENTS'],
        endpoints: ['/api/v1/menu/86'],
        resources: ['MenuItem', 'EightySixEvent', 'InventoryItem'],
        stackComponents: {
            database: 'POSTGRESQL',
            events: 'PUBSUB',
            analytics: 'BIGQUERY'
        }
    },

    ANALYTICS: {
        id: 'ANALYTICS',
        name: 'Analytics Core',
        prdSection: 'Sections 11, 11A',
        status: ModuleStatus.NOT_STARTED,
        dependencies: ['TABLES_AND_STATES', 'EIGHTY_SIX'],
        endpoints: ['/api/v1/analytics'],
        resources: ['AnalyticsEvent'],
        stackComponents: {
            analytics: 'BIGQUERY',
            events: 'PUBSUB'
        }
    },

    AR_SCAN: {
        id: 'AR_SCAN',
        name: 'AR Scan and Model Backend',
        prdSection: 'Section 12',
        status: ModuleStatus.IN_PROGRESS,
        dependencies: ['TABLES_AND_STATES', 'AUTH_RBAC'],
        endpoints: ['/api/v1/ar/anchors', '/api/v1/ar/models'],
        resources: ['ArModel', 'ArAnchor'],
        stackComponents: {
            database: 'POSTGRESQL',
            events: 'PUBSUB'
        }
    },

    AUTH_RBAC: {
        id: 'AUTH_RBAC',
        name: 'Auth and RBAC',
        prdSection: 'Sections 2, 13',
        status: ModuleStatus.NOT_STARTED,
        dependencies: [],
        endpoints: ['/api/v1/auth'],
        resources: ['StaffMember'],
        stackComponents: {
            database: 'POSTGRESQL',
            auth: 'FIREBASE_AUTH'
        }
    },

    AUDIT_LOG: {
        id: 'AUDIT_LOG',
        name: 'Audit Log Engine',
        prdSection: 'Section 13',
        status: ModuleStatus.NOT_STARTED,
        dependencies: [],
        endpoints: ['/api/v1/audit'],
        resources: ['AuditLog'],
        stackComponents: {
            database: 'POSTGRESQL',
            analytics: 'BIGQUERY'
        }
    },

    POS_INTEGRATION: {
        id: 'POS_INTEGRATION',
        name: 'POS Integration Layer',
        prdSection: 'Integration',
        status: ModuleStatus.IN_PROGRESS,
        dependencies: ['TABLES_AND_STATES'],
        endpoints: ['/api/v1/pos/webhook/:provider'],
        resources: ['PosEvent'],
        stackComponents: {
            events: 'PUBSUB',
            database: 'POSTGRESQL'
        }
    },

    NOTIFICATION_ENGINE: {
        id: 'NOTIFICATION_ENGINE',
        name: 'Notification Engine',
        prdSection: 'Notifications',
        status: ModuleStatus.IN_PROGRESS,
        dependencies: ['POS_INTEGRATION', 'INVENTORY_MODULE', 'TABLES_AND_STATES', 'RESERVATIONS'],
        endpoints: ['/api/v1/notifications'],
        resources: ['Notification'],
        stackComponents: {
            database: 'POSTGRESQL',
            events: 'PUBSUB'
        }
    }
};

/**
 * Get module by ID
 */
export function getModule(id: string): ModuleDefinition | undefined {
    return MODULE_REGISTRY[id];
}

/**
 * List all modules
 */
export function listModules(): ModuleDefinition[] {
    return Object.values(MODULE_REGISTRY);
}

/**
 * Check if module dependencies are satisfied
 */
export function checkDependencies(moduleId: string): { satisfied: boolean; missing: string[] } {
    const module = getModule(moduleId);
    if (!module) {
        return { satisfied: false, missing: [] };
    }

    const missing = module.dependencies.filter(depId => {
        const dep = getModule(depId);
        return !dep || dep.status !== ModuleStatus.COMPLETED;
    });

    return {
        satisfied: missing.length === 0,
        missing
    };
}

/**
 * Update module status
 */
export function updateModuleStatus(moduleId: string, status: ModuleStatus): void {
    const module = getModule(moduleId);
    if (module) {
        module.status = status;
    }
}
