import { useState, useEffect } from 'react';
import { gateAPI } from '../services/api';
import { formatDate } from '../utils/helpers';
import { Link } from 'react-router-dom';
import { Calendar, Truck, QrCode, Search, AlertTriangle, Eye, CheckCircle } from 'lucide-react';
import { useToast } from '../hooks/useToast';

export default function GateDashboard() {
    const [expectedVehicles, setExpectedVehicles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const { showToast, ToastContainer } = useToast();

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const res = await gateAPI.getTodayExpected();
            setExpectedVehicles(res.data);
        } catch (error) {
            console.error('Failed to load gate dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        
        setSearching(true);
        try {
            const res = await gateAPI.searchASN(searchQuery);
            setSearchResults(res.data);
            if (res.data.length === 0) {
                showToast('No matching vehicles or ASNs found', 'info');
            }
        } catch (error) {
            showToast('Search failed', 'error');
        } finally {
            setSearching(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-64"><div className="spinner"></div></div>;

    const VehicleTable = ({ data, title, emptyMsg }) => (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h3 className="font-semibold text-slate-700">{title}</h3>
                <span className="bg-slate-200 text-slate-700 text-xs font-semibold px-2 py-1 rounded-full">{data.length}</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-white text-slate-500 border-b border-slate-100">
                        <tr>
                            <th className="p-4 font-semibold">Vehicle No.</th>
                            <th className="p-4 font-semibold">ASN No.</th>
                            <th className="p-4 font-semibold">Supplier</th>
                            <th className="p-4 font-semibold">Expected Time</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">{emptyMsg}</td></tr>
                        ) : data.map(asn => (
                            <tr key={asn.id} className="hover:bg-slate-50/50">
                                <td className="p-4 font-medium text-slate-800">
                                    <div className="flex items-center gap-2">
                                        <Truck size={16} className="text-slate-400" />
                                        {asn.cndn?.vehicleNo || '-'}
                                    </div>
                                </td>
                                <td className="p-4 font-medium">{asn.asnNo}</td>
                                <td className="p-4">{asn.supplierName}</td>
                                <td className="p-4">{asn.expectedArrivalTime || '-'}</td>
                                <td className="p-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${asn.status === 'DELAYED_ARRIVAL' ? 'bg-orange-100 text-orange-800 border-orange-300' : asn.status === 'GATE_IN' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : 'bg-blue-100 text-blue-800 border-blue-300'}`}>
                                        {asn.status.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    {asn.status === 'GATE_IN' ? (
                                        <span className="inline-flex items-center gap-1 text-indigo-600 font-medium text-sm px-3 py-1.5"><CheckCircle size={16}/> Gate In Done</span>
                                    ) : (
                                        <Link to={`/admin/gate-entry/${asn.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium shadow-sm">
                                            Verify & Gate In
                                        </Link>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <ToastContainer />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Gate Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage incoming vehicles and gate passes</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/admin/gate-scan" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700 font-medium shadow-sm shadow-indigo-500/25">
                        <QrCode size={18} /> Scan QR Gate Pass
                    </Link>
                </div>
            </div>

            {/* Quick Search */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Search Vehicle / ASN</h3>
                <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Enter Vehicle No. or ASN No. or Supplier Name" 
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <button type="submit" disabled={searching} className="px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 transition-colors disabled:opacity-70 flex items-center gap-2">
                        {searching ? <div className="spinner w-4 h-4 border-2 border-white/30 border-t-white" /> : 'Search'}
                    </button>
                    {searchResults.length > 0 && (
                        <button type="button" onClick={() => { setSearchResults([]); setSearchQuery(''); }} className="px-4 py-2.5 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50">
                            Clear
                        </button>
                    )}
                </form>
            </div>

            {searchResults.length > 0 && (
                <div className="mb-8">
                    <VehicleTable data={searchResults} title="Search Results" emptyMsg="No results found" />
                </div>
            )}

            {/* Expected Today */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <VehicleTable data={expectedVehicles} title={`Expected Today (${formatDate(new Date())})`} emptyMsg="No vehicles expected today" />
                </div>
                
                {/* Info Card */}
                <div>
                    <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                        <h3 className="font-semibold text-lg flex items-center gap-2 mb-2"><AlertTriangle size={20}/> Gate Instructions</h3>
                        <ul className="space-y-3 text-sm text-blue-50 list-disc list-inside mt-4">
                            <li>Scan QR code on supplier's gate pass for fastest entry.</li>
                            <li>Verify Physical Invoice and E-way bill against the portal data.</li>
                            <li>Check Vehicle Number and Driver Mobile carefully.</li>
                            <li>If vehicle is delayed, ASN status will show Delayed Arrival.</li>
                            <li>If documents are missing, use Hold Vehicle option.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
