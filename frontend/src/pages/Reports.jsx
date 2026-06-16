import { useState } from 'react';
import { reportAPI } from '../services/api';
import { downloadBlob } from '../utils/helpers';
import { useToast } from '../hooks/useToast';
import { FileDown, FileSpreadsheet } from 'lucide-react';

const reports = [
  { key: 'fullShipment', label: 'Full Shipment Report', desc: 'Complete shipment data across all suppliers', file: 'full_shipment_report.xlsx' },
  { key: 'supplierWise', label: 'Supplier-wise Report', desc: 'Shipments grouped by supplier', file: 'supplier_wise_report.xlsx' },
  { key: 'poWise', label: 'PO-wise Report', desc: 'Shipments grouped by purchase order', file: 'po_wise_report.xlsx' },
  { key: 'pending', label: 'Pending Shipments', desc: 'All pending and pending-delayed items', file: 'pending_report.xlsx' },
  { key: 'delayed', label: 'Delayed Shipments', desc: 'All delayed and overdue shipments', file: 'delayed_report.xlsx' },
  { key: 'todayExpected', label: 'Today Expected Delivery', desc: 'Shipments expected to arrive today', file: 'today_expected.xlsx' },
];

export default function Reports() {
  const [downloading, setDownloading] = useState('');
  const { showToast, ToastContainer } = useToast();

  const handleDownload = async (key, file) => {
    setDownloading(key);
    try {
      const res = await reportAPI[key]();
      downloadBlob(res.data, file);
      showToast('Report downloaded', 'success');
    } catch (err) {
      showToast('Download failed', 'error');
    } finally { setDownloading(''); }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <ToastContainer />
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Download shipment reports in Excel format</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map(r => (
          <div key={r.key} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all group">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
                <FileSpreadsheet size={22} className="text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-700">{r.label}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{r.desc}</p>
              </div>
              <button
                onClick={() => handleDownload(r.key, r.file)}
                disabled={downloading === r.key}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {downloading === r.key ? <div className="spinner w-4 h-4 border-2 border-emerald-300 border-t-emerald-600"></div> : <><FileDown size={14} /> Download</>}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
