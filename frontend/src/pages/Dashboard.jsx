import { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Package, Truck, AlertTriangle, CheckCircle, Clock, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';
import { formatNumber } from '../utils/helpers';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold mt-1 text-slate-800">{formatNumber(value)}</p>
        {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
        <Icon size={22} className="text-white" />
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [supplierData, setSupplierData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [dailyDispatch, setDailyDispatch] = useState([]);
  const [delayedData, setDelayedData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [sumRes, supRes, statRes, dailyRes, delRes] = await Promise.all([
        dashboardAPI.getSummary(),
        dashboardAPI.getSupplierWise(),
        dashboardAPI.getStatusWise(),
        dashboardAPI.getDailyDispatch(),
        dashboardAPI.getDelayed()
      ]);
      setSummary(sumRes.data);
      setSupplierData(supRes.data);
      setStatusData(statRes.data);
      setDailyDispatch(dailyRes.data);
      setDelayedData(delRes.data);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-96"><div className="spinner"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Shipment overview & analytics</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <StatCard title="Total PO Lines" value={summary?.totalLines} icon={Package} color="bg-blue-500" />
        <StatCard title="Schedule Qty" value={summary?.totalScheduleQty} icon={TrendingUp} color="bg-indigo-500" />
        <StatCard title="Dispatch Qty" value={summary?.totalDispatchQty} icon={Truck} color="bg-emerald-500" />
        <StatCard title="Balance Qty" value={summary?.totalBalanceQty} icon={Clock} color="bg-amber-500" />
        <StatCard title="Pending" value={summary?.pending} icon={Clock} color="bg-yellow-500" />
        <StatCard title="Partial" value={summary?.partially} icon={ArrowUpRight} color="bg-sky-500" />
        <StatCard title="Fully Dispatched" value={summary?.fully} icon={CheckCircle} color="bg-green-500" />
        <StatCard title="In Transit" value={summary?.inTransit} icon={Truck} color="bg-purple-500" />
        <StatCard title="Delayed" value={summary?.delayed} icon={AlertTriangle} color="bg-red-500" />
        <StatCard title="Pending Delayed" value={summary?.pendingDelayed} icon={AlertTriangle} color="bg-orange-500" />
        <StatCard title="Today Expected" value={summary?.todayExpected} icon={Calendar} color="bg-teal-500" />
        <StatCard title="This Week" value={summary?.thisWeekDispatch} icon={Calendar} color="bg-rose-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Pie Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Status-wise Shipment Count</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" outerRadius={100} dataKey="count" nameKey="status" label={({ status, count }) => `${status?.replace(/_/g, ' ')} (${count})`} labelLine={false}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Supplier-wise Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Supplier-wise Pending Qty</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={supplierData.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="supplier" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="pendingQty" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Pending Qty" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Dispatch Trend */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Daily Dispatch Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailyDispatch}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="qty" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Dispatch Qty" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Delayed Supplier-wise */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Delayed Shipments by Supplier</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={delayedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="supplier" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} name="Delayed Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
