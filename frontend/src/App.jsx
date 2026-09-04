import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import DashboardRouter from './pages/DashboardRouter';
import VoucherForm from './pages/employee/VoucherForm';
import MyVouchers from './pages/employee/MyVouchers';
import PendingApprovals from './pages/director/PendingApprovals';
import AllVouchers from './pages/shared/AllVouchers';
import VoucherDetails from './pages/shared/VoucherDetails';

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardRouter />} />

        <Route path="/vouchers/new" element={
          <ProtectedRoute allowedRoles={['EMPLOYEE']}><VoucherForm /></ProtectedRoute>
        } />
        <Route path="/vouchers/:id/edit" element={
          <ProtectedRoute allowedRoles={['EMPLOYEE']}><VoucherForm /></ProtectedRoute>
        } />
        <Route path="/vouchers/mine" element={
          <ProtectedRoute allowedRoles={['EMPLOYEE']}><MyVouchers /></ProtectedRoute>
        } />

        <Route path="/vouchers/pending" element={
          <ProtectedRoute allowedRoles={['DIRECTOR']}><PendingApprovals /></ProtectedRoute>
        } />

        <Route path="/vouchers/all" element={
          <ProtectedRoute allowedRoles={['DIRECTOR', 'ACCOUNTS']}><AllVouchers /></ProtectedRoute>
        } />

        <Route path="/vouchers/:id" element={<VoucherDetails />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
