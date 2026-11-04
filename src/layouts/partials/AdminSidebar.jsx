import { LayoutDashboard, Users, Package, FileText, MessageSquare } from 'lucide-react';
import SidebarNav from './SidebarNav';

const items = [
  { key: '/admin/dashboard', icon: <LayoutDashboard size={18} />, label: 'Tổng quan' },
  { key: '/admin/landlords', icon: <Users size={18} />, label: 'Quản lý Chủ nhà' },
  { key: '/admin/packages', icon: <Package size={18} />, label: 'Cấu hình Gói cước' },
  { key: '/admin/logs', icon: <FileText size={18} />, label: 'Nhật ký hoạt động' },
  { key: '/admin/tickets', icon: <MessageSquare size={18} />, label: 'Quản lý Ticket' },
];

const AdminSidebar = ({ onClose }) => <SidebarNav subtitle="Quản trị hệ thống" items={items} onNavigate={onClose} />;
export default AdminSidebar;
