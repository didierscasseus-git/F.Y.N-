import request from 'supertest';
import app from '../../server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../core/prisma';

describe('Table Management Integration', () => {

    const ADMIN_ID = uuidv4();
    const SERVER_ID = uuidv4();
    let tableId: string;

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('POST /api/v1/tables creates a new table (ADMIN)', async () => {
        const res = await request(app)
            .post('/api/v1/tables')
            .set('x-user-id', ADMIN_ID)
            .set('x-role', 'ADMIN')
            .send({
                name: 'T101',
                zone: 'MAIN_DINING',
                capacity: 4
            });

        expect(res.status).toBe(201);
        expect(res.body.data.currentState).toBe('AVAILABLE');
        tableId = res.body.data.id;
    });

    it('GET /api/v1/tables retrieves layout', async () => {
        const res = await request(app)
            .get('/api/v1/tables')
            .set('x-user-id', SERVER_ID)
            .set('x-role', 'SERVER');

        expect(res.status).toBe(200);
        const table = res.body.data.find((t: any) => t.id === tableId);
        expect(table).toBeDefined();
        expect(table.name).toBe('T101');
    });

    it('PATCH /:id/status updates state (SERVER)', async () => {
        const res = await request(app)
            .patch(`/api/v1/tables/${tableId}/status`)
            .set('x-user-id', SERVER_ID)
            .set('x-role', 'SERVER')
            .send({
                status: 'SEATED',
                reason: 'Party Seated'
            });

        expect(res.status).toBe(200);
        expect(res.body.data.currentState).toBe('SEATED');
    });

    it('Verifies TableStateEvent log in DB', async () => {
        const events = await prisma.tableStateEvent.findMany({
            where: { tableId }
        });
        expect(events.length).toBeGreaterThan(0);
        expect(events[0].newState).toBe('SEATED');
    });
});
