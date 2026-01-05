import { NotificationStrategy } from './types';
import { CreateNotificationInput } from '../notification.service';

export class PosNotificationStrategy implements NotificationStrategy {
    supports(topic: string, _eventType: string): boolean {
        return topic === 'pos.events';
    }

    async handle(payload: any, attributes?: Record<string, string>): Promise<CreateNotificationInput | null> {
        const eventType = attributes?.eventType || payload.eventType;

        if (eventType === 'CHECK_PAID') {
            return {
                type: 'ALERT',
                priority: 'HIGH',
                title: 'Table Paid',
                message: `Table ${payload.tableId} has paid. Ready for cleaning.`,
                recipientRole: 'HOST',
                data: { tableId: payload.tableId, eventId: payload.id }
            };
        }
        return null;
    }
}
