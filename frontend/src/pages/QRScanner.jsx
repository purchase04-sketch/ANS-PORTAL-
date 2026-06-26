import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { gateAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import { ArrowLeft, QrCode, AlertCircle } from 'lucide-react';

export default function QRScanner() {
    const navigate = useNavigate();
    const { showToast, ToastContainer } = useToast();
    const [scanning, setScanning] = useState(true);
    const scannerRef = useRef(null);

    useEffect(() => {
        // Initialize scanner
        const scanner = new Html5QrcodeScanner(
            "qr-reader",
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                rememberLastUsedCamera: true
            },
            /* verbose= */ false
        );

        scannerRef.current = scanner;

        scanner.render(onScanSuccess, onScanFailure);

        return () => {
            if (scannerRef.current) {
                try {
                    scannerRef.current.clear();
                } catch (error) {
                    console.error("Failed to clear scanner on unmount");
                }
            }
        };
    }, []);

    const onScanSuccess = async (decodedText, decodedResult) => {
        if (!scanning) return;
        setScanning(false);
        
        try {
            // We expect the decoded text to be a JSON string from our qr payload
            let payload;
            try {
                payload = JSON.parse(decodedText);
            } catch (e) {
                // If it's not JSON, maybe it's just the token string directly
                payload = { token: decodedText };
            }

            const token = payload.token || decodedText;

            showToast('QR Scanned. Fetching details...', 'info');
            
            if (scannerRef.current) {
                scannerRef.current.clear();
            }

            const res = await gateAPI.scanQR(token);
            const asn = res.data;
            
            showToast('ASN details found', 'success');
            setTimeout(() => {
                navigate(`/admin/gate-entry/${asn.id}`);
            }, 1000);

        } catch (error) {
            console.error(error);
            showToast(error.response?.data?.message || 'Invalid QR code or ASN not found', 'error');
            setScanning(true); // resume scanning
            
            // Re-render scanner
            if (scannerRef.current) {
                scannerRef.current.render(onScanSuccess, onScanFailure);
            }
        }
    };

    const onScanFailure = (error) => {
        // handle scan failure, usually better to ignore and keep scanning
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <ToastContainer />
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/admin/gate')} className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Scan QR Gate Pass</h1>
                    <p className="text-sm text-slate-500 mt-1">Scan the QR code on the supplier's gate pass</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm p-6">
                <div className="max-w-md mx-auto">
                    <div id="qr-reader" className="w-full border-2 border-slate-200 rounded-xl overflow-hidden"></div>
                    
                    <div className="mt-6 flex items-start gap-3 p-4 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                        <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-semibold mb-1">Scanning Instructions:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Allow camera permissions if prompted.</li>
                                <li>Hold the QR code steady in front of the camera.</li>
                                <li>Ensure good lighting for faster scanning.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
