import { useState, useEffect } from 'react';
import { Layout, Drawer } from 'antd';
import { Outlet } from 'react-router-dom';
import LandlordSidebar from './partials/LandlordSidebar';
import LandlordHeader from './partials/LandlordHeader';

const LandlordLayout = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {!isMobile && (
        <Layout.Sider width={260} theme="light" style={{ position: 'fixed', height: '100vh', left: 0, zIndex: 100 }}>
          <LandlordSidebar />
        </Layout.Sider>
      )}

      {isMobile && (
        <Drawer
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          styles={{ body: { padding: 0 } }}
          width={260}
          closable={false}
        >
          <LandlordSidebar onClose={() => setDrawerVisible(false)} />
        </Drawer>
      )}

      <Layout style={{ marginLeft: isMobile ? 0 : 260, background: '#f8f9fa', minHeight: '100vh' }}>
        <LandlordHeader onMenuClick={() => setDrawerVisible(true)} />
        <Layout.Content style={{ padding: isMobile ? '16px' : '24px' }}>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
};

export default LandlordLayout;