import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { asnAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import { Save, Send, AlertTriangle } from 'lucide-react';

export default function CreateASN() {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast, ToastContainer } = useToast();
    
    // We expect selected PO lines to be passed via state from SupplierSchedule
    const [selectedLines, setSelectedLines] = useState(location.state?.selectedLines || []);
    const [supplierCode, setSupplierCode] = useState(location.state?.supplierCode || '');
    
    const [formData, setFormData] = useState({
        expectedArrivalDate: '',
        expectedArrivalTime: '',
        remarks: ''
    });

    const [asnLines, setAsnLines] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!selectedLines.length) {
            navigate('/supplier/schedule'); // redirect back if no lines selected
            return;
        }

        setAsnLines(selectedLines.map(line => ({
            scheduleLineId: line.id,
            poNo: line.poNo,
            itemCode: line.itemCode,
            itemName: line.itemName,
            scheduleQty: line.scheduleQty,
            availableQty: line.balanceQty,
            asnQty: '',
            invoiceNo: '',
            invoiceDate: '',
            ewayBillNo: '',
            remarks: ''
        })));
    }, [selectedLines, navigate]);

    const handleLineChange = (index, field, value) => {
        const newLines = [...asnLines];
        newLines[index][field] = value;
        setAsnLines(newLines);
    };

    const handleSaveDraft = async () => {
        setLoading(true);
        try {
            const payload = {
                supplierCode,
                ...formData,
                lines: asnLines.map(line => ({
                    ...line,
                    asnQty: Number(line.asnQty)
                }))
            };
            
            await asnAPI.createDraft(payload);
            showToast('ASN Draft saved successfully', 'success');
            setTimeout(() => navigate('/supplier/dashboard'), 1500);
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to save draft', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <ToastContainer />
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Create ASN</h1>
                    <p className="text-sm text-slate-500 mt-1">Fill in dispatch details against selected PO lines</p>
                </div>
            </div>

            {/* General Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-700 mb-4">General Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Expected Arrival Date</label>
                        <input
                            type="date"
                            value={formData.expectedArrivalDate}
                            onChange={(e) => setFormData({...formData, expectedArrivalDate: e.target.value})}
                            className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Expected Arrival Time</label>
                        <input
                            type="time"
                            value={formData.expectedArrivalTime}
                            onChange={(e) => setFormData({...formData, expectedArrivalTime: e.target.value})}
                            className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                        <textarea
                            rows="2"
                            value={formData.remarks}
                            onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                            className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-lg font-semibold text-slate-700">Line Items</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="p-4 font-medium">PO No.</th>
                                <th className="p-4 font-medium">Item Code</th>
                                <th className="p-4 font-medium">Available Qty</th>
                                <th className="p-4 font-medium min-w-[120px]">ASN Qty *</th>
                                <th className="p-4 font-medium min-w-[150px]">Invoice No.</th>
                                <th className="p-4 font-medium min-w-[160px]">Invoice Date</th>
                                <th className="p-4 font-medium min-w-[150px]">E-way Bill</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {asnLines.map((line, idx) => (
                                <tr key={idx}>
                                    <td className="p-4 font-medium">{line.poNo}</td>
                                    <td className="p-4">
                                        <div>{line.itemCode}</div>
                                        <div className="text-xs text-slate-400">{line.itemName}</div>
                                    </td>
                                    <td className="p-4">{line.availableQty}</td>
                                    <td className="p-4">
                                        <input
                                            type="number"
                                            value={line.asnQty}
                                            onChange={(e) => handleLineChange(idx, 'asnQty', e.target.value)}
                                            className={`w-full rounded border p-1.5 focus:ring-1 ${Number(line.asnQty) > line.availableQty ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'}`}
                                        />
                                        {Number(line.asnQty) > line.availableQty && (
                                            <div className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                                                <AlertTriangle size={10} /> Exceeds balance
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <input
                                            type="text"
                                            value={line.invoiceNo}
                                            onChange={(e) => handleLineChange(idx, 'invoiceNo', e.target.value)}
                                            className="w-full rounded border border-slate-300 p-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <input
                                            type="date"
                                            value={line.invoiceDate}
                                            onChange={(e) => handleLineChange(idx, 'invoiceDate', e.target.value)}
                                            className="w-full rounded border border-slate-300 p-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <input
                                            type="text"
                                            value={line.ewayBillNo}
                                            onChange={(e) => handleLineChange(idx, 'ewayBillNo', e.target.value)}
                                            className="w-full rounded border border-slate-300 p-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end gap-4">
                <button
                    onClick={() => navigate('/supplier/schedule')}
                    className="px-6 py-2.5 rounded-lg font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSaveDraft}
                    disabled={loading || asnLines.some(l => !l.asnQty || Number(l.asnQty) <= 0 || Number(l.asnQty) > l.availableQty)}
                    className="px-6 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
                >
                    {loading ? <div className="spinner w-4 h-4 border-2 border-white/30 border-t-white" /> : <Save size={18} />}
                    Save as Draft
                </button>
            </div>
        </div>
    );
}
