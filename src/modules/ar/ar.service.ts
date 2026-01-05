import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../core/logger';
import { Errors } from '../../core/errors/StandardError';
import { query } from '../../core/connectors/postgres';
import { createPublisher } from '../../core/connectors/pubsub';
import { ArAnchor, ArModel } from '../../core/schema';
import { Role } from '../../core/auth/rbac';
import { logMutation, AuditAction, AuditSource } from '../../core/audit';

const logger = createLogger('AR_SERVICE');
const publisher = createPublisher('ar.events');

export interface CreateAnchorInput {
    tableId: string;
    cloudAnchorId?: string;
    localTransform?: number[];
    confidence?: number;
}

export interface CreateModelInput {
    name: string;
    url: string;
    format: 'GLB' | 'USDZ' | 'OBJ' | 'PLY';
}

/**
 * Initialize AR Service
 */
export async function initArService() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS ar_models (
                id UUID PRIMARY KEY,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                format VARCHAR(10) NOT NULL,
                uploaded_by TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS ar_anchors (
                id UUID PRIMARY KEY,
                table_id UUID,
                cloud_anchor_id TEXT,
                local_transform JSONB,
                confidence DOUBLE PRECISION DEFAULT 1.0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_ar_anchors_table ON ar_anchors(table_id);
        `);
        logger.info('AR Service initialized');
    } catch (error) {
        logger.error('Failed to initialize AR service', error as Error);
        throw error;
    }
}

/**
 * Register a new AR Anchor (Map table to world)
 */
export async function createAnchor(
    input: CreateAnchorInput,
    actorId: string,
    role: Role
): Promise<ArAnchor> {
    logger.info('Creating AR Anchor', { tableId: input.tableId });

    // Verify table exists (P1 Fix)
    const tableResult = await query(`SELECT id FROM tables WHERE id = $1`, [input.tableId]);
    if (tableResult.rows.length === 0) {
        throw Errors.notFound('Table', input.tableId);
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();

    await query(`
        INSERT INTO ar_anchors (
            id, table_id, cloud_anchor_id, local_transform, confidence, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
        id,
        input.tableId,
        input.cloudAnchorId || null,
        input.localTransform ? JSON.stringify(input.localTransform) : null,
        input.confidence || 1.0,
        createdAt
    ]);

    const anchor: ArAnchor = {
        id,
        tableId: input.tableId,
        cloudAnchorId: input.cloudAnchorId,
        localTransform: input.localTransform,
        confidence: input.confidence || 1.0,
        createdAt
    };

    // Audit
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.CREATE,
        'ar_anchor',
        id,
        undefined,
        anchor as any
    );

    await publisher.publish(anchor, { eventType: 'ANCHOR_CREATED' });

    return anchor;
}

/**
 * Get all anchors
 */
export async function getAnchors(): Promise<ArAnchor[]> {
    const result = await query(`SELECT * FROM ar_anchors`);
    return result.rows.map(mapDbToAnchor);
}

/**
 * Get anchors for a specific table
 */
export async function getAnchorsByTable(tableId: string): Promise<ArAnchor[]> {
    const result = await query(`SELECT * FROM ar_anchors WHERE table_id = $1`, [tableId]);
    return result.rows.map(mapDbToAnchor);
}

/**
 * Register a 3D Model
 */
export async function saveModel(
    input: CreateModelInput,
    actorId: string,
    role: Role
): Promise<ArModel> {
    logger.info('Saving AR Model', { name: input.name });

    const id = uuidv4();
    const createdAt = new Date().toISOString();

    await query(`
        INSERT INTO ar_models (
            id, name, url, format, uploaded_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
        id,
        input.name,
        input.url,
        input.format,
        actorId,
        createdAt
    ]);

    const model: ArModel = {
        id,
        name: input.name,
        url: input.url,
        format: input.format,
        uploadedBy: actorId,
        createdAt
    };

    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.CREATE,
        'ar_model',
        id,
        undefined,
        model as any
    );

    await publisher.publish(model, { eventType: 'MODEL_UPLOADED' });

    return model;
}

/**
 * Get all models
 */
export async function getModels(): Promise<ArModel[]> {
    const result = await query(`SELECT * FROM ar_models ORDER BY created_at DESC`);
    return result.rows.map(mapDbToModel);
}

function mapDbToAnchor(row: any): ArAnchor {
    return {
        id: row.id,
        tableId: row.table_id,
        cloudAnchorId: row.cloud_anchor_id,
        localTransform: row.local_transform, // JSON is auto-parsed by pg client usually, or need parse? 
        // Postgres Connector usually returns object for JSONB.
        confidence: row.confidence,
        createdAt: new Date(row.created_at).toISOString()
    };
}

function mapDbToModel(row: any): ArModel {
    return {
        id: row.id,
        name: row.name,
        url: row.url,
        format: row.format,
        uploadedBy: row.uploaded_by,
        createdAt: new Date(row.created_at).toISOString()
    };
}
