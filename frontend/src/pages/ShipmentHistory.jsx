import { useState, useEffect } from 'react';
import { shipmentAPI } from '../services/api';
import { formatDate, formatNumber } from '../utils/helpers';
import { History, FileText } from 'lucide-react';

export default function ShipmentHistory() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    shipmentAPI.getAll().then(res => setShipments(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center h-96"><div className="spinner"></div></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Shipment History</h1>
        <p className="text-sm text-slate-500 mt-1">All dispatches submitted</p>
      </div>

      <div className="space-y-3">
        {shipments.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">PO / Item</p>
                <p className="font-semibold text-slate-700">{s.scheduleLine?.poNo} — {s.scheduleLine?.itemCode}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Dispatch Qty</p>
                <p className="font-semibold text-blue-600">{formatNumber(s.dispatchQty)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Dispatch Date</p>
                <p className="font-medium text-slate-700">{formatDate(s.dispatchDate)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Invoice / LR</p>
                <p className="font-medium text-slate-700">{s.invoiceNo || '-'} / {s.lrNo || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Transporter</p>
                <p className="font-medium text-slate-700">{s.transporterName || '-'} ({s.vehicleNo || '-'})</p>
              </div>
            </div>
            {s.documents?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                {s.documents.map(doc => (
                  <a key={doc.id} href={`http://localhost:5000/${doc.filePath}`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 rounded-lg text-xs text-blue-600 hover:bg-blue-50">
                    <FileText size={12} /> {doc.documentType}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
        {shipments.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            <History size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">No shipments yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
