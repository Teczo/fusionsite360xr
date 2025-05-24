import { Routes, Route, Navigate } from 'react-router-dom';
import SignUpPage from './pages/SignUpPage';
import SignInPage from './pages/SignInPage';
import DashboardPage from './pages/DashboardPage';
import StudioPage from './pages/StudioPage';
import ARViewer from './pages/ARViewer';

// Inline RequireAuth component
const RequireAuth = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/signin" />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/ar/:id" element={<ARViewer />} />
      <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
      <Route path="/studio" element={<RequireAuth><StudioPage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/signin" />} />
    </Routes>
  );
}
