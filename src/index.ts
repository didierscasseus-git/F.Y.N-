import { onRequest } from 'firebase-functions/v2/https';
import app from './server';

// Export Express App as a Cloud Function
export const api = onRequest(app);
