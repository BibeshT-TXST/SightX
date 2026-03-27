import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import TopNavBar from './components/layout/TopNavBar';
import HeroSection from './components/home/HeroSection';
import BentoGrid from './components/home/BentoGrid';
import Footer from './components/layout/Footer';
import LoginPage from './pages/LoginPage';
import RetinalScanPage from './pages/RetinalScanPage';
import AccountsPage from './pages/AccountsPage';
import LegalsPage from './pages/LegalsPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import AdminCreateUserPage from './pages/AdminCreateUserPage';

/**
 * LandingPage component serves as the public-facing entry point of the application.
 * Composes the TopNavBar, HeroSection, BentoGrid, and Footer.
 */
function LandingPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNavBar />
      <Box component="main" sx={{ pt: 8, flexGrow: 1 }}>
        <HeroSection />
        <BentoGrid />
      </Box>
      <Footer />
    </Box>
  );
}

/**
 * App component defines the application's routing structure and global providers.
 * Includes both public routes and protected clinical routes.
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/create-user" element={<AdminCreateUserPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<RetinalScanPage />} />
            <Route path="/dashboard/accounts" element={<AccountsPage />} />
            <Route path="/dashboard/legals" element={<LegalsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
