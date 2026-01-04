import request from 'supertest';
import app from '../../server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../core/prisma';

describe('Menu Management & 86ing', () => {

    const ADMIN_ID = uuidv4();
    const CHEF_ID = uuidv4();
    let menuItemId: string;

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('POST /api/v1/menu creates a new item (ADMIN)', async () => {
        const res = await request(app)
            .post('/api/v1/menu')
            .set('x-user-id', ADMIN_ID)
            .set('x-role', 'ADMIN')
            .send({
                name: 'Truffle Fries',
                price: 12.99
            });

        expect(res.status).toBe(201);
        expect(res.body.data.status).toBe('AVAILABLE');
        menuItemId = res.body.data.id;
    });

    it('GET /api/v1/menu retrieves items', async () => {
        const res = await request(app)
            .get('/api/v1/menu')
            .set('x-user-id', CHEF_ID)
            .set('x-role', 'KITCHEN');

        expect(res.status).toBe(200);
        const item = res.body.data.find((i: any) => i.id === menuItemId);
        expect(item).toBeDefined();
    });

    it('PATCH /:id/status 86s an item (KITCHEN)', async () => {
        const res = await request(app)
            .patch(`/api/v1/menu/${menuItemId}/status`)
            .set('x-user-id', CHEF_ID)
            .set('x-role', 'KITCHEN')
            .send({
                status: 'EIGHTY_SIXED',
                reason: 'Out of Truffle Oil'
            });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('EIGHTY_SIXED');
    });

    it('Verifies EightySixEvent log in DB', async () => {
        const events = await prisma.eightySixEvent.findMany({
            where: { menuItemId }
        });
        expect(events.length).toBeGreaterThan(0);
        expect(events[0].status).toBe('EIGHTY_SIXED');
        expect(events[0].actorId).toBe(CHEF_ID);
    });
});
