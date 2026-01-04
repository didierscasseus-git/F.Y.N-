import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './core/errors/AppError';
import { guestRoutes } from './modules/guest/guest.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/guests', guestRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.json({
        system: 'F.Y.N Timing OS',
        status: 'ONLINE',
        time: new Date().toISOString()
    });
});

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({ error: 'Endpoint Not Found' });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('[ERROR]', err);

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: 'error',
            code: err.code,
            message: err.message
        });
    }

    // Fallback
    res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Internal Server Error'
    });
});

// Start Server
if (require.main === module) {
    app.listen(port, () => {
        console.log(`[System] F.Y.N Timing OS v1.3.26 running on port ${port}`);
    });
}

export default app;
