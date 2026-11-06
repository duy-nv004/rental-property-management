import { LayoutDashboard, FileText, FileSignature, Wrench, User } from 'lucide-react';
import SidebarNav from './SidebarNav';

// eslint-disable-next-line react-refresh/only-export-components
export const tenantNavItems = [
  { key: '/tenant/dashboard', icon: <LayoutDashboard size={18} />, label: 'Trang chủ' },
  { key: '/tenant/invoices', icon: <FileText size={18} />, label: 'Hóa đơn' },
  { key: '/tenant/contract', icon: <FileSignature size={18} />, label: 'Hợp đồng' },
  { key: '/tenant/support', icon: <Wrench size={18} />, label: 'Báo sự cố' },
  { key: '/tenant/profile', icon: <User size={18} />, label: 'Cá nhân' },
];

const TenantSidebar = ({ onClose }) => <SidebarNav subtitle="Phòng trọ của tôi" items={tenantNavItems} onNavigate={onClose} />;
export default TenantSidebar;
