/**
 * RBAC PERMISSION TESTS
 * 
 * Test suite for role-based access control system
 */

import { Role, Permission, hasPermission, canAccessField, getAllowedTableStates, canViewStaffAnalytics } from '../rbac';

describe('RBAC Permission System', () => {
    describe('Role Permissions', () => {
        test('GUEST can create reservations', () => {
            expect(hasPermission(Role.GUEST, Permission.CREATE_RESERVATION)).toBe(true);
        });

        test('GUEST cannot view guest allergies', () => {
            expect(hasPermission(Role.GUEST, Permission.VIEW_GUEST_ALLERGIES)).toBe(false);
        });

        test('GUEST cannot view menu ingredients', () => {
            expect(hasPermission(Role.GUEST, Permission.VIEW_MENU_INGREDIENTS)).toBe(false);
        });

        test('SERVER can view guest allergies', () => {
            expect(hasPermission(Role.SERVER, Permission.VIEW_GUEST_ALLERGIES)).toBe(true);
        });

        test('SERVER can view menu ingredients', () => {
            expect(hasPermission(Role.SERVER, Permission.VIEW_MENU_INGREDIENTS)).toBe(true);
        });

        test('KITCHEN can manage 86 events', () => {
            expect(hasPermission(Role.KITCHEN, Permission.MANAGE_86_EVENTS)).toBe(true);
        });

        test('KITCHEN can view menu ingredients', () => {
            expect(hasPermission(Role.KITCHEN, Permission.VIEW_MENU_INGREDIENTS)).toBe(true);
        });

        test('HOST cannot manage 86 events', () => {
            expect(hasPermission(Role.HOST, Permission.MANAGE_86_EVENTS)).toBe(false);
        });

        test('MANAGER can view all analytics', () => {
            expect(hasPermission(Role.MANAGER, Permission.VIEW_ALL_ANALYTICS)).toBe(true);
        });

        test('SERVER can only view own analytics', () => {
            expect(hasPermission(Role.SERVER, Permission.VIEW_OWN_ANALYTICS)).toBe(true);
            expect(hasPermission(Role.SERVER, Permission.VIEW_ALL_ANALYTICS)).toBe(false);
        });

        test('ADMIN has all permissions', () => {
            const allPermissions = Object.values(Permission);
            allPermissions.forEach(permission => {
                expect(hasPermission(Role.ADMIN, permission)).toBe(true);
            });
        });
    });

    describe('Field-Level Access', () => {
        test('GUEST cannot access ingredient fields', () => {
            expect(canAccessField(Role.GUEST, 'menu', 'ingredients')).toBe(false);
        });

        test('SERVER can access ingredient fields', () => {
            expect(canAccessField(Role.SERVER, 'menu', 'ingredients')).toBe(true);
        });

        test('KITCHEN can access ingredient fields', () => {
            expect(canAccessField(Role.KITCHEN, 'menu', 'ingredients')).toBe(true);
        });

        test('GUEST cannot access allergy fields', () => {
            expect(canAccessField(Role.GUEST, 'guest', 'allergies')).toBe(false);
        });

        test('SERVER can access allergy fields', () => {
            expect(canAccessField(Role.SERVER, 'guest', 'allergies')).toBe(true);
        });

        test('KITCHEN can access allergy fields', () => {
            expect(canAccessField(Role.KITCHEN, 'guest', 'allergies')).toBe(true);
        });

        test('MANAGER can access allergy fields', () => {
            expect(canAccessField(Role.MANAGER, 'guest', 'allergies')).toBe(true);
        });
    });

    describe('Table State Permissions', () => {
        test('HOST can only access specific table states', () => {
            const allowedStates = getAllowedTableStates(Role.HOST);
            expect(allowedStates).toContain('AVAILABLE');
            expect(allowedStates).toContain('RESERVED');
            expect(allowedStates).toContain('SEATED');
            expect(allowedStates).not.toContain('FOOD_IN_PROGRESS');
        });

        test('SERVER can access dining flow states', () => {
            const allowedStates = getAllowedTableStates(Role.SERVER);
            expect(allowedStates).toContain('SEATED');
            expect(allowedStates).toContain('ORDERED');
            expect(allowedStates).toContain('FOOD_SERVED');
            expect(allowedStates).toContain('PAYING');
            expect(allowedStates).not.toContain('RESERVED');
        });

        test('KITCHEN can only access food-related states', () => {
            const allowedStates = getAllowedTableStates(Role.KITCHEN);
            expect(allowedStates).toContain('ORDERED');
            expect(allowedStates).toContain('FOOD_IN_PROGRESS');
            expect(allowedStates).toContain('FOOD_SERVED');
            expect(allowedStates).not.toContain('PAYING');
        });

        test('MANAGER can access all table states', () => {
            const allowedStates = getAllowedTableStates(Role.MANAGER);
            expect(allowedStates).toContain('OUT_OF_SERVICE');
            expect(allowedStates.length).toBeGreaterThan(5);
        });

        test('ADMIN can access all table states', () => {
            const allowedStates = getAllowedTableStates(Role.ADMIN);
            expect(allowedStates).toContain('OUT_OF_SERVICE');
            expect(allowedStates.length).toBeGreaterThan(5);
        });
    });

    describe('Staff Analytics Access', () => {
        test('Staff can view own analytics', () => {
            expect(canViewStaffAnalytics(Role.SERVER, 'staff-123', 'staff-123')).toBe(true);
        });

        test('Staff cannot view other staff analytics', () => {
            expect(canViewStaffAnalytics(Role.SERVER, 'staff-123', 'staff-456')).toBe(false);
        });

        test('MANAGER can view all staff analytics', () => {
            expect(canViewStaffAnalytics(Role.MANAGER, 'manager-123', 'staff-456')).toBe(true);
        });

        test('ADMIN can view all staff analytics', () => {
            expect(canViewStaffAnalytics(Role.ADMIN, 'admin-123', 'staff-456')).toBe(true);
        });
    });

    describe('PRD Compliance', () => {
        test('Ingredients are staff-only (PRD Section 5)', () => {
            expect(canAccessField(Role.GUEST, 'menu', 'ingredients')).toBe(false);
            expect(canAccessField(Role.SERVER, 'menu', 'ingredients')).toBe(true);
            expect(canAccessField(Role.KITCHEN, 'menu', 'ingredients')).toBe(true);
        });

        test('Allergies visible to Server, Kitchen, Manager only (PRD Section 5)', () => {
            expect(canAccessField(Role.GUEST, 'guest', 'allergies')).toBe(false);
            expect(canAccessField(Role.HOST, 'guest', 'allergies')).toBe(false);
            expect(canAccessField(Role.SERVER, 'guest', 'allergies')).toBe(true);
            expect(canAccessField(Role.KITCHEN, 'guest', 'allergies')).toBe(true);
            expect(canAccessField(Role.MANAGER, 'guest', 'allergies')).toBe(true);
        });

        test('Staff analytics self-only unless Manager/Admin (PRD Section 11)', () => {
            expect(canViewStaffAnalytics(Role.SERVER, 'staff-1', 'staff-1')).toBe(true);
            expect(canViewStaffAnalytics(Role.SERVER, 'staff-1', 'staff-2')).toBe(false);
            expect(canViewStaffAnalytics(Role.MANAGER, 'manager-1', 'staff-2')).toBe(true);
        });
    });
});
