import AppShell from './AppShell';
import LandlordSidebar from './partials/LandlordSidebar';

const LandlordLayout = () => (
  <AppShell Sidebar={LandlordSidebar} headerProps={{ roleLabel: 'Chủ nhà', profilePath: '/landlord/profile' }} />
);

export default LandlordLayout;
