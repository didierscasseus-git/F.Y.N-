import request from 'supertest';
import app from '../../server';
import { v4 as uuidv4 } from 'uuid';

describe('Guest Module Integration', () => {

    it('GET /health returns 200', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ONLINE');
    });

    it('POST /api/v1/guests fails without auth', async () => {
        const res = await request(app).post('/api/v1/guests').send({ name: 'Test' });
        expect(res.status).toBe(401);
    });

    let guestId: string;

    it('POST /api/v1/guests creates guest (HOST Role)', async () => {
        const res = await request(app)
            .post('/api/v1/guests')
            .set('x-user-id', uuidv4())
            .set('x-role', 'HOST')
            .send({ name: 'New Guest' });

        expect(res.status).toBe(201);
        expect(res.body.data.name).toBe('New Guest');
        guestId = res.body.data.id;
    });

    it('GET /api/v1/guests/:id works for self (GUEST)', async () => {
        const res = await request(app)
            .get(`/api/v1/guests/${guestId}`)
            .set('x-user-id', guestId)
            .set('x-role', 'GUEST');

        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(guestId);
    });

    it('GET /api/v1/guests/:id forbids other GUEST', async () => {
        const otherId = uuidv4();
        const res = await request(app)
            .get(`/api/v1/guests/${guestId}`)
            .set('x-user-id', otherId)
            .set('x-role', 'GUEST');

        expect(res.status).toBe(403);
    });

    it('Authentication fails with invalid headers', async () => {
        const res = await request(app)
            .get('/api/v1/guests/1')
            .set('x-user-id', 'uid')
            .set('x-role', 'POTATO'); // Invalid Role

        expect(res.status).toBe(400); // Validation Error
    });
});
