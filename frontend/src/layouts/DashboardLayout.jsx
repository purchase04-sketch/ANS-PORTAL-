import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, Upload, Truck, AlertTriangle, FileText, Mail,
  Users, Building2, History, Package, ClipboardList, LogOut, Menu, X, Settings
} from 'lucide-react';
import { useState } from 'react';

const adminNav = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Manage Users' },
  { to: '/admin/suppliers', icon: Building2, label: 'Manage Suppliers' },
  { to: '/admin/upload-history', icon: History, label: 'Upload History' },
];

const buyerNav = [
  { to: '/buyer/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/buyer/upload', icon: Upload, label: 'Upload Schedule' },
  { to: '/buyer/tracking', icon: Truck, label: 'Shipment Tracking' },
  { to: '/buyer/pending', icon: AlertTriangle, label: 'Pending Shipments' },
  { to: '/buyer/delayed', icon: AlertTriangle, label: 'Delayed Shipments' },
  { to: '/buyer/reports', icon: FileText, label: 'Reports' },
  { to: '/buyer/reminder', icon: Mail, label: 'Reminder Mail' },
];

const supplierNav = [
  { to: '/supplier/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/supplier/schedule', icon: ClipboardList, label: 'My PO Schedule' },
  { to: '/supplier/update-shipment', icon: Package, label: 'Update Shipment' },
  { to: '/supplier/history', icon: History, label: 'Shipment History' },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = user?.role === 'ADMIN' ? adminNav : user?.role === 'BUYER' ? buyerNav : supplierNav;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out flex-shrink-0`}>
        {/* Logo */}
        <div className="p-5 border-b border-slate-700/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
            A
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="font-bold text-base leading-tight">ASN Portal</h1>
              <p className="text-[11px] text-slate-400">Shipment Tracking</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <div className="mb-2 px-3">
            {sidebarOpen && <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Navigation</span>}
          </div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-all duration-200 group
                ${isActive
                  ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-400'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'}`
              }
            >
              <item.icon size={20} className="flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-slate-700/50">
          {sidebarOpen && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-semibold">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.role}</p>
              </div>
            </div>
          )}
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors w-full">
            <LogOut size={18} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">Welcome, <span className="font-semibold text-slate-700">{user?.name}</span></span>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
