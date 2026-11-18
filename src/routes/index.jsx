import React, { Suspense } from 'react';
import { useRoutes, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute';
import PageLoadingFallback from '../components/common/PageLoadingFallback';

// Helper bọc Suspense cho từng Lazy Route component
const withLazy = (Component) => (
  <Suspense fallback={<PageLoadingFallback />}>
    <Component />
  </Suspense>
);

// Layouts giữ import tĩnh để cố định AppShell, Header và Sidebar không bị nhấp nháy
import AdminLayout from '../layouts/AdminLayout';
import LandlordLayout from '../layouts/LandlordLayout';
import TenantLayout from '../layouts/TenantLayout';

// Pages - Super Admin (Dynamic code-splitting)
const AdminDashboard = React.lazy(() => import('../pages/admin/Dashboard'));
const LandlordList = React.lazy(() => import('../pages/admin/LandlordList'));
const PackageSettings = React.lazy(() => import('../pages/admin/PackageSettings'));
const ActivityLogs = React.lazy(() => import('../pages/admin/ActivityLogs'));
const TicketManager = React.lazy(() => import('../pages/admin/TicketManager'));
const AdminProfile = React.lazy(() => import('../pages/admin/Profile'));

// Pages - Landlord (Dynamic code-splitting)
const LandlordDashboard = React.lazy(() => import('../pages/landlord/Dashboard'));
const BuildingManager = React.lazy(() => import('../pages/landlord/BuildingManager'));
const TenantManager = React.lazy(() => import('../pages/landlord/TenantManager'));
const UtilityManagement = React.lazy(() => import('../pages/landlord/UtilityManagement'));
const Financials = React.lazy(() => import('../pages/landlord/Financials'));
const ContractManager = React.lazy(() => import('../pages/landlord/ContractManager'));
const SupportManager = React.lazy(() => import('../pages/landlord/SupportManager'));
const LandlordProfile = React.lazy(() => import('../pages/landlord/Profile'));
const Plans = React.lazy(() => import('../pages/landlord/Plans'));
const InvoiceManager = React.lazy(() => import('../pages/landlord/InvoiceManager'));

// Pages - Tenant (Dynamic code-splitting)
const TenantDashboard = React.lazy(() => import('../pages/tenant/Dashboard'));
const TenantInvoices = React.lazy(() => import('../pages/tenant/Invoices'));
const TenantContract = React.lazy(() => import('../pages/tenant/Contract'));
const TenantSupport = React.lazy(() => import('../pages/tenant/Support'));
const TenantProfile = React.lazy(() => import('../pages/tenant/Profile'));

// Pages - Public Discovery & Booking
const PublicRooms = React.lazy(() => import('../pages/public/PublicRooms'));
const PublicRoomDetail = React.lazy(() => import('../pages/public/PublicRoomDetail'));

// Pages - Auth (Dynamic code-splitting)
const Login = React.lazy(() => import('../pages/Login'));
const Register = React.lazy(() => import('../pages/Register'));

const ThemeRoutes = () => {
  return useRoutes([
    // --- LUỒNG CHO SUPER ADMIN ---
    {
      path: '/admin',
      element: (
        <ProtectedRoute allow={['admin']}>
          <AdminLayout />
        </ProtectedRoute>
      ),
      children: [
        { path: 'dashboard', element: withLazy(AdminDashboard) },
        { path: 'landlords', element: withLazy(LandlordList) },
        { path: 'packages', element: withLazy(PackageSettings) },
        { path: 'logs', element: withLazy(ActivityLogs) },
        { path: 'tickets', element: withLazy(TicketManager) },
        { path: 'profile', element: withLazy(AdminProfile) },
        { path: '', element: <Navigate to="dashboard" /> },
      ],
    },

    // --- LUỒNG CHO CHỦ NHÀ (LANDLORD) ---
    {
      path: '/landlord',
      element: (
        <ProtectedRoute allow={['landlord']}>
          <LandlordLayout />
        </ProtectedRoute>
      ),
      children: [
        { path: 'dashboard', element: withLazy(LandlordDashboard) },
        { path: 'buildings', element: withLazy(BuildingManager) },
        { path: 'tenants', element: withLazy(TenantManager) },
        { path: 'rooms', element: <Navigate to="/landlord/buildings" replace /> },
        { path: 'utilities', element: withLazy(UtilityManagement) },
        { path: 'invoices', element: withLazy(InvoiceManager) },
        { path: 'financials', element: withLazy(Financials) },
        { path: 'contracts', element: withLazy(ContractManager) },
        { path: 'support', element: withLazy(SupportManager) },
        { path: 'profile', element: withLazy(LandlordProfile) },
        { path: 'plans', element: withLazy(Plans) },
        { path: '', element: <Navigate to="dashboard" /> },
      ],
    },

    // --- LUỒNG CHO NGƯỜI THUÊ (TENANT) ---
    {
      path: '/tenant',
      element: (
        <ProtectedRoute allow={['tenant']}>
          <TenantLayout />
        </ProtectedRoute>
      ),
      children: [
        { path: 'dashboard', element: withLazy(TenantDashboard) },
        { path: 'invoices', element: withLazy(TenantInvoices) },
        { path: 'contract', element: withLazy(TenantContract) },
        { path: 'support', element: withLazy(TenantSupport) },
        { path: 'profile', element: withLazy(TenantProfile) },
        { path: '', element: <Navigate to="dashboard" /> },
      ],
    },

    // --- CÁC TRANG CHUNG ---
    {
      path: '/',
      element: withLazy(PublicRooms),
    },
    {
      path: '/rooms',
      element: withLazy(PublicRooms),
    },
    {
      path: '/rooms/:id',
      element: withLazy(PublicRoomDetail),
    },
    {
      path: '/login',
      element: withLazy(Login),
    },
    {
      path: '/register',
      element: withLazy(Register),
    },
    {
      path: '*',
      element: <Navigate to="/" replace />,
    },
  ]);
};

export default ThemeRoutes;
