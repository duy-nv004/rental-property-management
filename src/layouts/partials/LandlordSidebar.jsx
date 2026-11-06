import { LayoutDashboard, Building, Users, FileSignature, Zap, Wallet, Headset, Package, Receipt } from 'lucide-react';
import SidebarNav from './SidebarNav';

const items = [
  { key: '/landlord/dashboard', icon: <LayoutDashboard size={18} />, label: 'Tổng quan' },
  { key: '/landlord/buildings', icon: <Building size={18} />, label: 'Tòa nhà' },
  { key: '/landlord/tenants', icon: <Users size={18} />, label: 'Khách thuê' },
  { key: '/landlord/contracts', icon: <FileSignature size={18} />, label: 'Hợp đồng' },
  { key: '/landlord/utilities', icon: <Zap size={18} />, label: 'Chốt điện nước' },
  { key: '/landlord/invoices', icon: <Receipt size={18} />, label: 'Hóa đơn' },
  { key: '/landlord/support', icon: <Headset size={18} />, label: 'Báo cáo sự cố' },
  { key: '/landlord/financials', icon: <Wallet size={18} />, label: 'Doanh thu' },
  { key: '/landlord/plans', icon: <Package size={18} />, label: 'Gói dịch vụ' },
];

const LandlordSidebar = ({ onClose }) => <SidebarNav subtitle="Quản lý phòng trọ" items={items} onNavigate={onClose} />;
export default LandlordSidebar;
