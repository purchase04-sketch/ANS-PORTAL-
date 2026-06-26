import { useState, useEffect } from 'react';
import { erpAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import { Save, Server, Shield, Link as LinkIcon, CheckCircle } from 'lucide-react';

export default function ERPConfig() {
    const { showToast, ToastContainer } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [config, setConfig] = useState({
        erpName: '',
        baseUrl: '',
        gateEntryEndpoint: '',
        authType: 'API_KEY',
        apiKey: '',
        username: '',
        password: '',
        isActive: true
    });

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const res = await erpAPI.getConfig();
            if (res.data && Object.keys(res.data).length > 0) {
                setConfig({
                    erpName: res.data.erpName || '',
                    baseUrl: res.data.baseUrl || '',
                    gateEntryEndpoint: res.data.gateEntryEndpoint || '',
                    authType: res.data.authType || 'API_KEY',
                    apiKey: res.data.apiKey || '',
                    username: res.data.username || '',
                    password: res.data.password || '',
                    isActive: res.data.isActive ?? true
                });
            }
        } catch (error) {
            showToast('Failed to load ERP config', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await erpAPI.saveConfig(config);
            showToast('ERP Configuration saved successfully', 'success');
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to save configuration', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-64"><div className="spinner"></div></div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <ToastContainer />
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">ERP Integration Config</h1>
                    <p className="text-sm text-slate-500 mt-1">Configure automated sync to external ERP systems</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                        <Server size={18} className="text-indigo-600" />
                        <h3 className="font-semibold text-slate-700">General Settings</h3>
                    </div>
                    <div className="p-6 space-y-5">
                        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <div>
                                <p className="font-medium text-slate-700">Enable ERP Integration</p>
                                <p className="text-xs text-slate-500">Automatically push Gate Entry data to ERP</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={config.isActive} onChange={e => setConfig({...config, isActive: e.target.checked})} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ERP System Name *</label>
                                <input required type="text" value={config.erpName} onChange={e => setConfig({...config, erpName: e.target.value})} placeholder="e.g. SAP S/4HANA, Oracle, Tally" className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                        <LinkIcon size={18} className="text-indigo-600" />
                        <h3 className="font-semibold text-slate-700">API Endpoints</h3>
                    </div>
                    <div className="p-6 space-y-5">
                        <div className="grid grid-cols-1 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Base URL *</label>
                                <input required type="url" value={config.baseUrl} onChange={e => setConfig({...config, baseUrl: e.target.value})} placeholder="https://api.yourexternal-erp.com" className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Gate Entry Endpoint Path *</label>
                                <div className="flex">
                                    <span className="inline-flex items-center px-3 text-sm text-slate-500 bg-slate-50 border border-r-0 border-slate-300 rounded-l-lg">
                                        POST /
                                    </span>
                                    <input required type="text" value={config.gateEntryEndpoint} onChange={e => setConfig({...config, gateEntryEndpoint: e.target.value})} placeholder="api/v1/gate-entry" className="w-full rounded-r-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                        <Shield size={18} className="text-indigo-600" />
                        <h3 className="font-semibold text-slate-700">Authentication</h3>
                    </div>
                    <div className="p-6 space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Authentication Type</label>
                            <select value={config.authType} onChange={e => setConfig({...config, authType: e.target.value})} className="w-full md:w-1/2 rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white">
                                <option value="API_KEY">API Key (x-api-key header)</option>
                                <option value="BEARER">Bearer Token (Authorization header)</option>
                                <option value="BASIC">Basic Auth (Username/Password)</option>
                            </select>
                        </div>
                        
                        {(config.authType === 'API_KEY' || config.authType === 'BEARER') && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{config.authType === 'API_KEY' ? 'API Key' : 'Token'}</label>
                                <input type="password" value={config.apiKey} onChange={e => setConfig({...config, apiKey: e.target.value})} placeholder="Enter secret key..." className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono" />
                            </div>
                        )}

                        {config.authType === 'BASIC' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                                    <input type="text" value={config.username} onChange={e => setConfig({...config, username: e.target.value})} className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                                    <input type="password" value={config.password} onChange={e => setConfig({...config, password: e.target.value})} className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex justify-end pt-2">
                    <button type="submit" disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50">
                        {saving ? <div className="spinner w-4 h-4 border-2 border-white/30 border-t-white" /> : <Save size={18} />}
                        Save Configuration
                    </button>
                </div>
            </form>
        </div>
    );
}
