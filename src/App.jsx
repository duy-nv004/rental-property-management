import { BrowserRouter } from 'react-router-dom';
import ThemeRoutes from './routes';
import RealtimeNotificationListener from './components/common/RealtimeNotificationListener';
import PwaInstallPrompt from './components/common/PwaInstallPrompt';

function App() {
  return (
    <BrowserRouter>
      <RealtimeNotificationListener />
      <PwaInstallPrompt />
      <ThemeRoutes />
    </BrowserRouter>
  );
}

export default App;