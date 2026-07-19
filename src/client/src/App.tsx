import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BoardPage from './pages/BoardPage';
import OnboardingPage from './pages/OnboardingPage';
import AssistantHomePage from './pages/AssistantHomePage';
import InboxPage from './pages/InboxPage';
import RulesPage from './pages/RulesPage';
import MemoryPage from './pages/MemoryPage';
import SettingsPage from './pages/SettingsPage';
import OnboardingGate from './components/OnboardingGate';
import AppLayout from './components/AppLayout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GatedPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <OnboardingGate>
        <AppLayout>{children}</AppLayout>
      </OnboardingGate>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<GatedPage><BoardPage /></GatedPage>} />
      <Route path="/assistant" element={<GatedPage><AssistantHomePage /></GatedPage>} />
      <Route path="/inbox" element={<GatedPage><InboxPage /></GatedPage>} />
      <Route path="/rules" element={<GatedPage><RulesPage /></GatedPage>} />
      <Route path="/memory" element={<GatedPage><MemoryPage /></GatedPage>} />
      <Route path="/settings" element={<GatedPage><SettingsPage /></GatedPage>} />
    </Routes>
  );
}
