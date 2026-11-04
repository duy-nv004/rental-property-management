import { useState, useEffect } from 'react';
import { Layout, Drawer } from 'antd';
import { Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';
import AppHeader from './partials/AppHeader';
import ChatWidget from '../components/common/ChatWidget';

const SIDER_WIDTH = 260;

const COMPACT_BELOW = 992; // tablet trở xuống: sidebar chuyển thành drawer để nhường chỗ nội dung

// Khung chung: sidebar cố định (desktop) / drawer (tablet, mobile) + header + nội dung
const AppShell = ({ Sidebar, headerProps, bottomNav }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isCompact, setIsCompact] = useState(window.innerWidth < COMPACT_BELOW);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsCompact(window.innerWidth < COMPACT_BELOW);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Bottom nav chỉ hiện trên mobile; tablet (và mobile không có bottom nav) dùng drawer
  const showBottomNav = isMobile && !!bottomNav;
  const useDrawer = isCompact && !showBottomNav;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isCompact && (
        <Layout.Sider width={SIDER_WIDTH} style={{ position: 'fixed', height: '100vh', left: 0, top: 0, zIndex: 100 }}>
          <Sidebar />
        </Layout.Sider>
      )}

      {useDrawer && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={Math.min(SIDER_WIDTH, window.innerWidth - 48)}
          closable={false}
          styles={{ body: { padding: 0 } }}
        >
          <Sidebar onClose={() => setDrawerOpen(false)} />
        </Drawer>
      )}

      {/* minWidth 0: không để bảng rộng kéo giãn cả khung (gây cuộn ngang trang) */}
      <Layout style={{ marginLeft: isCompact ? 0 : SIDER_WIDTH, minHeight: '100vh', minWidth: 0 }}>
        <AppHeader isMobile={isCompact} onMenuClick={useDrawer ? () => setDrawerOpen(true) : undefined} {...headerProps} />
        <Layout.Content
          style={{
            padding: isMobile ? 16 : 28,
            // chừa chỗ cho nút chat nổi (56px, cách đáy 84px khi có bottom nav, 24px khi không) để không che nội dung cuối trang
            paddingBottom: showBottomNav ? 156 : 96,
            width: '100%',
            minWidth: 0,
            maxWidth: 1440,
            margin: '0 auto',
          }}
        >
          <Outlet />
        </Layout.Content>
        {showBottomNav && bottomNav}
      </Layout>
      <ChatWidget />
    </Layout>
  );
};

AppShell.propTypes = {
  Sidebar: PropTypes.func.isRequired,
  headerProps: PropTypes.object,
  bottomNav: PropTypes.node,
};

export default AppShell;
