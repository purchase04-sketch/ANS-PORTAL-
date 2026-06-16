import { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import { Users, Shield, ShoppingBag, Truck } from 'lucide-react';

const roleIcons = { ADMIN: Shield, BUYER: ShoppingBag, SUPPLIER: Truck };
const roleColors = { ADMIN: 'bg-purple-100 text-purple-700', BUYER: 'bg-blue-100 text-blue-700', SUPPLIER: 'bg-emerald-100 text-emerald-700' };

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userAPI.getAll().then(res => setUsers(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center h-96"><div className="spinner"></div></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manage Users</h1>
          <p className="text-sm text-slate-500 mt-1">{users.length} users registered</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Name', 'Email', 'Role', 'Status'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => {
              const Icon = roleIcons[u.role] || Users;
              return (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5 font-medium text-slate-700">{u.name}</td>
                  <td className="px-5 py-3.5 text-slate-500">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${roleColors[u.role]}`}>
                      <Icon size={12} /> {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
