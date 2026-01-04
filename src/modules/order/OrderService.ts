import { Order, OrderSchema, OrderStatusEnum, OrderItemSchema, OrderItemStatusEnum, Role } from '../../core/schema';
import { AuditService } from '../../core/audit/AuditService';
import { AppError, ErrorCodes } from '../../core/errors/AppError';
import prisma from '../../core/prisma';
import { v4 as uuidv4 } from 'uuid';

export class OrderService {
    private audit = AuditService.getInstance();

    public async createOrder(tableId: string, guestId: string | null, actorRole: Role, actorId: string): Promise<Order> {
        // Validation: Verify table exists
        const table = await prisma.table.findUnique({ where: { id: tableId } });
        if (!table) throw new AppError('Table not found', ErrorCodes.NOT_FOUND, 404);

        // Verify Status (Optional: Can checks if table is already handling an order?)

        const newOrder = await prisma.order.create({
            data: {
                id: uuidv4(),
                tableId,
                guestId: guestId || undefined,
                status: 'OPEN',
                totalAmount: 0.0
            }
        });

        // Link Order to Table
        await prisma.table.update({
            where: { id: tableId },
            data: { activeOrderId: newOrder.id }
        });

        const order = this.mapToOrder(newOrder);

        await this.audit.log({
            actorId, role: actorRole,
            action: 'CREATE', entity: 'Order', entityId: order.id,
            source: 'POS',
            afterState: order
        });

        return order;
    }

    public async addItem(orderId: string, menuItemId: string, quantity: number, notes: string | undefined, actorRole: Role, actorId: string): Promise<Order> {
        // Validate Order
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new AppError('Order not found', ErrorCodes.NOT_FOUND, 404);
        if (order.status !== 'OPEN' && order.status !== 'IN_PROGRESS') {
            throw new AppError('Cannot add items to closed order', ErrorCodes.VALIDATION_ERROR, 400);
        }

        // Validate Item & Get Price Snapshot
        const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
        if (!menuItem) throw new AppError('Menu Item not found', ErrorCodes.NOT_FOUND, 404);
        if (menuItem.status === 'EIGHTY_SIXED') {
            throw new AppError(`Item '${menuItem.name}' is 86'd`, ErrorCodes.VALIDATION_ERROR, 400);
        }

        // Add Item
        await prisma.orderItem.create({
            data: {
                id: uuidv4(),
                orderId,
                menuItemId,
                quantity,
                price: menuItem.price * quantity, // Snapshot total price for line
                notes,
                status: 'PENDING'
            }
        });

        // Recalculate Total
        return await this.recalculateOrderTotal(orderId);
    }

    public async fireOrder(orderId: string, actorRole: Role, actorId: string): Promise<Order> {
        // Update Pending Items to FIRED
        await prisma.orderItem.updateMany({
            where: { orderId, status: 'PENDING' },
            data: { status: 'FIRED' }
        });

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { status: 'IN_PROGRESS' },
            include: { items: true }
        });

        const mapped = this.mapToOrder(updatedOrder);

        // Helper logic: Notify Kitchen (Stub)
        console.log(`[KITCHEN] Order ${orderId} FIRED.`);

        return mapped;
    }

    public async getOrder(id: string): Promise<Order> {
        const order = await prisma.order.findUnique({
            where: { id },
            include: { items: true }
        });
        if (!order) throw new AppError('Order not found', ErrorCodes.NOT_FOUND, 404);
        return this.mapToOrder(order);
    }

    private async recalculateOrderTotal(orderId: string): Promise<Order> {
        const items = await prisma.orderItem.findMany({ where: { orderId } });
        const total = items.reduce((sum, item) => sum + item.price, 0);

        const updated = await prisma.order.update({
            where: { id: orderId },
            data: { totalAmount: total },
            include: { items: true }
        });

        return this.mapToOrder(updated);
    }

    private mapToOrder(data: any): Order {
        return {
            id: data.id,
            tableId: data.tableId,
            guestId: data.guestId || undefined,
            status: data.status,
            totalAmount: data.totalAmount,
            createdAt: data.createdAt ? data.createdAt.toISOString() : undefined,
            updatedAt: data.updatedAt ? data.updatedAt.toISOString() : undefined,
            items: data.items ? data.items.map((i: any) => ({
                ...i,
                createdAt: i.createdAt.toISOString(),
                updatedAt: i.updatedAt.toISOString()
            })) : []
        };
    }
}
