import { PosEvent, PosEventType } from '../../../core/schema';

export interface PosAdapter {
    providerName: string;

    /**
     * Validate the webhook signature or secret
     */
    validateRequest(headers: Record<string, any>, body: any): boolean;

    /**
     * Normalize the provider-specific payload into a system PosEvent
     */
    normalizeEvent(payload: any): Partial<PosEvent> | null;
}
