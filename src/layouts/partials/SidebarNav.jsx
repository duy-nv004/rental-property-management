import { Menu } from 'antd';
import { Building2, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

// Sidebar dùng chung cho Admin / Landlord / Tenant
const SidebarNav = ({ subtitle, items, onNavigate }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const go = (key) => {
    if (key === 'logout') {
      localStorage.clear();
      navigate('/login');
    } else {
      navigate(key);
    }
    onNavigate?.();
  };

  return (
    <nav className="app-sidebar" aria-label="Điều hướng chính">
      <div className="app-brand">
        <div className="app-brand-mark"><Building2 size={18} aria-hidden="true" /></div>
        <div>
          <div className="app-brand-name">Executive Lens</div>
          <div className="app-brand-sub">{subtitle}</div>
        </div>
      </div>
      <div className="app-sidebar-label">Menu</div>
      <div className="app-sidebar-scroll">
        <Menu className="app-menu" theme="dark" mode="inline" selectedKeys={[pathname]} items={items} onClick={({ key }) => go(key)} />
      </div>
      <Menu
        className="app-menu app-menu-footer"
        theme="dark"
        mode="inline"
        selectable={false}
        items={[{ key: 'logout', icon: <LogOut size={18} />, label: 'Đăng xuất', danger: true }]}
        onClick={({ key }) => go(key)}
      />
    </nav>
  );
};

export default SidebarNav;
