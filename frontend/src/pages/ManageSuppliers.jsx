import { useState, useEffect } from 'react';
import { supplierAPI } from '../services/api';
import { Building2 } from 'lucide-react';
import { formatDate } from '../utils/helpers';

export default function ManageSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supplierAPI.getAll().then(res => setSuppliers(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center h-96"><div className="spinner"></div></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Manage Suppliers</h1>
        <p className="text-sm text-slate-500 mt-1">{suppliers.length} suppliers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <Building2 size={22} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-700 truncate">{s.supplierName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{s.supplierCode}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {s.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-slate-500">
              <div>Email: <span className="text-slate-700">{s.supplierEmail}</span></div>
              {s.contactPerson && <div>Contact: <span className="text-slate-700">{s.contactPerson}</span></div>}
              {s.phone && <div>Phone: <span className="text-slate-700">{s.phone}</span></div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
