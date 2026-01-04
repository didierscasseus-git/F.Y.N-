import { MenuItem, MenuItemSchema, EightySixStateEnum, Role } from '../../core/schema';
import { AuditService } from '../../core/audit/AuditService';
import { AppError, ErrorCodes } from '../../core/errors/AppError';
import prisma from '../../core/prisma';
import { v4 as uuidv4 } from 'uuid';

export class MenuService {
    private audit = AuditService.getInstance();

    public async createItem(data: any, actorRole: Role, actorId: string): Promise<MenuItem> {
        if (!['ADMIN', 'MANAGER'].includes(actorRole)) {
            throw new AppError('Permission Denied', ErrorCodes.FORBIDDEN, 403);
        }

        const cleanData = {
            id: uuidv4(),
            status: 'AVAILABLE',
            ...data
        };

        const validation = MenuItemSchema.safeParse(cleanData);
        if (!validation.success) {
            throw new AppError('Invalid Menu Data', ErrorCodes.VALIDATION_ERROR, 400);
        }
        const validItem = validation.data;

        // Create
        const createdData = await prisma.menuItem.create({
            data: {
                id: validItem.id,
                name: validItem.name,
                price: validItem.price,
                status: validItem.status,
                activeIngredientSetId: validItem.activeIngredientSetId
            }
        });

        const newItem = this.mapToMenuItem(createdData);

        await this.audit.log({
            actorId, role: actorRole,
            action: 'CREATE', entity: 'MenuItem', entityId: newItem.id,
            source: 'MANUAL',
            afterState: newItem
        });

        return newItem;
    }

    public async getMenu(status?: string): Promise<MenuItem[]> {
        const where = status ? { status } : {};
        const items = await prisma.menuItem.findMany({
            where,
            orderBy: { name: 'asc' }
        });
        return items.map(this.mapToMenuItem);
    }

    public async updateStatus(id: string, newStatus: string, reason: string, actorRole: Role, actorId: string): Promise<MenuItem> {
        // Validation: Kitchen, Manager, Admin, Expo can 86
        if (!['ADMIN', 'MANAGER', 'KITCHEN', 'EXPO'].includes(actorRole)) {
            throw new AppError('Permission Denied', ErrorCodes.FORBIDDEN, 403);
        }

        if (!EightySixStateEnum.safeParse(newStatus).success) {
            throw new AppError('Invalid Status', ErrorCodes.VALIDATION_ERROR, 400);
        }

        const currentItem = await prisma.menuItem.findUnique({ where: { id } });
        if (!currentItem) throw new AppError('Menu Item not found', ErrorCodes.NOT_FOUND, 404);

        if (currentItem.status === newStatus) return this.mapToMenuItem(currentItem);

        // Update
        const updatedData = await prisma.menuItem.update({
            where: { id },
            data: { status: newStatus }
        });

        // Log 86 Event
        await prisma.eightySixEvent.create({
            data: {
                id: uuidv4(),
                menuItemId: id,
                status: newStatus,
                reason,
                actorId,
                timestamp: new Date()
            }
        });

        const updatedItem = this.mapToMenuItem(updatedData);

        await this.audit.log({
            actorId, role: actorRole,
            action: 'UPDATE', entity: 'MenuItem', entityId: id,
            source: 'MANUAL',
            beforeState: this.mapToMenuItem(currentItem),
            afterState: updatedItem,
            reasonCode: `STATUS_CHANGE:${newStatus}`
        });

        return updatedItem;
    }

    private mapToMenuItem(data: any): MenuItem {
        // Maps Prisma Date types to Schema string types?
        // Actually MenuItemSchema doesn't have createdAt/updatedAt in current schema.ts view step 1219?
        // Wait, looking at step 1219, MenuItemSchema at lines 133-139 DOES NOT have createdAt/updatedAt.
        // But Prisma model DOES.
        // So I should just return the data matching the Zod schema.
        return {
            id: data.id,
            name: data.name,
            price: data.price,
            status: data.status,
            activeIngredientSetId: data.activeIngredientSetId || undefined
        };
    }
}
