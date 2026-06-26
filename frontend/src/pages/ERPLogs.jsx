import { useState, useEffect } from 'react';
import { erpAPI } from '../services/api';
import { formatDate } from '../utils/helpers';
import { Database, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { useToast } from '../hooks/useToast';

export default function ERPLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showToast, ToastContainer } = useToast();

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            const res = await erpAPI.getLogs();
            setLogs(res.data);
        } catch (error) {
            showToast('Failed to load ERP logs', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = async (gateEntryId) => {
        try {
            await erpAPI.retryGateEntry(gateEntryId);
            showToast('Retry initiated', 'success');
            loadLogs();
        } catch (error) {
            showToast(error.response?.data?.message || 'Retry failed', 'error');
        }
    };

    if (loading) return <div className="flex justify-center items-center h-64"><div className="spinner"></div></div>;

    return (
        <div className="space-y-6">
            <ToastContainer />
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">ERP Sync Logs</h1>
                    <p className="text-sm text-slate-500 mt-1">Monitor data synchronization with external ERP system</p>
                </div>
                <button onClick={loadLogs} className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors">
                    <RefreshCw size={20} />
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="p-4 font-semibold">Timestamp</th>
                                <th className="p-4 font-semibold">ASN No</th>
                                <th className="p-4 font-semibold">Gate Entry No</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold max-w-md">Response Message</th>
                                <th className="p-4 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Database size={40} className="text-slate-300 mb-3" />
                                            <p className="text-base font-medium text-slate-600">No sync logs found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-slate-700 font-medium">
                                            {formatDate(log.createdAt)}
                                            <div className="text-[10px] text-slate-400 mt-0.5">{new Date(log.createdAt).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="p-4 font-medium">{log.asn?.asnNo}</td>
                                        <td className="p-4">{log.gateEntry?.gateEntryNo}</td>
                                        <td className="p-4">
                                            {log.status === 'SUCCESS' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300"><CheckCircle size={12}/> Success</span>}
                                            {log.status === 'FAILED' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300"><XCircle size={12}/> Failed</span>}
                                            {log.status === 'PENDING' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300"><Clock size={12}/> Pending</span>}
                                        </td>
                                        <td className="p-4 max-w-md">
                                            <div className="truncate text-xs">
                                                {log.errorMessage || (log.responsePayload ? 'Success (See JSON payload)' : '-')}
                                            </div>
                                            {log.retryCount > 0 && (
                                                <div className="text-[10px] text-orange-600 font-medium mt-1">Retried {log.retryCount} time(s)</div>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            {log.status === 'FAILED' && (
                                                <button 
                                                    onClick={() => handleRetry(log.gateEntryId)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-xs font-medium shadow-sm"
                                                >
                                                    <RefreshCw size={14} /> Retry
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
