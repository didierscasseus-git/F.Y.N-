import { NotificationStrategy } from './types';
import { PosNotificationStrategy } from './pos.strategy';
import { TableNotificationStrategy } from './table.strategy';
import { InventoryNotificationStrategy } from './inventory.strategy';
import { ReservationNotificationStrategy } from './reservation.strategy';

export const strategies: NotificationStrategy[] = [
    new PosNotificationStrategy(),
    new TableNotificationStrategy(),
    new InventoryNotificationStrategy(),
    new ReservationNotificationStrategy()
];

export async function getHandlerForEvent(topic: string, eventType: string): Promise<NotificationStrategy | undefined> {
    return strategies.find(s => s.supports(topic, eventType));
}
