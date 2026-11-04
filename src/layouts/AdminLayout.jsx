import AppShell from './AppShell';
import AdminSidebar from './partials/AdminSidebar';

const AdminLayout = () => (
  <AppShell Sidebar={AdminSidebar} headerProps={{ roleLabel: 'Quản trị viên', withNotifications: false, profilePath: '/admin/profile' }} />
);

export default AdminLayout;
