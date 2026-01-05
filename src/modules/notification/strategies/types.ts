import { CreateNotificationInput } from '../notification.service';

export interface NotificationStrategy {
    supports(topic: string, eventType: string): boolean;
    handle(payload: any, attributes?: Record<string, string>): Promise<CreateNotificationInput | null>;
}
