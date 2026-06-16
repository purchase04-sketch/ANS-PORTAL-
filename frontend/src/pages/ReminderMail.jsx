import { useState, useEffect } from 'react';
import { scheduleAPI, emailAPI } from '../services/api';
import { statusColors, statusLabels, formatDate, formatNumber } from '../utils/helpers';
import { useToast } from '../hooks/useToast';
import { Mail, Send, AlertTriangle, Search } from 'lucide-react';

export default function ReminderMail() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(null);
  const { showToast, ToastContainer } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await scheduleAPI.getAll();
      // Only show pending / delayed / partially dispatched items
      setData(res.data.filter(r => ['PENDING', 'PENDING_DELAYED', 'DELAYED', 'PARTIALLY_DISPATCHED'].includes(r.status)));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = data.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.supplierName?.toLowerCase().includes(s) || r.poNo?.toLowerCase().includes(s) || r.itemCode?.toLowerCase().includes(s);
  });

  const sendReminder = async (lineId) => {
    setSending(lineId);
    try {
      await emailAPI.sendReminder({ scheduleLineId: lineId });
      showToast('Reminder email sent successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send reminder', 'error');
    } finally {
      setSending(null);
    }
  };

  const sendAll = async () => {
    for (const item of filtered) {
      await sendReminder(item.id);
      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  if (loading) return <div className="flex justify-center items-center h-96"><div className="spinner"></div></div>;

  return (
    <div className="space-y-5">
      <ToastContainer />
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reminder Emails</h1>
          <p className="text-sm text-slate-500 mt-1">Send reminders to suppliers for pending/delayed shipments</p>
        </div>
        {filtered.length > 0 && (
          <button onClick={sendAll}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/25 transition-all">
            <Send size={16} /> Send All ({filtered.length})
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search supplier, PO, item..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(line => (
          <div key={line.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Supplier</p>
                  <p className="font-semibold text-slate-700">{line.supplierName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">PO No.</p>
                  <p className="font-medium text-slate-700">{line.poNo}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Item</p>
                  <p className="font-medium text-slate-700">{line.itemCode}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Balance Qty</p>
                  <p className="font-semibold text-amber-600">{formatNumber(line.balanceQty)}</p>
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
                <button
                  onClick={() => sendReminder(line.id)}
                  disabled={sending === line.id}
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {sending === line.id ? (
                    <div className="spinner w-4 h-4 border-2 border-amber-300 border-t-amber-600"></div>
                  ) : (
                    <><Mail size={14} /> Send Reminder</>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            <AlertTriangle size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">No pending/delayed shipments to remind</p>
          </div>
        )}
      </div>
    </div>
  );
}
