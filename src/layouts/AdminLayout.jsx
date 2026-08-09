import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './partials/AdminSidebar';
import AdminHeader from './partials/AdminHeader';

const { Sider, Content } = Layout;

const AdminLayout = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={260} theme="light" style={{ position: 'fixed', height: '100vh', left: 0 }}>
        <AdminSidebar />
      </Sider>
      <Layout style={{ marginLeft: 260, background: '#fff' }}>
        <AdminHeader />
        <Content style={{ padding: '32px', background: '#fff' }}>
          <Outlet /> {/* Nơi nội dung của Page sẽ hiện ra */}
        </Content>
      </Layout>
    </Layout>
  );
};
export default AdminLayout;