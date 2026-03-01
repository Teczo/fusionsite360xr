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
import TwinPage from "./pages/TwinPage";
import TimelinePage from "./pages/TimelinePage";
import HsePage from "./pages/HsePage";
import FilesPage from "./pages/FilesPage";
import AiPage from "./pages/AiPage";
import AiSettingsPage from "./pages/AiSettingsPage";
import { RoleProvider } from './components/hooks/useRole';
import AppLayout from './layouts/AppLayout';
import DevIntelligence from './pages/DevIntelligence';

const RequireAuth = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/signin" replace />;
};

export default function App() {
  return (
    <RoleProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/ar-select/:id" element={<ARModeSelect />} />
        <Route path="/ar/:id" element={<ARViewer />} />
        <Route path="/ar-plane/:id" element={<ARPlane />} />
        <Route path="/ar-image/:id" element={<ARImageTracker />} />

        {/* Auth-protected routes wrapped in unified responsive layout */}
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard/:panel?" element={<DashboardPage />} />
          <Route path="/digital-twin" element={<DigitalTwinDashboard />} />
          <Route path="/twin" element={<TwinPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/hse" element={<HsePage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/ai" element={<AiPage />} />
          <Route path="/ai-settings" element={<AiSettingsPage />} />
        </Route>

        {/* Optional aliases so you can share simple links */}
        <Route path="/billing" element={<Navigate to="/dashboard/billing" replace />} />
        <Route path="/profile" element={<Navigate to="/dashboard/profile" replace />} />
        <Route path="/studio" element={<RequireAuth><StudioPage /></RequireAuth>} />

        {/* Dev debug console — direct URL access only, not in navigation */}
        <Route path="/dev/intelligence" element={<DevIntelligence />} />

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
    </RoleProvider>
  );
}
