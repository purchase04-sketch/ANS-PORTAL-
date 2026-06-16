import { useState, useRef } from 'react';
import { scheduleAPI } from '../services/api';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Download } from 'lucide-react';
import { useToast } from '../hooks/useToast';

export default function UploadSchedule() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const { showToast, ToastContainer } = useToast();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) setFile(f);
    else showToast('Please upload an Excel file (.xlsx or .xls)', 'error');
  };

  const handleUpload = async () => {
    if (!file) return showToast('Select a file first', 'error');
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await scheduleAPI.uploadExcel(formData);
      setResult(res.data);
      showToast(`Upload complete: ${res.data.success} success, ${res.data.failed} failed`, res.data.failed > 0 ? 'error' : 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ToastContainer />
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Upload Schedule Excel</h1>
        <p className="text-sm text-slate-500 mt-1">Upload PO/schedule data from Excel to create shipment tracking entries</p>
      </div>

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
          ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-300 hover:bg-slate-50'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
          onChange={(e) => setFile(e.target.files[0])} />
        <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
          <FileSpreadsheet size={32} className="text-blue-500" />
        </div>
        {file ? (
          <div>
            <p className="text-lg font-semibold text-slate-700">{file.name}</p>
            <p className="text-sm text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-semibold text-slate-700">Drag & drop your Excel file here</p>
            <p className="text-sm text-slate-400 mt-1">or click to browse • .xlsx, .xls only</p>
          </div>
        )}
      </div>

      {/* Expected Columns */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Expected Excel Columns</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {['Supplier Code*', 'Supplier Name*', 'Supplier Email', 'Buyer Name', 'Unit / Plant', 'PO No.*', 'PO Date', 'Item Code*', 'Item Name', 'Schedule Qty*', 'Required Date*', 'Remarks'].map(col => (
            <span key={col} className={`text-xs px-3 py-1.5 rounded-lg ${col.includes('*') ? 'bg-blue-50 text-blue-700 font-medium' : 'bg-slate-50 text-slate-600'}`}>
              {col}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-3">* Required fields</p>
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/25"
      >
        {uploading ? <div className="spinner w-5 h-5 border-2 border-white/30 border-t-white"></div> : <><Upload size={18} /> Upload & Process</>}
      </button>

      {/* Results */}
      {result && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Upload Results</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-700">{result.total}</p>
              <p className="text-xs text-slate-500">Total Rows</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{result.success}</p>
              <p className="text-xs text-green-600">Success</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{result.failed}</p>
              <p className="text-xs text-red-600">Failed</p>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-red-600 mb-2">Row-wise Errors:</h4>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {result.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm bg-red-50 p-3 rounded-lg">
                    <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-red-700">Row {err.row}:</span>
                      <span className="text-red-600 ml-1">{err.errors.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
