const prisma = require('./prisma');

/**
 * Create an audit log entry
 * @param {object} params
 * @param {string} params.userId - User who performed the action
 * @param {string} params.action - Action type (CREATE, UPDATE, DELETE, LOGIN, etc.)
 * @param {string} params.module - Module name (ASN, GATE_ENTRY, ERP, SCHEDULE, etc.)
 * @param {string} params.recordId - Related record ID
 * @param {any} params.oldValue - Previous value (will be JSON stringified)
 * @param {any} params.newValue - New value (will be JSON stringified)
 * @param {string} params.ipAddress - Client IP address
 */
async function createAuditLog({ userId, action, module, recordId, oldValue, newValue, ipAddress }) {
    try {
        await prisma.auditLog.create({
            data: {
                userId: userId || null,
                action,
                module,
                recordId: recordId || null,
                oldValue: oldValue ? JSON.stringify(oldValue) : null,
                newValue: newValue ? JSON.stringify(newValue) : null,
                ipAddress: ipAddress || null
            }
        });
    } catch (err) {
        console.error('Audit log error:', err.message);
        // Non-blocking - don't throw
    }
}

module.exports = { createAuditLog };
