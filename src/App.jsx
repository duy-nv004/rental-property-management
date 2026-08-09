import { BrowserRouter } from 'react-router-dom';
import ThemeRoutes from './routes'; // Import bộ điều phối vừa tạo

function App() {
  return (
    <BrowserRouter>
      <ThemeRoutes />
    </BrowserRouter>
  );
}

export default App;