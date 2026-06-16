import { useState, useEffect } from 'react';
import { scheduleAPI, shipmentAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { statusColors, statusLabels, formatDate, formatNumber } from '../utils/helpers';
import { Package, Plus, Upload, X } from 'lucide-react';

export default function SupplierSchedule() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedLine, setSelectedLine] = useState(null);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { showToast, ToastContainer } = useToast();

  useEffect(() => { loadSchedules(); }, []);

  const loadSchedules = async () => {
    try {
      const res = await scheduleAPI.getAll();
      setSchedules(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openShipmentModal = (line) => {
    setSelectedLine(line);
    setForm({
      scheduleLineId: line.id,
      dispatchQty: '',
      dispatchDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: '',
      invoiceNo: '', invoiceDate: '',
      lrNo: '', lrDate: '',
      transporterName: '', vehicleNo: '',
      numberOfBoxes: '', packingDetails: '', shipmentRemarks: ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.dispatchQty || Number(form.dispatchQty) <= 0) return showToast('Enter valid dispatch qty', 'error');
    if (Number(form.dispatchQty) > selectedLine.balanceQty) return showToast('Qty exceeds balance', 'error');
    setSubmitting(true);
    try {
      await shipmentAPI.create(form);
      showToast('Shipment created successfully', 'success');
      setShowModal(false);
      loadSchedules();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error creating shipment', 'error');
    } finally { setSubmitting(false); }
  };

  const handleDocUpload = async (shipmentId, file, docType) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', docType);
    try {
      await shipmentAPI.uploadDocument(shipmentId, formData);
      showToast(`${docType} uploaded`, 'success');
    } catch (err) {
      showToast('Upload failed', 'error');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-96"><div className="spinner"></div></div>;

  return (
    <div className="space-y-5">
      <ToastContainer />
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My PO Schedule</h1>
        <p className="text-sm text-slate-500 mt-1">View your assigned purchase orders and update shipment details</p>
      </div>

      <div className="space-y-3">
        {schedules.map(line => (
          <div key={line.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">PO No.</p>
                  <p className="font-semibold text-slate-700">{line.poNo}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Item</p>
                  <p className="font-medium text-slate-700">{line.itemCode} — {line.itemName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Schedule / Dispatched / Balance</p>
                  <p className="font-semibold">
                    <span className="text-slate-700">{formatNumber(line.scheduleQty)}</span>
                    <span className="text-blue-600 mx-1">/ {formatNumber(line.totalDispatchQty)}</span>
                    <span className="text-amber-600">/ {formatNumber(line.balanceQty)}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Required Date</p>
                  <p className="font-medium text-slate-700">{formatDate(line.requiredDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${statusColors[line.status]}`}>
                  {statusLabels[line.status]}
                </span>
                {line.balanceQty > 0 && (
                  <button onClick={() => openShipmentModal(line)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all flex items-center gap-1.5">
                    <Plus size={14} /> Add Dispatch
                  </button>
                )}
              </div>
            </div>

            {/* Existing shipments */}
            {line.shipments?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-2">Dispatch History ({line.shipments.length})</p>
                <div className="space-y-2">
                  {line.shipments.map((s, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-3 text-xs grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div><span className="text-slate-500">Qty:</span> <b>{formatNumber(s.dispatchQty)}</b></div>
                      <div><span className="text-slate-500">Date:</span> {formatDate(s.dispatchDate)}</div>
                      <div><span className="text-slate-500">Invoice:</span> {s.invoiceNo || '-'}</div>
                      <div><span className="text-slate-500">LR:</span> {s.lrNo || '-'}</div>
                      <div><span className="text-slate-500">Vehicle:</span> {s.vehicleNo || '-'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {schedules.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
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
