import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { asnAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../utils/helpers';
import { ArrowLeft, Send, QrCode, Upload, FileText, CheckCircle, XCircle, Printer, Download } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

export default function ASNDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast, ToastContainer } = useToast();
    const [asn, setAsn] = useState(null);
    const [loading, setLoading] = useState(true);
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const printRef = useRef(null);

    // CN/DN Form State
    const [cndnData, setCndnData] = useState({
        dnNo: '', dnDate: '', cnNo: '', cnDate: '', lrNo: '', lrDate: '',
        transporterName: '', vehicleNo: '', vehicleType: '', driverName: '', driverMobile: '',
        noOfBoxes: '', grossWeight: '', netWeight: '', packingDetails: '',
        freightMode: '', dispatchLocation: '', deliveryLocation: ''
    });

    useEffect(() => {
        loadASN();
    }, [id]);

    const loadASN = async () => {
        try {
            const res = await asnAPI.getById(id);
            setAsn(res.data);
            if (res.data.cndn) {
                const cd = res.data.cndn;
                setCndnData({
                    dnNo: cd.dnNo || '',
                    dnDate: cd.dnDate ? cd.dnDate.split('T')[0] : '',
                    cnNo: cd.cnNo || '',
                    cnDate: cd.cnDate ? cd.cnDate.split('T')[0] : '',
                    lrNo: cd.lrNo || '',
                    lrDate: cd.lrDate ? cd.lrDate.split('T')[0] : '',
                    transporterName: cd.transporterName || '',
                    vehicleNo: cd.vehicleNo || '',
                    vehicleType: cd.vehicleType || '',
                    driverName: cd.driverName || '',
                    driverMobile: cd.driverMobile || '',
                    noOfBoxes: cd.noOfBoxes || '',
                    grossWeight: cd.grossWeight || '',
                    netWeight: cd.netWeight || '',
                    packingDetails: cd.packingDetails || '',
                    freightMode: cd.freightMode || '',
                    dispatchLocation: cd.dispatchLocation || '',
                    deliveryLocation: cd.deliveryLocation || ''
                });
            }
            
            if (res.data.status !== 'DRAFT') {
                try {
                    const qrRes = await asnAPI.getQRCode(id);
                    setQrDataUrl(qrRes.data.qrDataUrl);
                } catch (e) {
                    console.error('Failed to load QR');
                }
            }
        } catch (error) {
            showToast('Failed to load ASN details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: asn ? `GatePass-${asn.asnNo}` : 'GatePass',
    });

    const handleCNDNSave = async (e) => {
        e.preventDefault();
        try {
            await asnAPI.saveCNDN(id, cndnData);
            showToast('CN/DN details saved successfully', 'success');
            loadASN();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to save CN/DN', 'error');
        }
    };

    const handleSubmitASN = async () => {
        if (!window.confirm('Are you sure you want to submit this ASN? Once submitted, it cannot be edited.')) return;
        
        // Basic validation for CN/DN if needed before submit
        if (!asn.cndn?.vehicleNo) {
            return showToast('Please save CN/DN details with Vehicle No before submitting', 'error');
        }

        try {
            await asnAPI.submitASN({ id });
            showToast('ASN Submitted Successfully. QR Gate Pass Generated.', 'success');
            loadASN();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to submit ASN', 'error');
        }
    };

    const handleDocUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', type);

        try {
            await asnAPI.uploadDocument(id, formData);
            showToast(`${type} uploaded successfully`, 'success');
            loadASN();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to upload document', 'error');
        }
    };

    if (loading) return <div className="flex justify-center items-center h-64"><div className="spinner"></div></div>;
    if (!asn) return <div className="p-8 text-center">ASN not found</div>;

    const isSupplier = user.role === 'SUPPLIER';
    const canEdit = isSupplier && asn.status === 'DRAFT';

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <ToastContainer />
            
            {/* Header Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-800">{asn.asnNo}</h1>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border bg-slate-100 text-slate-800`}>
                                {asn.status.replace(/_/g, ' ')}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">Expected Arrival: {formatDate(asn.expectedArrivalDate)} {asn.expectedArrivalTime}</p>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    {asn.status !== 'DRAFT' && qrDataUrl && (
                        <button onClick={handlePrint} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700 font-medium">
                            <Printer size={18} /> Print Gate Pass
                        </button>
                    )}
                    {canEdit && (
                        <button onClick={handleSubmitASN} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 font-medium shadow-sm shadow-green-500/25">
                            <CheckCircle size={18} /> Submit ASN
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Line Items */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="font-semibold text-slate-700">PO Line Items</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                                    <tr>
                                        <th className="p-4 font-medium">PO No.</th>
                                        <th className="p-4 font-medium">Item Code</th>
                                        <th className="p-4 font-medium">ASN Qty</th>
                                        <th className="p-4 font-medium">Invoice No</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {asn.asnLines.map(line => (
                                        <tr key={line.id} className="hover:bg-slate-50/50">
                                            <td className="p-4">{line.poNo}</td>
                                            <td className="p-4">
                                                <div>{line.itemCode}</div>
                                                <div className="text-[11px] text-slate-400">{line.itemName}</div>
                                            </td>
                                            <td className="p-4 font-medium">{line.asnQty}</td>
                                            <td className="p-4">{line.invoiceNo || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* CN/DN Details */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-semibold text-slate-700">Consignment & Transport Details</h3>
                        </div>
                        <div className="p-5">
                            <form onSubmit={handleCNDNSave} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {/* DN/CN */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Vehicle No. {canEdit && '*'}</label>
                                        <input type="text" value={cndnData.vehicleNo} onChange={e => setCndnData({...cndnData, vehicleNo: e.target.value})} disabled={!canEdit} required={canEdit} className="w-full rounded border border-slate-300 p-2 text-sm disabled:bg-slate-50 focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Driver Name</label>
                                        <input type="text" value={cndnData.driverName} onChange={e => setCndnData({...cndnData, driverName: e.target.value})} disabled={!canEdit} className="w-full rounded border border-slate-300 p-2 text-sm disabled:bg-slate-50 focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Driver Mobile</label>
                                        <input type="text" value={cndnData.driverMobile} onChange={e => setCndnData({...cndnData, driverMobile: e.target.value})} disabled={!canEdit} className="w-full rounded border border-slate-300 p-2 text-sm disabled:bg-slate-50 focus:border-blue-500" />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">DN No.</label>
                                        <input type="text" value={cndnData.dnNo} onChange={e => setCndnData({...cndnData, dnNo: e.target.value})} disabled={!canEdit} className="w-full rounded border border-slate-300 p-2 text-sm disabled:bg-slate-50 focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">DN Date</label>
                                        <input type="date" value={cndnData.dnDate} onChange={e => setCndnData({...cndnData, dnDate: e.target.value})} disabled={!canEdit} className="w-full rounded border border-slate-300 p-2 text-sm disabled:bg-slate-50 focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Transporter Name</label>
                                        <input type="text" value={cndnData.transporterName} onChange={e => setCndnData({...cndnData, transporterName: e.target.value})} disabled={!canEdit} className="w-full rounded border border-slate-300 p-2 text-sm disabled:bg-slate-50 focus:border-blue-500" />
                                    </div>
                                </div>
                                
                                {canEdit && (
                                    <div className="flex justify-end pt-2 border-t border-slate-100">
                                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm shadow-blue-500/20">
                                            Save Details
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                </div>

                {/* Right Column - QR & Docs */}
                <div className="space-y-6">
                    {/* QR Code Gate Pass (Printable Area) */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm" >
                        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2"><QrCode size={18} /> Gate Pass</h3>
                        </div>
                        <div className="p-6 flex flex-col items-center justify-center text-center bg-white" ref={printRef}>
                            <div className="w-full mb-4 pb-4 border-b border-slate-200">
                                <h2 className="text-xl font-bold text-slate-800">ANS PORTAL GATE PASS</h2>
                                <p className="text-sm font-medium text-slate-500 mt-1">{asn.asnNo}</p>
                            </div>
                            
                            {qrDataUrl ? (
                                <div className="p-4 bg-white rounded-xl border-2 border-slate-100 shadow-sm mb-4">
                                    <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 mx-auto" />
                                </div>
                            ) : (
                                <div className="w-48 h-48 mx-auto bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center mb-4">
                                    <span className="text-xs text-slate-400 font-medium px-4">Submit ASN to generate QR</span>
                                </div>
                            )}

                            <div className="w-full text-left text-sm space-y-2 mt-4 bg-slate-50 p-4 rounded-lg">
                                <p><span className="font-semibold text-slate-700 inline-block w-24">Supplier:</span> {asn.supplierName}</p>
                                <p><span className="font-semibold text-slate-700 inline-block w-24">Vehicle No:</span> {asn.cndn?.vehicleNo || '-'}</p>
                                <p><span className="font-semibold text-slate-700 inline-block w-24">Expected:</span> {formatDate(asn.expectedArrivalDate)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Documents */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2"><FileText size={18} /> Documents</h3>
                        </div>
                        <div className="p-5 space-y-3">
                            {['INVOICE', 'LR_COPY', 'PACKING_LIST', 'EWAY_BILL'].map(docType => {
                                const doc = asn.documents.find(d => d.documentType === docType);
                                return (
                                    <div key={docType} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                                <FileText size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-700">{docType.replace('_', ' ')}</p>
                                                {doc && <p className="text-[10px] text-slate-500">{doc.originalFileName}</p>}
                                            </div>
                                        </div>
                                        <div>
                                            {doc ? (
                                                <a href={`http://localhost:5000/uploads/documents/${doc.storedFileName}`} target="_blank" rel="noreferrer" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center justify-center">
                                                    <Download size={16} />
                                                </a>
                                            ) : (
                                                canEdit && (
                                                    <label className="p-2 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 text-blue-600 cursor-pointer flex items-center justify-center transition-colors">
                                                        <Upload size={16} />
                                                        <input type="file" className="hidden" onChange={(e) => handleDocUpload(e, docType)} accept=".pdf,.jpg,.jpeg,.png" />
                                                    </label>
                                                )
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
