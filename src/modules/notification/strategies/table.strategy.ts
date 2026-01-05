import { NotificationStrategy } from './types';
import { CreateNotificationInput } from '../notification.service';

export class TableNotificationStrategy implements NotificationStrategy {
    supports(topic: string, _eventType: string): boolean {
        return topic === 'table.events';
    }

    async handle(payload: any, attributes?: Record<string, string>): Promise<CreateNotificationInput | null> {
        const eventType = attributes?.eventType || payload.eventType;

        if (eventType === 'TABLE_STATE_UPDATED' && payload.toState === 'OUT_OF_SERVICE') {
            return {
                type: 'ALERT',
                priority: 'HIGH',
                title: 'Table Out of Service',
                message: `Table ${payload.number} marked OUT OF SERVICE.`,
                recipientRole: 'MANAGER',
                data: { tableId: payload.id }
            };
        }
        return null;
    }
}
