import request from 'supertest';
import app from '../../server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../core/prisma';

describe('Reservation Module Integration', () => {

    const HOST_ID = uuidv4();
    let GUEST_ID: string;
    let reservationId: string;

    beforeAll(async () => {
        // Create a guest for the reservation to link to
        const guestRes = await request(app)
            .post('/api/v1/guests')
            .set('x-user-id', HOST_ID)
            .set('x-role', 'HOST')
            .send({ name: 'Reservation Test Guest' });

        GUEST_ID = guestRes.body.data.id;
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('POST /api/v1/reservations creates a booking', async () => {
        const res = await request(app)
            .post('/api/v1/reservations')
            .set('x-user-id', HOST_ID)
            .set('x-role', 'HOST')
            .send({
                guestId: GUEST_ID,
                partySize: 4,
                reservationTime: new Date().toISOString(),
                duration: 'STD_90',
                source: 'PHONE'
            });

        expect(res.status).toBe(201);
        expect(res.body.data.status).toBe('BOOKED');
        expect(res.body.data.duration).toBe('STD_90');
        reservationId = res.body.data.id;
    });

    it('POST /:id/check-in updates status to ARRIVED', async () => {
        const res = await request(app)
            .post(`/api/v1/reservations/${reservationId}/check-in`)
            .set('x-user-id', HOST_ID)
            .set('x-role', 'HOST');

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('ARRIVED');
    });

    it('POST /:id/check-in is forbidden for GUEST', async () => {
        const res = await request(app)
            .post(`/api/v1/reservations/${reservationId}/check-in`)
            .set('x-user-id', GUEST_ID)
            .set('x-role', 'GUEST');

        expect(res.status).toBe(403);
    });
});

