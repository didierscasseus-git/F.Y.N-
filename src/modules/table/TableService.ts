import { Table, TableSchema, TableStateEnum, TableStateEventSchema, Role } from '../../core/schema';
import { AuditService } from '../../core/audit/AuditService';
import { AppError, ErrorCodes } from '../../core/errors/AppError';
import prisma from '../../core/prisma';
import { v4 as uuidv4 } from 'uuid';

export class TableService {
    private audit = AuditService.getInstance();

    public async createTable(data: any, actorRole: Role, actorId: string): Promise<Table> {
        // Admin/Manager/Host (Admin usually for layout)
        if (!['ADMIN', 'MANAGER'].includes(actorRole)) {
            throw new AppError('Permission Denied', ErrorCodes.FORBIDDEN, 403);
        }

        const cleanData = {
            id: uuidv4(),
            currentState: 'AVAILABLE',
            stateUpdatedAt: new Date().toISOString(),
            ...data
        };

        const validation = TableSchema.safeParse(cleanData);
        if (!validation.success) {
            throw new AppError('Invalid Table Data', ErrorCodes.VALIDATION_ERROR, 400);
        }
        const validTable = validation.data;

        const createdData = await prisma.table.create({
            data: {
                ...validTable,
                stateUpdatedAt: new Date(validTable.stateUpdatedAt),
                createdAt: validTable.createdAt ? new Date(validTable.createdAt) : undefined,
                updatedAt: validTable.updatedAt ? new Date(validTable.updatedAt) : undefined
            }
        });

        const createdTable = this.mapToTable(createdData);

        await this.audit.log({
            actorId, role: actorRole,
            action: 'CREATE', entity: 'Table', entityId: createdTable.id,
            source: 'MANUAL',
            afterState: createdTable
        });

        return createdTable;
    }

    public async getTables(): Promise<Table[]> {
        const tables = await prisma.table.findMany({
            orderBy: [{ zone: 'asc' }, { name: 'asc' }]
        });
        return tables.map(this.mapToTable);
    }

    public async updateStatus(id: string, newState: string, actorRole: Role, actorId: string, reason?: string): Promise<Table> {
        // Validation
        if (!TableStateEnum.safeParse(newState).success) {
            throw new AppError('Invalid Table State', ErrorCodes.VALIDATION_ERROR, 400);
        }

        const currentTable = await prisma.table.findUnique({ where: { id } });
        if (!currentTable) throw new AppError('Table not found', ErrorCodes.NOT_FOUND, 404);

        if (currentTable.currentState === newState) {
            return this.mapToTable(currentTable);
        }

        // Update
        const updatedData = await prisma.table.update({
            where: { id },
            data: {
                currentState: newState,
                stateUpdatedAt: new Date()
            }
        });

        // Log Event
        const eventId = uuidv4();
        await prisma.tableStateEvent.create({
            data: {
                id: eventId,
                tableId: id,
                previousState: currentTable.currentState,
                newState,
                source: 'MANUAL',
                actorId,
                reasonCode: reason,
                timestamp: new Date()
            }
        });

        const updatedTable = this.mapToTable(updatedData);

        // Audit Legacy
        await this.audit.log({
            actorId, role: actorRole,
            action: 'UPDATE', entity: 'Table', entityId: id,
            source: 'MANUAL',
            beforeState: this.mapToTable(currentTable),
            afterState: updatedTable,
            reasonCode: `STATE_CHANGE:${newState}`
        });

        return updatedTable;
    }

    private mapToTable(data: any): Table {
        return {
            ...data,
            stateUpdatedAt: data.stateUpdatedAt.toISOString(),
            createdAt: data.createdAt.toISOString(),
            updatedAt: data.updatedAt.toISOString(),
        } as Table;
    }
}
