import { NotificationStrategy } from './types';
import { CreateNotificationInput } from '../notification.service';

export class InventoryNotificationStrategy implements NotificationStrategy {
    supports(topic: string, _eventType: string): boolean {
        return topic === 'inventory.events';
    }

    async handle(payload: any, attributes?: Record<string, string>): Promise<CreateNotificationInput | null> {
        const eventType = attributes?.eventType || payload.eventType;

        if (eventType === 'INVENTORY_LOW_STOCK') {
            return {
                type: 'ALERT',
                priority: 'MEDIUM',
                title: 'Low Stock Alert',
                message: `Item ${payload.name} is low on stock (${payload.currentQuantity} ${payload.unit}).`,
                recipientRole: 'MANAGER',
                data: { itemId: payload.id }
            };
        }
        return null;
    }
}
