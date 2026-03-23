import { useState } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import LoginForm from '../components/auth/LoginForm';
import NeuralNetworkBg from '../components/auth/NeuralNetworkBg';
import logo from '../assets/logo.png';

export default function LoginPage() {
  const [darkMode, setDarkMode] = useState(true);

  // ── Colors based on mode ──
  const bg = darkMode ? '#0a0e16' : undefined; // undefined → uses theme default
  const blurPrimary = darkMode ? '#3a7ff0' : undefined;
  const blurTertiary = darkMode ? '#00bfa5' : undefined;
  const blurOpacity = darkMode ? 0.12 : 0.05;
  const logoOpacity = darkMode ? 0.15 : 0.24;

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        px: 2,
        bgcolor: bg,
        transition: 'background-color 0.5s ease',
      }}
    >
      {/* ── Dark/Light Mode Toggle ── */}
      <Tooltip title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
        <IconButton
          onClick={() => setDarkMode(!darkMode)}
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 100,
            color: darkMode ? '#aec6ff' : '#414755',
            bgcolor: darkMode ? 'rgba(174,198,255,0.08)' : 'rgba(0,87,192,0.06)',
            '&:hover': {
              bgcolor: darkMode ? 'rgba(174,198,255,0.15)' : 'rgba(0,87,192,0.12)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Tooltip>

      {/* ── Background Blurs ── */}
      <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', transition: 'opacity 0.5s ease' }}>
        <Box
          sx={{
            position: 'absolute',
            top: '-10%',
            right: '-5%',
            width: '40%',
            height: '40%',
            bgcolor: blurPrimary || 'primary.main',
            opacity: blurOpacity,
            filter: 'blur(120px)',
            borderRadius: '50%',
            transition: 'all 0.5s ease',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '-10%',
            left: '-5%',
            width: '40%',
            height: '40%',
            bgcolor: blurTertiary || 'tertiary.main',
            opacity: blurOpacity,
            filter: 'blur(120px)',
            borderRadius: '50%',
            transition: 'all 0.5s ease',
          }}
        />
      </Box>

      {/* ── Neural Network Particle Animation ── */}
      <NeuralNetworkBg darkMode={darkMode} />

      {/* ── Spinning Logo Background ── */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <Box
          component="img"
          src={logo}
          alt=""
          sx={{
            width: { xs: 700, md: 1055 },
            height: { xs: 700, md: 1055 },
            opacity: logoOpacity,
            filter: darkMode ? 'brightness(1.5) saturate(0.6)' : 'none',
            maskImage: 'radial-gradient(ellipse 61% 61% at center, black 45%, transparent 85%)',
            WebkitMaskImage: 'radial-gradient(ellipse 61% 61% at center, black 45%, transparent 85%)',
            '@keyframes spin-slow': {
              from: { transform: 'rotate(0deg)' },
              to: { transform: 'rotate(360deg)' },
            },
            animation: 'spin-slow 30s linear infinite',
            transition: 'opacity 0.5s ease, filter 0.5s ease',
          }}
        />
      </Box>

      {/* ── Login Form ── */}
      <Box sx={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 440 }}>
        <LoginForm darkMode={darkMode} />
      </Box>
    </Box>
  );
}
