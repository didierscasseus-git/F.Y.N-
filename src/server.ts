import express from 'express';
import { posRoutes } from './modules/pos/pos.routes';
import { initPosService } from './modules/pos/pos.service';
import { notificationRoutes, initNotificationService } from './modules/notification/notification.routes';
import { arRoutes, initArService } from './modules/ar/ar.routes';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import { StandardError, systemLogger, getBuildManifest } from './core';
import { guestRoutes } from './modules/guest/guest.routes';

import { reservationRoutes } from './modules/reservation/reservation.routes';
import { waitlistRoutes } from './modules/waitlist/waitlist.routes';
import { tableRoutes } from './modules/table/table.routes';
import { menuRoutes } from './modules/menu/menu.routes';
import { orderRoutes } from './modules/order/order.routes';
import { auditRoutes } from './modules/audit/audit.routes';
import { safetyRoutes } from './modules/safety/safety.routes';
import { aiRoutes } from './modules/ai/ai.routes';
import { inventoryRoutes } from './modules/inventory/inventory.routes';
import { eightySixAnalyticsRoutes } from './modules/analytics/analytics.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Mount Modules
app.use('/api/v1/guests', guestRoutes);
app.use('/api/v1/reservations', reservationRoutes);
app.use('/api/v1/waitlist', waitlistRoutes);
app.use('/api/v1/tables', tableRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/safety', safetyRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/analytics', eightySixAnalyticsRoutes);
app.use('/api/v1/pos', posRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/ar', arRoutes);

// Health Check
app.get('/health', (req, res) => {
    const manifest = getBuildManifest();
    res.json({
        system: 'F.Y.N Timing OS',
        version: manifest.version,
        status: 'ONLINE',
        environment: manifest.environment,
        stackLock: manifest.stackLock,
        time: new Date().toISOString()
    });
});

// Connector Health Check
app.get('/health-connectors', async (req, res) => {
    const { connectors } = await import('./core');
    const health = await connectors.healthCheckAll();
    const allHealthy = Object.values(health).every(h => h.healthy);

    res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'healthy' : 'degraded',
        connectors: health,
        time: new Date().toISOString()
    });
});

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({ error: 'Endpoint Not Found' });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof StandardError) {
        systemLogger.error(err.message, err, { code: err.code });
        return res.status(err.statusCode).json(err.toJSON());
    }

    // Unexpected errors
    systemLogger.fatal('Unhandled error', err);
    res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Internal Server Error',
        timestamp: new Date().toISOString()
    });
});

// Start Server
if (require.main === module) {
    const manifest = getBuildManifest();

    initPosService().catch(err => systemLogger.error('Failed to initialize POS service', err));
    initNotificationService().catch(err => systemLogger.error('Failed to initialize Notification service', err));
    initArService().catch(err => systemLogger.error('Failed to initialize AR service', err));

    app.listen(port, () => {
        systemLogger.info(`F.Y.N Timing OS ${manifest.version} running on port ${port}`, {
            environment: manifest.environment,
            port
        });
    });
}

export default app;
