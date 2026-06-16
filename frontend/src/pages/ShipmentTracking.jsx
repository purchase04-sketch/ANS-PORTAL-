import { useState, useEffect, useMemo } from 'react';
import { scheduleAPI, emailAPI } from '../services/api';
import { statusColors, statusLabels, formatDate, formatNumber } from '../utils/helpers';
import { useToast } from '../hooks/useToast';
import { Search, Filter, Mail, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ShipmentTracking({ filterStatus }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(filterStatus || '');
  const [page, setPage] = useState(0);
  const [selectedLine, setSelectedLine] = useState(null);
  const { showToast, ToastContainer } = useToast();
  const pageSize = 20;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await scheduleAPI.getAll();
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    let result = data;
    if (statusFilter) result = result.filter(r => r.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r =>
        r.supplierName?.toLowerCase().includes(s) ||
        r.poNo?.toLowerCase().includes(s) ||
        r.itemCode?.toLowerCase().includes(s) ||
        r.itemName?.toLowerCase().includes(s) ||
        r.buyerName?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [data, statusFilter, search]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const sendReminder = async (lineId) => {
    try {
      await emailAPI.sendReminder({ scheduleLineId: lineId });
      showToast('Reminder sent successfully', 'success');
    } catch (err) {
      showToast('Failed to send reminder', 'error');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-96"><div className="spinner"></div></div>;

  return (
    <div className="space-y-5">
      <ToastContainer />
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {filterStatus === 'DELAYED' ? 'Delayed Shipments' : filterStatus ? 'Pending Shipments' : 'Shipment Tracking'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} records found</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search supplier, PO, item..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
        </div>
        {!filterStatus && (
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
            className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white">
            <option value="">All Status</option>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Supplier', 'PO No.', 'Item Code', 'Item Name', 'Sch. Qty', 'Disp. Qty', 'Balance', 'Required', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-slate-700">{row.supplierName}</div>
                    <div className="text-[11px] text-slate-400">{row.supplierCode}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{row.poNo}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.itemCode}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate">{row.itemName}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{formatNumber(row.scheduleQty)}</td>
                  <td className="px-4 py-3 font-semibold text-blue-600">{formatNumber(row.totalDispatchQty)}</td>
                  <td className="px-4 py-3 font-semibold text-amber-600">{formatNumber(row.balanceQty)}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(row.requiredDate)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusColors[row.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabels[row.status] || row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedLine(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="View Details">
                        <Eye size={15} />
                      </button>
                      {row.status !== 'FULLY_DISPATCHED' && (
                        <button onClick={() => sendReminder(row.id)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500" title="Send Reminder">
                          <Mail size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">No records found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
            <span className="text-xs text-slate-500">Page {page + 1} of {totalPages}</span>
            <div className="flex gap-1">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-white disabled:opacity-40"><ChevronLeft size={16} /></button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-white disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedLine(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">PO Details — {selectedLine.poNo}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Supplier', selectedLine.supplierName],
                ['Buyer', selectedLine.buyerName],
                ['Unit/Plant', selectedLine.unit],
                ['Item Code', selectedLine.itemCode],
                ['Item Name', selectedLine.itemName],
                ['Schedule Qty', formatNumber(selectedLine.scheduleQty)],
                ['Dispatch Qty', formatNumber(selectedLine.totalDispatchQty)],
                ['Balance Qty', formatNumber(selectedLine.balanceQty)],
                ['Required Date', formatDate(selectedLine.requiredDate)],
                ['Status', statusLabels[selectedLine.status]],
              ].map(([label, val]) => (
                <div key={label}><span className="text-slate-500">{label}:</span> <span className="font-medium text-slate-700">{val}</span></div>
              ))}
            </div>
            {selectedLine.shipments?.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Shipment History</h3>
                {selectedLine.shipments.map((s, i) => (
                  <div key={i} className="bg-slate-50 rounded-lg p-3 mb-2 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>Dispatch: <b>{formatNumber(s.dispatchQty)}</b></span>
                      <span>{formatDate(s.dispatchDate)}</span>
                    </div>
                    {s.invoiceNo && <div>Invoice: {s.invoiceNo}</div>}
                    {s.lrNo && <div>LR: {s.lrNo}</div>}
                    {s.transporterName && <div>Transporter: {s.transporterName} | Vehicle: {s.vehicleNo}</div>}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setSelectedLine(null)} className="mt-4 w-full py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
