import { useState, useEffect } from 'react';
import { asnAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/helpers';
import { Link } from 'react-router-dom';
import { Eye, FileText, CheckCircle, Clock, XCircle, Package } from 'lucide-react';

export default function ASNList() {
    const { user } = useAuth();
    const [asns, setAsns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadASNs();
    }, []);

    const loadASNs = async () => {
        try {
            const res = await asnAPI.getAll();
            setAsns(res.data);
        } catch (error) {
            console.error('Error loading ASNs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-100 text-gray-800 border-gray-300';
            case 'SUBMITTED': return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'GATE_IN': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
            case 'ERP_SUCCESS': return 'bg-green-100 text-green-800 border-green-300';
            case 'COMPLETED': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
            case 'CANCELLED':
            case 'REJECTED': return 'bg-red-100 text-red-800 border-red-300';
            case 'DELAYED_ARRIVAL': return 'bg-orange-100 text-orange-800 border-orange-300';
            default: return 'bg-slate-100 text-slate-800 border-slate-300';
        }
    };

    if (loading) return <div className="flex justify-center items-center h-64"><div className="spinner"></div></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">ASN List</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage and track Advance Shipment Notices</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="p-4 font-semibold">ASN No.</th>
                                {user.role !== 'SUPPLIER' && <th className="p-4 font-semibold">Supplier</th>}
                                <th className="p-4 font-semibold">Date</th>
                                <th className="p-4 font-semibold">Expected Arrival</th>
                                <th className="p-4 font-semibold">Total Qty</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {asns.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Package size={40} className="text-slate-300 mb-3" />
                                            <p className="text-base font-medium text-slate-600">No ASNs found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                asns.map(asn => (
                                    <tr key={asn.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-medium text-slate-900">{asn.asnNo}</td>
                                        {user.role !== 'SUPPLIER' && (
                                            <td className="p-4">
                                                <div className="font-medium text-slate-700">{asn.supplierName}</div>
                                                <div className="text-[11px] text-slate-500">{asn.supplierCode}</div>
                                            </td>
                                        )}
                                        <td className="p-4 text-slate-600">{formatDate(asn.asnDate)}</td>
                                        <td className="p-4">
                                            <div className="text-slate-700">{formatDate(asn.expectedArrivalDate)}</div>
                                            {asn.expectedArrivalTime && <div className="text-[11px] text-slate-500">{asn.expectedArrivalTime}</div>}
                                        </td>
                                        <td className="p-4 font-medium">{asn.totalAsnQty}</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(asn.status)}`}>
                                                {asn.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <Link 
                                                to={`/${user.role.toLowerCase()}/asn/${asn.id}`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-xs font-medium shadow-sm"
                                            >
                                                <Eye size={14} /> View
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
