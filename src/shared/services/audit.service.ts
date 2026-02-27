import { prisma } from '../../infra/prisma.client.js';

export type AuditLogAction =
    | 'USER_PROMOTED'
    | 'ROLE_CHANGED'
    | 'BALANCE_ADJUSTED'
    | 'KYC_VERIFIED'
    | 'KYC_REJECTED'
    | 'SYSTEM_CONFIG_CHANGED';

export class AuditService {
    /**
     * Record a sensitive action for accountability
     */
    static async record(params: {
        userId?: string;
        action: AuditLogAction;
        entityType: string;
        entityId: string;
        oldValue?: any;
        newValue?: any;
        ipAddress?: string;
    }) {
        try {
            return await prisma.auditLog.create({
                data: {
                    userId: params.userId,
                    action: params.action,
                    entityType: params.entityType,
                    entityId: params.entityId,
                    oldValue: params.oldValue,
                    newValue: params.newValue,
                    ipAddress: params.ipAddress
                }
            });
        } catch (err) {
            // We log but don't throw, so audit logging doesn't break the main flow
            console.error('❌ Audit Logging Failed:', err);
        }
    }
}
