import { PosAdapter } from '../interfaces/posAdapter.interface';
import { PosEvent, PosEventType } from '../../../core/schema';
import { v4 as uuidv4 } from 'uuid';

export class MockAdapter implements PosAdapter {
    providerName = 'MOCK';

    validateRequest(headers: Record<string, any>, body: any): boolean {
        // Mock adapter always accepts valid JSON
        return true;
    }

    normalizeEvent(payload: any): Partial<PosEvent> | null {
        // Expects payload: { eventType: string, tableId?: string, ... }
        if (!payload.eventType) {
            return null;
        }

        return {
            provider: 'MOCK',
            externalEventId: uuidv4(),
            eventType: payload.eventType, // Assumed to match one of our enums for mock
            tableId: payload.tableId,
            payload: payload,
            timestamp: new Date().toISOString(),
            processedAt: new Date().toISOString()
        };
    }
}
