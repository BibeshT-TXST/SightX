import { Box } from '@mui/material';
import TopNavBar from './components/layout/TopNavBar';
import HeroSection from './components/home/HeroSection';
import BentoGrid from './components/home/BentoGrid';

import Footer from './components/layout/Footer';

function App() {
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

export default App;
