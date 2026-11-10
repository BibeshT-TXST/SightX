import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import TopNavBar from './components/layout/TopNavBar';
import HeroSection from './components/home/HeroSection';
import BentoGrid from './components/home/BentoGrid';
import Footer from './components/layout/Footer';
import RetinalScanPage from './pages/RetinalScanPage';
import AccountsPage from './pages/AccountsPage';
import LegalsPage from './pages/LegalsPage';

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
 * App component defines the application's routing structure.
 * V2 is an open trial: every route is public, and each browser gets its
 * own anonymous session (see lib/session.js).
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<RetinalScanPage />} />
        <Route path="/dashboard/accounts" element={<AccountsPage />} />
        <Route path="/dashboard/legals" element={<LegalsPage />} />
        {/* V1 sign-in links now go straight to the trial */}
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
