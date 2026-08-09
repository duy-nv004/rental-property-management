import { Menu } from 'antd';
import { 
  LayoutDashboard, FileText, FileSignature, 
  Wrench, User, LogOut, Headset 
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const TenantSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/tenant/dashboard', icon: <LayoutDashboard size={18} />, label: 'Trang chủ' },
    { key: '/tenant/invoices', icon: <FileText size={18} />, label: 'Hóa đơn' },
    { key: '/tenant/contract', icon: <FileSignature size={18} />, label: 'Hợp đồng' },
    { key: '/tenant/support', icon: <Wrench size={18} />, label: 'Báo sự cố' },
    { key: '/tenant/profile', icon: <User size={18} />, label: 'Cá nhân' },
  ];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8f9ff', padding: '16px 0', borderRight: '1px solid #eef2f6' }}>
      <div style={{ padding: '0 24px 24px', color: '#0f172a' }}>
        <div style={{ fontWeight: 'bold', fontSize: '18px', letterSpacing: '0.5px' }}>EXECUTIVE LENS</div>
        <div style={{ fontSize: '10px', opacity: 0.6, letterSpacing: '1px', textTransform: 'uppercase' }}>Tenant Space</div>
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

      <div style={{ padding: '0 16px 16px' }}>
        <Menu 
          mode="inline" 
          style={{ background: 'transparent', border: 'none' }} 
          items={[
            { key: 'logout', icon: <LogOut size={18} />, label: 'Đăng xuất' },
          ]} 
          onClick={({ key }) => {
            if (key === 'logout') {
              localStorage.clear();
              navigate('/login');
            }
          }}
        />
      </div>
    </div>
  );
};

export default TenantSidebar;
