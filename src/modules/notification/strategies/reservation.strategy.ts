import { NotificationStrategy } from './types';
import { CreateNotificationInput } from '../notification.service';

export class ReservationNotificationStrategy implements NotificationStrategy {
    supports(topic: string, _eventType: string): boolean {
        return topic === 'reservation.events';
    }

    async handle(payload: any, attributes?: Record<string, string>): Promise<CreateNotificationInput | null> {
        const eventType = attributes?.eventType || payload.eventType;

        if (eventType === 'RESERVATION_UPDATED' && payload.status === 'NO_SHOW') {
            return {
                type: 'REMINDER',
                priority: 'MEDIUM',
                title: 'No Show Recorded',
                message: `Reservation for ${payload.guestId} marked as No Show.`,
                recipientRole: 'HOST',
                data: { reservationId: payload.id }
            };
        }
        return null;
    }
}
