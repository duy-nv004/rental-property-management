import { Menu } from 'antd';
import { LayoutDashboard, Building2, Users, Package, BarChart3, Settings, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/admin/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { key: '/admin/landlords', icon: <Users size={18} />, label: 'Landlords' },
    { key: '/admin/packages', icon: <Package size={18} />, label: 'Cấu hình Gói cước' },
  ];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8f9ff' }}>
      <div style={{ padding: '24px', fontSize: '20px', fontWeight: 'bold', color: '#1a3353' }}>
        Executive Lens
        <div style={{ fontSize: '10px', color: '#8c8c8c', fontWeight: 'normal' }}>PROPERTY MANAGEMENT</div>
      </div>
      <div style={{ flex: 1 }}>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', border: 'none' }}
        />
      </div>
      <div style={{ paddingBottom: '24px' }}>
        <Menu 
          mode="inline" 
          style={{ background: 'transparent', border: 'none' }} 
          items={[
            { key: 'out', icon: <LogOut size={18} />, label: 'Logout' }
          ]} 
          onClick={({ key }) => {
            if (key === 'out') {
              localStorage.clear();
              navigate('/login');
            }
          }}
        />
      </div>
    </div>
  );
};
export default AdminSidebar;