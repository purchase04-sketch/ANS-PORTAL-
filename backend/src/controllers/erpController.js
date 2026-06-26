const prisma = require('../utils/prisma');
const erpService = require('../services/erpService');
const { createAuditLog } = require('../utils/auditLogger');

exports.getConfig = async (req, res) => {
    try {
        let config = await prisma.eRPIntegrationConfig.findFirst();
        res.json(config || {});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.saveConfig = async (req, res) => {
    try {
        const { erpName, baseUrl, gateEntryEndpoint, authType, apiKey, username, password, tokenUrl, isActive } = req.body;
        
        let config = await prisma.eRPIntegrationConfig.findFirst();
        
        if (config) {
            config = await prisma.eRPIntegrationConfig.update({
                where: { id: config.id },
                data: {
                    erpName, baseUrl, gateEntryEndpoint, authType,
                    apiKey, username, password, tokenUrl, isActive
                }
            });
        } else {
            config = await prisma.eRPIntegrationConfig.create({
                data: {
                    erpName, baseUrl, gateEntryEndpoint, authType,
                    apiKey, username, password, tokenUrl, isActive
                }
            });
        }

        await createAuditLog({
            userId: req.user.id, action: 'UPDATE', module: 'ERP_CONFIG',
            recordId: config.id, newValue: { erpName, baseUrl }, ipAddress: req.ip
        });

        res.json({ message: 'ERP Configuration saved successfully', config });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.syncGateEntry = async (req, res) => {
    try {
        const { gateEntryId } = req.params;
        await erpService.syncGateEntryToERP(gateEntryId);
        
        const gateEntry = await prisma.gateEntry.findUnique({ where: { id: gateEntryId } });
        res.json({ message: 'Sync attempt completed', gateEntry });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getLogs = async (req, res) => {
    try {
        const logs = await prisma.eRPIntegrationLog.findMany({
            include: { asn: true, gateEntry: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
