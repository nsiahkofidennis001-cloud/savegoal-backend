import { prisma } from '../../infra/prisma.client.js';
import { logger } from '../../infra/logger.js';

export interface AuditLogOptions {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string;
    userAgent?: string;
}

export class AuditLogger {
    /**
     * Record an audit log entry
     */
    static async record(options: AuditLogOptions) {
        try {
            return await prisma.auditLog.create({
                data: {
                    userId: options.userId,
                    action: options.action,
                    resource: options.resource,
                    resourceId: options.resourceId,
                    oldValue: options.oldValue as any,
                    newValue: options.newValue as any,
                    ipAddress: options.ipAddress,
                    userAgent: options.userAgent,
                },
            });
        } catch (error) {
            // We don't want audit logging failures to crash the main transaction,
            // but we should log the error
            logger.error(error as Error, 'Failed to record audit log:');
        }
    }

    /**
     * Record an audit log entry within an existing Prisma transaction
     */
    static async recordTx(tx: any, options: AuditLogOptions) {
        return tx.auditLog.create({
            data: {
                userId: options.userId,
                action: options.action,
                resource: options.resource,
                resourceId: options.resourceId,
                oldValue: options.oldValue as any,
                newValue: options.newValue as any,
                ipAddress: options.ipAddress,
                userAgent: options.userAgent,
            },
        });
    }
}
