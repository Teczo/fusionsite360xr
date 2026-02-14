import { Routes, Route, Navigate } from 'react-router-dom';
import SignUpPage from './pages/SignUpPage';
import SignInPage from './pages/SignInPage';
import DashboardPage from './pages/DashboardPage';
import StudioPage from './components/Studio/StudioPage';
import ARMarkerViewer from './pages/ARMarkerViewer';
import ProfilePage from './pages/ProfilePage'
import { Toaster } from 'react-hot-toast';
import ARViewer from './components/viewer/ARViewer';
import ARPlane from './pages/ARPlane';
import ARImageTracker from './pages/ARImageTracker';
import ARModeSelect from './components/viewer/ARModeSelect';
import DigitalTwinDashboard from "./pages/DigitalTwinDashboard";

const RequireAuth = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/signin" replace />;
};

export default function App() {
  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/ar-select/:id" element={<ARModeSelect />} />
        <Route path="/ar/:id" element={<ARViewer />} />
        <Route path="/ar-plane/:id" element={<ARPlane />} />
        <Route path="/ar-image/:id" element={<ARImageTracker />} />
        <Route path="/digital-twin" element={<DigitalTwinDashboard />} />
        {/* Auth-protected */}

        <Route path="/dashboard/:panel?" element={<RequireAuth><DashboardPage /></RequireAuth>} />
        {/* Optional aliases so you can share simple links */}
        <Route path="/billing" element={<Navigate to="/dashboard/billing" replace />} />
        <Route path="/profile" element={<Navigate to="/dashboard/profile" replace />} />
        <Route path="/studio" element={<RequireAuth><StudioPage /></RequireAuth>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>

      {/* Toaster must be outside <Routes> */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: '#18191e', color: 'white', borderRadius: '8px', fontSize: '14px' },
        }}
      />
    </>
  );
}
