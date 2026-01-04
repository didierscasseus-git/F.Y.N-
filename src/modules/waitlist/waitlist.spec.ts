import request from 'supertest';
import app from '../../server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../core/prisma';

describe('Waitlist Module Integration', () => {

    const HOST_ID = uuidv4();
    let GUEST_ID: string;
    let waitlistEntryId: string;

    beforeAll(async () => {
        // Create Guest
        const res = await request(app)
            .post('/api/v1/guests')
            .set('x-user-id', HOST_ID)
            .set('x-role', 'HOST')
            .send({ name: 'Waitlist Walker' });
        GUEST_ID = res.body.data.id;
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('POST /api/v1/waitlist adds guest to queue', async () => {
        const res = await request(app)
            .post('/api/v1/waitlist')
            .set('x-user-id', HOST_ID)
            .set('x-role', 'HOST')
            .send({
                guestId: GUEST_ID,
                partySize: 2,
                notes: 'Window seat preferred'
            });

        expect(res.status).toBe(201);
        expect(res.body.data.status).toBe('WAITING');
        expect(res.body.data.guestId).toBe(GUEST_ID);
        waitlistEntryId = res.body.data.id;
    });

    it('GET /api/v1/waitlist retrieves queue', async () => {
        const res = await request(app)
            .get('/api/v1/waitlist?status=WAITING')
            .set('x-user-id', HOST_ID)
            .set('x-role', 'HOST');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        const entry = res.body.data.find((e: any) => e.id === waitlistEntryId);
        expect(entry).toBeDefined();
    });

    it('POST /:id/notify sends notification', async () => {
        const res = await request(app)
            .post(`/api/v1/waitlist/${waitlistEntryId}/notify`)
            .set('x-user-id', HOST_ID)
            .set('x-role', 'HOST');

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('NOTIFIED');
    });

    it('POST /:id/leave removes from queue', async () => {
        const res = await request(app)
            .post(`/api/v1/waitlist/${waitlistEntryId}/leave`)
            .set('x-user-id', HOST_ID)
            .set('x-role', 'HOST')
            .send({ reason: 'SEATED' });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('CANCELLED');
    });
});
