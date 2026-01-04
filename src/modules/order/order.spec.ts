import request from 'supertest';
import app from '../../server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../core/prisma';

describe('Order Management Integration', () => {

    const SERVER_ID = uuidv4();
    const ADMIN_ID = uuidv4();
    let tableId: string;
    let menuItemId: string;
    let orderId: string;

    beforeAll(async () => {
        // Setup: Create Table and Menu Item
        const tableRes = await request(app)
            .post('/api/v1/tables')
            .set('x-user-id', ADMIN_ID)
            .set('x-role', 'ADMIN')
            .send({ name: 'T1', zone: 'PATIO', capacity: 2 });
        tableId = tableRes.body.data.id;

        const menuRes = await request(app)
            .post('/api/v1/menu')
            .set('x-user-id', ADMIN_ID)
            .set('x-role', 'ADMIN')
            .send({ name: 'Burger', price: 15.00 });
        menuItemId = menuRes.body.data.id;
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('POST /api/v1/orders creates a new order', async () => {
        const res = await request(app)
            .post('/api/v1/orders')
            .set('x-user-id', SERVER_ID)
            .set('x-role', 'SERVER')
            .send({ tableId });

        expect(res.status).toBe(201);
        expect(res.body.data.status).toBe('OPEN');
        orderId = res.body.data.id;
    });

    it('POST /:id/items adds item and updates total', async () => {
        const res = await request(app)
            .post(`/api/v1/orders/${orderId}/items`)
            .set('x-user-id', SERVER_ID)
            .set('x-role', 'SERVER')
            .send({
                menuItemId,
                quantity: 2,
                notes: 'Medium Rare'
            });

        expect(res.status).toBe(200);
        expect(res.body.data.totalAmount).toBe(30.00); // 15 * 2
        expect(res.body.data.items.length).toBe(1);
    });

    it('POST /:id/fire updates status and fires items', async () => {
        const res = await request(app)
            .post(`/api/v1/orders/${orderId}/fire`)
            .set('x-user-id', SERVER_ID)
            .set('x-role', 'SERVER');

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('IN_PROGRESS');
        expect(res.body.data.items[0].status).toBe('FIRED');
    });
});
