import { useState, useEffect } from 'react';
import { scheduleAPI, shipmentAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { statusColors, statusLabels, formatDate, formatNumber } from '../utils/helpers';
import { Package, Send, X } from 'lucide-react';

export default function SupplierSchedule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLines, setSelectedLines] = useState([]);
  const { showToast, ToastContainer } = useToast();

  useEffect(() => { loadSchedules(); }, []);

  const loadSchedules = async () => {
    try {
      const res = await scheduleAPI.getSupplierSchedules();
      setSchedules(res.data);
      setSelectedLines([]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSelectLine = (scheduleLine) => {
    const isSelected = selectedLines.some(l => l.id === scheduleLine.id);
    if (isSelected) {
      setSelectedLines(selectedLines.filter(l => l.id !== scheduleLine.id));
    } else {
      setSelectedLines([...selectedLines, scheduleLine]);
    }
  };

  const handleCreateASN = () => {
    if (selectedLines.length === 0) return showToast('Please select at least one PO line', 'error');
    navigate('/supplier/asn/create', { state: { selectedLines, supplierCode: user?.supplierCode || schedules[0]?.supplierCode } });
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="spinner"></div></div>;

  return (
    <div className="space-y-5">
      <ToastContainer />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My PO Schedule</h1>
          <p className="text-sm text-slate-500 mt-1">Select lines and create ASN for dispatch</p>
        </div>
        {selectedLines.length > 0 && (
          <button onClick={handleCreateASN} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 font-medium shadow-sm shadow-blue-500/25">
            <Send size={18} /> Create ASN ({selectedLines.length})
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 w-10"></th>
              <th className="text-left p-4 text-slate-600">PO Details</th>
              <th className="text-left p-4 text-slate-600">Item</th>
              <th className="text-left p-4 text-slate-600">Qty (Sch/Bal)</th>
              <th className="text-left p-4 text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {schedules.map((schedule) => {
              const isSelected = selectedLines.some(l => l.id === schedule.id);
              return (
                <tr key={schedule.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                  <td className="p-4">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => handleSelectLine(schedule)}
                      disabled={schedule.balanceQty <= 0}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-slate-900">{schedule.poNo}</div>
                    <div className="text-xs text-slate-500">{formatDate(schedule.requiredDate)}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-slate-700">{schedule.itemCode}</div>
                    <div className="text-xs text-slate-500">{schedule.itemName}</div>
                  </td>
                  <td className="p-4">
                    <span className="font-semibold">{formatNumber(schedule.scheduleQty)}</span>
                    <span className="mx-1 text-slate-300">/</span>
                    <span className="font-semibold text-amber-600">{formatNumber(schedule.balanceQty)}</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold border ${statusColors[schedule.status]}`}>
                      {statusLabels[schedule.status]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {schedules.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <Package size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">No schedules assigned</p>
          </div>
        )}
      </div>

      {/* Shipment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800">Add Dispatch — {selectedLine?.poNo}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>

            <div className="mb-4 bg-blue-50 rounded-xl p-4 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <div><span className="text-blue-600">Item:</span> {selectedLine?.itemCode}</div>
                <div><span className="text-blue-600">Schedule:</span> {formatNumber(selectedLine?.scheduleQty)}</div>
                <div><span className="text-blue-600">Balance:</span> <b className="text-amber-600">{formatNumber(selectedLine?.balanceQty)}</b></div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Dispatch Qty *</label>
                  <input type="number" max={selectedLine?.balanceQty} required value={form.dispatchQty}
                    onChange={e => setForm({ ...form, dispatchQty: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Dispatch Date *</label>
                  <input type="date" required value={form.dispatchDate}
                    onChange={e => setForm({ ...form, dispatchDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Expected Delivery Date</label>
                  <input type="date" value={form.expectedDeliveryDate}
                    onChange={e => setForm({ ...form, expectedDeliveryDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Invoice No.</label>
                  <input type="text" value={form.invoiceNo}
                    onChange={e => setForm({ ...form, invoiceNo: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Invoice Date</label>
                  <input type="date" value={form.invoiceDate}
                    onChange={e => setForm({ ...form, invoiceDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">LR No.</label>
                  <input type="text" value={form.lrNo}
                    onChange={e => setForm({ ...form, lrNo: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">LR Date</label>
                  <input type="date" value={form.lrDate}
                    onChange={e => setForm({ ...form, lrDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Transporter Name</label>
                  <input type="text" value={form.transporterName}
                    onChange={e => setForm({ ...form, transporterName: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Vehicle No.</label>
                  <input type="text" value={form.vehicleNo}
                    onChange={e => setForm({ ...form, vehicleNo: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Number of Boxes</label>
                  <input type="number" value={form.numberOfBoxes}
                    onChange={e => setForm({ ...form, numberOfBoxes: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Packing Details</label>
                <textarea value={form.packingDetails} onChange={e => setForm({ ...form, packingDetails: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 h-20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Remarks</label>
                <textarea value={form.shipmentRemarks} onChange={e => setForm({ ...form, shipmentRemarks: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 h-20" />
              </div>

              <button type="submit" disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting ? <div className="spinner w-5 h-5 border-2 border-white/30 border-t-white"></div> : 'Submit Dispatch'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
