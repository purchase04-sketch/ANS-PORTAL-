import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gateAPI, asnAPI, erpAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../utils/helpers';
import { ArrowLeft, CheckCircle, PauseCircle, PlayCircle, RefreshCw, AlertTriangle, FileText, Download } from 'lucide-react';

export default function GateEntry() {
    const { asnId } = useParams();
    const navigate = useNavigate();
    const { showToast, ToastContainer } = useToast();
    const [asn, setAsn] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    
    // Hold form state
    const [showHoldForm, setShowHoldForm] = useState(false);
    const [holdReason, setHoldReason] = useState('');
    const [gateRemarks, setGateRemarks] = useState('');

    useEffect(() => {
        loadASN();
    }, [asnId]);

    const loadASN = async () => {
        try {
            const res = await asnAPI.getById(asnId);
            setAsn(res.data);
        } catch (error) {
            showToast('Failed to load ASN details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleGateIn = async () => {
        if (!window.confirm('Are you sure you want to mark this vehicle as Gate In? This will also trigger ERP Sync.')) return;
        setProcessing(true);
        try {
            await gateAPI.markGateIn(asn.id, { gateRemarks });
            showToast('Gate In successful. ERP Sync triggered.', 'success');
            loadASN();
        } catch (error) {
            showToast(error.response?.data?.message || 'Gate In failed', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleHold = async (e) => {
        e.preventDefault();
        setProcessing(true);
        try {
            await gateAPI.holdVehicle(asn.gateEntry.id, { holdReason });
            showToast('Vehicle put on hold', 'success');
            setShowHoldForm(false);
            setHoldReason('');
            loadASN();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to hold vehicle', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleReleaseHold = async () => {
        if (!window.confirm('Release vehicle from hold?')) return;
        setProcessing(true);
        try {
            await gateAPI.releaseHold(asn.gateEntry.id);
            showToast('Vehicle released from hold', 'success');
            loadASN();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to release vehicle', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleERPRetry = async () => {
        setProcessing(true);
        try {
            await erpAPI.retryGateEntry(asn.gateEntry.id);
            showToast('ERP Sync retry initiated', 'success');
            loadASN(); // reload to get updated status
        } catch (error) {
            showToast(error.response?.data?.message || 'ERP retry failed', 'error');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-64"><div className="spinner"></div></div>;
    if (!asn) return <div className="p-8 text-center">ASN not found</div>;

    const isGateInDone = !!asn.gateEntry;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <ToastContainer />
            
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin/gate')} className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-800">Gate Verification: {asn.cndn?.vehicleNo || '-'}</h1>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${asn.status === 'DELAYED_ARRIVAL' ? 'bg-orange-100 text-orange-800 border-orange-300' : asn.status === 'GATE_IN' || asn.status === 'ERP_SUCCESS' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-blue-100 text-blue-800 border-blue-300'}`}>
                                {asn.status.replace(/_/g, ' ')}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">ASN No: {asn.asnNo} • Supplier: {asn.supplierName}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Verification Checklist */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="font-semibold text-slate-700">Verification Details</h3>
                        </div>
                        <div className="p-5">
                            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                                <div>
                                    <p className="text-slate-500 mb-1">Expected Arrival</p>
                                    <p className="font-medium text-slate-800">{formatDate(asn.expectedArrivalDate)} {asn.expectedArrivalTime}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 mb-1">Driver Info</p>
                                    <p className="font-medium text-slate-800">{asn.cndn?.driverName || '-'} ({asn.cndn?.driverMobile || '-'})</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 mb-1">E-way Bill No (from PO lines)</p>
                                    <p className="font-medium text-slate-800">{[...new Set(asn.asnLines.map(l => l.ewayBillNo).filter(Boolean))].join(', ') || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 mb-1">Total Qty</p>
                                    <p className="font-medium text-slate-800">{asn.totalAsnQty}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 mb-1">Transporter</p>
                                    <p className="font-medium text-slate-800">{asn.cndn?.transporterName || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 mb-1">No. of Boxes / Weight</p>
                                    <p className="font-medium text-slate-800">{asn.cndn?.noOfBoxes || '-'} Boxes / {asn.cndn?.grossWeight || '-'} Kg</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ERP Sync Status (If Gate In Done) */}
                    {isGateInDone && (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-semibold text-slate-700">Gate & ERP Status</h3>
                                {asn.gateEntry.erpSyncStatus === 'FAILED' && (
                                    <button onClick={handleERPRetry} disabled={processing} className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors">
                                        <RefreshCw size={14} className={processing ? "animate-spin" : ""} /> Retry ERP Sync
                                    </button>
                                )}
                            </div>
                            <div className="p-5">
                                <div className="space-y-4 text-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle size={16} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800">Gate In Completed</p>
                                            <p className="text-slate-500 text-xs mt-0.5">GE No: {asn.gateEntry.gateEntryNo} at {formatDate(asn.gateEntry.actualGateInDateTime)}</p>
                                        </div>
                                    </div>

                                    {asn.gateEntry.erpSyncStatus === 'SUCCESS' ? (
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                                                <CheckCircle size={16} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800">ERP Sync Successful</p>
                                                <p className="text-slate-500 text-xs mt-0.5">ERP Document No: {asn.gateEntry.erpGateEntryNo}</p>
                                            </div>
                                        </div>
                                    ) : asn.gateEntry.erpSyncStatus === 'FAILED' ? (
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                                                <AlertTriangle size={16} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-red-700">ERP Sync Failed</p>
                                                <p className="text-red-500 text-xs mt-0.5 max-w-lg break-words">{asn.gateEntry.erpResponseMessage}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center flex-shrink-0">
                                                <RefreshCw size={16} className="animate-spin" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800">ERP Sync Pending / In Progress</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column - Actions & Docs */}
                <div className="space-y-6">
                    {/* Gate Actions */}
                    {!isGateInDone ? (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                                <h3 className="font-semibold text-slate-700">Gate Actions</h3>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Gate Remarks (Optional)</label>
                                    <textarea 
                                        rows="2" 
                                        value={gateRemarks}
                                        onChange={e => setGateRemarks(e.target.value)}
                                        placeholder="Any observations at gate..."
                                        className="w-full rounded border border-slate-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <button 
                                    onClick={handleGateIn}
                                    disabled={processing}
                                    className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-green-500/20 disabled:opacity-50"
                                >
                                    {processing ? <div className="spinner w-4 h-4 border-2 border-white/30 border-t-white" /> : <CheckCircle size={18} />}
                                    Mark Gate In
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Vehicle Hold Actions
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                                <h3 className="font-semibold text-slate-700">Vehicle Hold / Release</h3>
                            </div>
                            <div className="p-5">
                                {asn.gateEntry.gateStatus === 'HOLD' ? (
                                    <div className="space-y-4">
                                        <div className="p-3 bg-red-50 text-red-800 rounded-lg border border-red-100 text-sm">
                                            <p className="font-semibold flex items-center gap-1.5 mb-1"><PauseCircle size={16}/> Vehicle on Hold</p>
                                            <p className="text-red-600">Reason: {asn.gateEntry.holdReason}</p>
                                        </div>
                                        <button 
                                            onClick={handleReleaseHold}
                                            disabled={processing}
                                            className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            <PlayCircle size={18} /> Release Hold
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        {!showHoldForm ? (
                                            <button 
                                                onClick={() => setShowHoldForm(true)}
                                                className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <PauseCircle size={18} /> Hold Vehicle
                                            </button>
                                        ) : (
                                            <form onSubmit={handleHold} className="space-y-3">
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Reason for Hold</label>
                                                <textarea 
                                                    required
                                                    rows="2" 
                                                    value={holdReason}
                                                    onChange={e => setHoldReason(e.target.value)}
                                                    placeholder="Missing docs, wrong material..."
                                                    className="w-full rounded border border-slate-300 p-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                                />
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={() => setShowHoldForm(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">Cancel</button>
                                                    <button type="submit" disabled={processing} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">Confirm Hold</button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Documents View */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2"><FileText size={18} /> Documents Attached</h3>
                        </div>
                        <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
                            {asn.documents.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">No documents uploaded by supplier.</p>
                            ) : (
                                asn.documents.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                                                <FileText size={16} />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-sm font-medium text-slate-700 truncate">{doc.documentType.replace('_', ' ')}</p>
                                                <p className="text-[10px] text-slate-500 truncate">{doc.originalFileName}</p>
                                            </div>
                                        </div>
                                        <a href={`http://localhost:5000/uploads/documents/${doc.storedFileName}`} target="_blank" rel="noreferrer" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 text-slate-600 flex items-center justify-center flex-shrink-0">
                                            <Download size={14} />
                                        </a>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
