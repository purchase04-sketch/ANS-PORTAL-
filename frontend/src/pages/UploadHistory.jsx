import { useState, useEffect } from 'react';
import { scheduleAPI } from '../services/api';
import { formatDate } from '../utils/helpers';
import { History, FileSpreadsheet } from 'lucide-react';

export default function UploadHistory() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    scheduleAPI.getBatches().then(res => setBatches(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center h-96"><div className="spinner"></div></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Upload History</h1>
        <p className="text-sm text-slate-500 mt-1">Previous Excel upload batches</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['File Name', 'Uploaded By', 'Total', 'Success', 'Failed', 'Date'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {batches.map(b => (
              <tr key={b.id} className="hover:bg-slate-50/50">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-emerald-500" />
                    <span className="font-medium text-slate-700">{b.fileName}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-slate-500">{b.uploadedBy}</td>
                <td className="px-5 py-3.5 font-semibold text-slate-700">{b.totalRows}</td>
                <td className="px-5 py-3.5 font-semibold text-green-600">{b.successRows}</td>
                <td className="px-5 py-3.5 font-semibold text-red-600">{b.failedRows}</td>
                <td className="px-5 py-3.5 text-slate-500">{formatDate(b.uploadDate)}</td>
              </tr>
            ))}
            {batches.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">No uploads yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
