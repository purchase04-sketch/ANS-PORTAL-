const axios = require('axios');
const prisma = require('../utils/prisma');

class ERPService {
    async getActiveConfig() {
        return await prisma.eRPIntegrationConfig.findFirst({
            where: { isActive: true }
        });
    }

    async syncGateEntryToERP(gateEntryId) {
        let logRecord = null;
        try {
            const config = await this.getActiveConfig();
            if (!config) {
                console.log('No active ERP configuration found. Skipping ERP sync.');
                return;
            }

            const gateEntry = await prisma.gateEntry.findUnique({
                where: { id: gateEntryId },
                include: {
                    asn: {
                        include: {
                            asnLines: true,
                            cndn: true,
                            documents: true
                        }
                    }
                }
            });

            if (!gateEntry) throw new Error('Gate entry not found');

            const asn = gateEntry.asn;
            const idempotencyKey = `${asn.asnNo}-${gateEntry.gateEntryNo}`;

            // Check if already synced
            const existingLog = await prisma.eRPIntegrationLog.findUnique({
                where: { idempotencyKey }
            });

            if (existingLog && existingLog.status === 'SUCCESS') {
                return; // Already synced successfully
            }

            // Prepare Payload
            const payload = {
                asnNo: asn.asnNo,
                supplierCode: asn.supplierCode,
                supplierName: asn.supplierName,
                // Taking first PO for top level, but lines have individual POs
                poNo: asn.asnLines.length > 0 ? asn.asnLines[0].poNo : '',
                itemCode: asn.asnLines.length > 0 ? asn.asnLines[0].itemCode : '',
                itemName: asn.asnLines.length > 0 ? asn.asnLines[0].itemName : '',
                asnQty: asn.totalAsnQty,
                invoiceNo: asn.asnLines.length > 0 ? asn.asnLines[0].invoiceNo : '',
                invoiceDate: asn.asnLines.length > 0 ? asn.asnLines[0].invoiceDate : '',
                dnNo: asn.cndn?.dnNo || '',
                cnNo: asn.cndn?.cnNo || '',
                lrNo: asn.cndn?.lrNo || '',
                vehicleNo: asn.cndn?.vehicleNo || '',
                driverName: asn.cndn?.driverName || '',
                driverMobile: asn.cndn?.driverMobile || '',
                transporterName: asn.cndn?.transporterName || '',
                noOfBoxes: asn.cndn?.noOfBoxes || 0,
                grossWeight: asn.cndn?.grossWeight || 0,
                netWeight: asn.cndn?.netWeight || 0,
                gateInDateTime: gateEntry.actualGateInDateTime,
                unit: asn.unit || '',
                documents: {
                    invoiceCopy: asn.documents.find(d => d.documentType === 'INVOICE')?.filePath || '',
                    lrCopy: asn.documents.find(d => d.documentType === 'LR_COPY')?.filePath || '',
                    packingList: asn.documents.find(d => d.documentType === 'PACKING_LIST')?.filePath || '',
                    ewayBillCopy: asn.documents.find(d => d.documentType === 'EWAY_BILL')?.filePath || '',
                    dnCopy: asn.documents.find(d => d.documentType === 'DN_COPY')?.filePath || '',
                    cnCopy: asn.documents.find(d => d.documentType === 'CN_COPY')?.filePath || ''
                },
                lines: asn.asnLines.map(line => ({
                    poNo: line.poNo,
                    itemCode: line.itemCode,
                    asnQty: line.asnQty
                }))
            };

            const payloadStr = JSON.stringify(payload);

            if (existingLog) {
                logRecord = await prisma.eRPIntegrationLog.update({
                    where: { id: existingLog.id },
                    data: { retryCount: existingLog.retryCount + 1, requestPayload: payloadStr }
                });
            } else {
                logRecord = await prisma.eRPIntegrationLog.create({
                    data: {
                        asnId: asn.id,
                        gateEntryId: gateEntry.id,
                        idempotencyKey,
                        requestPayload: payloadStr,
                        status: 'PENDING'
                    }
                });
            }

            const headers = { 'Content-Type': 'application/json' };
            if (config.authType === 'API_KEY' && config.apiKey) {
                headers['x-api-key'] = config.apiKey;
            } else if (config.authType === 'BEARER' && config.apiKey) {
                headers['Authorization'] = `Bearer ${config.apiKey}`;
            } else if (config.authType === 'BASIC' && config.username && config.password) {
                const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
                headers['Authorization'] = `Basic ${auth}`;
            }

            const url = `${config.baseUrl.replace(/\/$/, '')}/${config.gateEntryEndpoint.replace(/^\//, '')}`;

            const response = await axios.post(url, payload, { headers, timeout: 10000 });
            
            const responseData = response.data;

            await prisma.eRPIntegrationLog.update({
                where: { id: logRecord.id },
                data: {
                    status: 'SUCCESS',
                    responsePayload: JSON.stringify(responseData),
                    errorMessage: null
                }
            });

            await prisma.gateEntry.update({
                where: { id: gateEntry.id },
                data: {
                    erpSyncStatus: 'SUCCESS',
                    erpGateEntryNo: responseData.erpGateEntryNo || null,
                    erpResponseMessage: responseData.message || 'Success'
                }
            });

            await prisma.aSN.update({
                where: { id: asn.id },
                data: { status: 'ERP_SUCCESS' }
            });

        } catch (error) {
            console.error('ERP Sync Error:', error.message);
            const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;

            if (logRecord) {
                await prisma.eRPIntegrationLog.update({
                    where: { id: logRecord.id },
                    data: {
                        status: 'FAILED',
                        errorMessage: errorMessage,
                        responsePayload: error.response ? JSON.stringify(error.response.data) : null
                    }
                });
            }

            await prisma.gateEntry.update({
                where: { id: gateEntryId },
                data: {
                    erpSyncStatus: 'FAILED',
                    erpResponseMessage: errorMessage
                }
            });
        }
    }
}

module.exports = new ERPService();
