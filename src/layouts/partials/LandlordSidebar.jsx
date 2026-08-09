import { Menu } from 'antd';
import { 
  LayoutDashboard, Building, Users, Home, 
  FileSignature, Landmark, Headset, LogOut, User, Package 
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const LandlordSidebar = ({ onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/landlord/dashboard', icon: <LayoutDashboard size={18} />, label: 'Tổng quan' },
    { key: '/landlord/buildings', icon: <Building size={18} />, label: 'Tòa nhà' },
    { key: '/landlord/rooms', icon: <Home size={18} />, label: 'Phòng trọ' },
    { key: '/landlord/tenants', icon: <Users size={18} />, label: 'Khách thuê' },
    { key: '/landlord/contracts', icon: <FileSignature size={18} />, label: 'Hợp đồng' },
    { key: '/landlord/utilities', icon: <Landmark size={18} />, label: 'Chốt điện nước' },
    { key: '/landlord/support', icon: <Headset size={18} />, label: 'Báo cáo sự cố' },
    { key: '/landlord/financials', icon: <Landmark size={18} />, label: 'Doanh thu' },
    { key: '/landlord/plans', icon: <Package size={18} />, label: 'Gói dịch vụ' },
  ];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8f9ff', padding: '16px 0' }}>
      <div style={{ padding: '0 24px 24px', color: '#1a3353' }}>
        <div style={{ fontWeight: 'bold', fontSize: '18px' }}>EXECUTIVE LENS</div>
        <div style={{ fontSize: '10px', opacity: 0.6 }}>LANDLORD MANAGEMENT</div>
      </div>

      <div style={{ flex: 1 }}>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => {
            navigate(key);
            if (onClose) onClose();
          }}
          style={{ background: 'transparent', border: 'none' }}
        />
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <Menu 
          mode="inline" 
          style={{ background: 'transparent', border: 'none' }} 
          items={[
            // { key: '/landlord/profile', icon: <User size={18} />, label: 'Hồ sơ cá nhân' },
            { key: 'logout', icon: <LogOut size={18} />, label: 'Đăng xuất' },
          ]} 
          onClick={({ key }) => {
            if (key === 'logout') {
              localStorage.clear();
              navigate('/login');
            } else {
              navigate(key);
            }
            if (onClose) onClose();
          }}
        />
      </div>
    </div>
  );
};

export default LandlordSidebar;