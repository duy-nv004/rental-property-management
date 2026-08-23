import { useRoutes, Navigate } from 'react-router-dom';

// Layouts
import AdminLayout from '../layouts/AdminLayout';
import LandlordLayout from '../layouts/LandlordLayout';
import TenantLayout from '../layouts/TenantLayout';

// Pages - Super Admin
import AdminDashboard from '../pages/admin/Dashboard';
import LandlordList from '../pages/admin/LandlordList';
import PackageSettings from '../pages/admin/PackageSettings';
import ActivityLogs from '../pages/admin/ActivityLogs';
import TicketManager from '../pages/admin/TicketManager';

// Pages - Landlord
import LandlordDashboard from '../pages/landlord/Dashboard'; // Trang Dashboard của chủ nhà
import BuildingManager from '../pages/landlord/BuildingManager'; // Trang Asset Inventory
import TenantManager from '../pages/landlord/TenantManager'; // Trang Active Relationships
import RoomManager from '../pages/landlord/RoomManager'; // Trang Room Management
import UtilityManagement from '../pages/landlord/UtilityManagement'; // Trang Utility & Meter
import Financials from '../pages/landlord/Financials'; // Trang Financial Statistics
import ContractManager from '../pages/landlord/ContractManager';
import SupportManager from '../pages/landlord/SupportManager';
import LandlordProfile from '../pages/landlord/Profile';
import Plans from '../pages/landlord/Plans';

// Pages - Tenant
import TenantDashboard from '../pages/tenant/Dashboard';
import TenantInvoices from '../pages/tenant/Invoices';
import TenantContract from '../pages/tenant/Contract';
import TenantSupport from '../pages/tenant/Support';
import TenantProfile from '../pages/tenant/Profile';

import Login from '../pages/Login';
import Register from '../pages/Register';

const ThemeRoutes = () => {
  return useRoutes([
    // --- LUỒNG CHO SUPER ADMIN (BẠN) ---
    {
      path: '/admin',
      element: <AdminLayout />, 
      children: [
        { path: 'dashboard', element: <AdminDashboard /> },
        { path: 'landlords', element: <LandlordList /> },
        { path: 'packages', element: <PackageSettings /> },
        { path: 'logs', element: <ActivityLogs /> },
        { path: 'tickets', element: <TicketManager /> },
        { path: '', element: <Navigate to="dashboard" /> },
      ],
    },

    // --- LUỒNG CHO CHỦ NHÀ (LANDLORD) ---
    {
      path: '/landlord',
      element: <LandlordLayout />, 
      children: [
        { path: 'dashboard', element: <LandlordDashboard /> },
        { path: 'buildings', element: <BuildingManager /> },
        { path: 'tenants', element: <TenantManager /> },
        { path: 'rooms', element: <Navigate to="/landlord/buildings" replace /> },
        { path: 'utilities', element: <UtilityManagement /> }, // Phần điện nước
        { path: 'financials', element: <Financials /> },
        { path: 'contracts', element: <ContractManager /> },
        { path: 'support', element: <SupportManager /> },
        { path: 'profile', element: <LandlordProfile /> },
        { path: 'plans', element: <Plans /> },
        { path: '', element: <Navigate to="dashboard" /> },
      ],
    },

    // --- LUỒNG CHO NGƯỜI THUÊ (TENANT) ---
    {
      path: '/tenant',
      element: <TenantLayout />, 
      children: [
        { path: 'dashboard', element: <TenantDashboard /> },
        { path: 'invoices', element: <TenantInvoices /> },
        { path: 'contract', element: <TenantContract /> },
        { path: 'support', element: <TenantSupport /> },
        { path: 'profile', element: <TenantProfile /> },
        { path: '', element: <Navigate to="dashboard" /> },
      ],
    },

    // --- CÁC TRANG CHUNG ---
    {
      path: '/login',
      element: <Login />,
    },
    {
      path: '/register',
      element: <Register />,
    },
    {
      path: '/',
      element: <Navigate to="/login" />,
    },
    {
      path: '*',
      element: <Navigate to="/admin/dashboard" />,
    },
  ]);
};

export default ThemeRoutes;