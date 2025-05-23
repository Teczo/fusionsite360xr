import { useState, useRef } from 'react';
import TopBar from './components/TopBar';
import PropertyPanel from './components/PropertyPanel';
import SceneCanvasPanel from './components/SceneCanvasPanel';
import LayersPanel from './components/LayersPanel';
import LibraryModal from './components/LibraryModal';
import SceneCanvasR3F from './components/SceneCanvasR3F';
import { Routes, Route, Navigate } from 'react-router-dom';
import SignUpPage from './pages/SignUpPage';
import SignInPage from './pages/SignInPage';
import DashboardPage from './pages/DashboardPage';
import StudioPage from './pages/StudioPage';
import { useLocation } from 'react-router-dom';
import ARViewer from './pages/ARViewer';

function App() {
  return (
    <Routes>
      <Route path="/ar/:id" element={<ARViewer />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/studio" element={<StudioPage />} />
      <Route path="*" element={<Navigate to="/signin" />} />
    </Routes>
  );
}

export default App;
