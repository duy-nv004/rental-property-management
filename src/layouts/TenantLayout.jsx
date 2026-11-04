import { useNavigate, useLocation } from 'react-router-dom';
import AppShell from './AppShell';
import TenantSidebar, { tenantNavItems } from './partials/TenantSidebar';

// Thanh điều hướng dưới cho mobile
const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <nav className="bottom-nav" aria-label="Điều hướng">
      {tenantNavItems.map((item) => {
        const active = pathname === item.key;
        return (
          <button
            key={item.key}
            type="button"
            className={`bottom-nav-item${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => navigate(item.key)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

const TenantLayout = () => (
  <AppShell
    Sidebar={TenantSidebar}
    headerProps={{ roleLabel: 'Người thuê', profilePath: '/tenant/profile' }}
    bottomNav={<BottomNav />}
  />
);

export default TenantLayout;
