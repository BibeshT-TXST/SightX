import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import TopNavBar from './components/layout/TopNavBar';
import HeroSection from './components/home/HeroSection';
import BentoGrid from './components/home/BentoGrid';
import Footer from './components/layout/Footer';
import LoginPage from './pages/LoginPage';

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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
