import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';

import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import UploadSchedule from './pages/UploadSchedule';
import ShipmentTracking from './pages/ShipmentTracking';
import ReportViewer from './pages/ReportViewer';
import ReminderMail from './pages/ReminderMail';
import CreateASN from './pages/CreateASN';
import ASNList from './pages/ASNList';
import ASNDetail from './pages/ASNDetail';
import GateDashboard from './pages/GateDashboard';
import QRScanner from './pages/QRScanner';
import GateEntry from './pages/GateEntry';
import ERPConfig from './pages/ERPConfig';
import ERPLogs from './pages/ERPLogs';
import ManageUsers from './pages/ManageUsers';
import ManageSuppliers from './pages/ManageSuppliers';
import UploadHistory from './pages/UploadHistory';
import SupplierSchedule from './pages/SupplierSchedule';
import ShipmentHistory from './pages/ShipmentHistory';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center items-center h-screen"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><DashboardLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<ManageUsers />} />
        <Route path="suppliers" element={<ManageSuppliers />} />
        <Route path="upload-history" element={<UploadHistory />} />
        <Route path="profile" element={<Profile />} />
        <Route path="asn" element={<ASNList />} />
        <Route path="asn/:id" element={<ASNDetail />} />
        <Route path="gate" element={<GateDashboard />} />
        <Route path="gate-scan" element={<QRScanner />} />
        <Route path="gate-entry/:asnId" element={<GateEntry />} />
        <Route path="erp-config" element={<ERPConfig />} />
        <Route path="erp-logs" element={<ERPLogs />} />
      </Route>

      {/* Buyer Routes */}
      <Route path="/buyer" element={<ProtectedRoute roles={['BUYER']}><DashboardLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="upload" element={<UploadSchedule />} />
        <Route path="tracking" element={<ShipmentTracking />} />
        <Route path="pending" element={<ShipmentTracking filterStatus="PENDING" />} />
        <Route path="delayed" element={<ShipmentTracking filterStatus="DELAYED" />} />
        <Route path="reports" element={<ReportViewer />} />
        <Route path="reminder" element={<ReminderMail />} />
        <Route path="profile" element={<Profile />} />
        <Route path="asn" element={<ASNList />} />
        <Route path="asn/:id" element={<ASNDetail />} />
        <Route path="gate" element={<GateDashboard />} />
        <Route path="gate-scan" element={<QRScanner />} />
        <Route path="gate-entry/:asnId" element={<GateEntry />} />
      </Route>

      {/* Supplier Routes */}
      <Route path="/supplier" element={<ProtectedRoute roles={['SUPPLIER']}><DashboardLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="schedule" element={<SupplierSchedule />} />
        <Route path="update-shipment" element={<SupplierSchedule />} />
        <Route path="history" element={<ShipmentHistory />} />
        <Route path="profile" element={<Profile />} />
        <Route path="asn" element={<ASNList />} />
        <Route path="asn/create" element={<CreateASN />} />
        <Route path="asn/:id" element={<ASNDetail />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={
        user ? (
          user.role === 'ADMIN' ? <Navigate to="/admin/dashboard" /> :
          user.role === 'BUYER' ? <Navigate to="/buyer/dashboard" /> :
          <Navigate to="/supplier/dashboard" />
        ) : <Navigate to="/login" />
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
