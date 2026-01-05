import { Router, Request, Response } from 'express';
import { processWebhook } from './pos.service';
import { createLogger } from '../../core/logger';
import { Errors } from '../../core/errors/StandardError';

const router = Router();
const logger = createLogger('POS_ROUTES');

/**
 * POST /api/v1/pos/webhook/:provider
 * Ingest POS webhooks
 */
router.post('/webhook/:provider', async (req: Request, res: Response) => {
    try {
        const { provider } = req.params;
        const result = await processWebhook(provider, req.headers, req.body);

        res.json({ success: true, eventId: result.id });
    } catch (error) {
        logger.error('Webhook processing failed', error as Error);

        // Return 200 to POS even on error to prevent retry storms if it's a logic error
        // But 400/401 for bad requests
        if ((error as any).statusCode) {
            res.status((error as any).statusCode).json((error as any).toJSON ? (error as any).toJSON() : { error: 'Error' });
        } else {
            const internal = Errors.internal('Webhook failed');
            res.status(500).json(internal.toJSON());
        }
    }
});

export const posRoutes = router;
